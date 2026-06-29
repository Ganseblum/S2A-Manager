import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { writeSyncLog } from "@/server/sync-logs";
import { decrypt } from "@/server/crypto";
import { Sub2ApiAdminClient } from "@/server/clients/sub2api-admin";
import { publishRateChangeAnnouncements } from "@/server/announcement-rules";
import { normalizeRateMultiplier } from "@/server/rates";
import * as mock from "@/server/mock-data";

const rateMultiplierInput = z.number().finite().gt(0).max(100_000);
const groupNameInput = z.string().trim().min(1).max(100);

function getClient(connection: { baseUrl: string; adminApiKey: string }) {
  return new Sub2ApiAdminClient(connection.baseUrl, decrypt(connection.adminApiKey));
}

async function logSync(connectionId: number, action: string, target: string, detail: Record<string, unknown>, status: "success" | "failed", error?: string) {
  await writeSyncLog(db, { connectionId, action, target, detail, status, error });
}

async function safeLogSync(connectionId: number, action: string, target: string, detail: Record<string, unknown>, status: "success" | "failed", error?: string) {
  try {
    await logSync(connectionId, action, target, detail, status, error);
  } catch {
    // Do not mask the original remote-operation error with a local logging failure.
  }
}

async function writeGroupRateChangeLog(params: {
  connectionId: number;
  groupId: number;
  groupName: string;
  oldRate: number | null;
  newRate: number;
  action: string;
  sourceDetail?: string;
}) {
  try {
    await db.groupRateChangeLog.create({
      data: {
        connectionId: params.connectionId,
        groupId: params.groupId,
        groupName: params.groupName,
        oldRate: params.oldRate,
        newRate: params.newRate,
        action: params.action,
        sourceDetail: params.sourceDetail ?? null,
      },
    });
  } catch {
    // Logging must never hide the primary operation result.
  }
}

async function getConnection(id: number) {
  return db.connection.findUniqueOrThrow({ where: { id } });
}

export const groupsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ connectionId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      if (ctx.mockMode) return mock.groups.list;
      const conn = await getConnection(input.connectionId);
      return getClient(conn).listGroups();
    }),
  details: protectedProcedure
    .input(z.object({ connectionId: z.number().int().positive(), groupId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      if (ctx.mockMode) return mock.groups.details(input.groupId);
      const conn = await getConnection(input.connectionId);
      return getClient(conn).getGroup(input.groupId);
    }),
  create: protectedProcedure
    .input(z.object({ connectionId: z.number().int().positive(), name: groupNameInput, rateMultiplier: rateMultiplierInput }))
    .mutation(async ({ input }) => {
      const conn = await getConnection(input.connectionId);
      const rateMultiplier = normalizeRateMultiplier(input.rateMultiplier);
      const detail = { name: input.name, rateMultiplier };
      try {
        const group = await getClient(conn).createGroup({ name: input.name, rate_multiplier: rateMultiplier });
        await safeLogSync(input.connectionId, "create_group", `group:${group.id}`, { ...detail, groupId: group.id }, "success");
        return group;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await safeLogSync(input.connectionId, "create_group", "group:new", detail, "failed", message);
        throw error;
      }
    }),
  update: protectedProcedure
    .input(z.object({
      connectionId: z.number().int().positive(),
      groupId: z.number().int().positive(),
      name: groupNameInput,
      rateMultiplier: rateMultiplierInput,
    }))
    .mutation(async ({ input }) => {
      const conn = await getConnection(input.connectionId);
      const rateMultiplier = normalizeRateMultiplier(input.rateMultiplier);
      const detail = { groupId: input.groupId, name: input.name, rateMultiplier };
      try {
        const client = getClient(conn);
        const oldGroup = await client.getGroup(input.groupId);
        const group = await client.updateGroup(input.groupId, { name: input.name, rate_multiplier: rateMultiplier });
        await publishRateChangeAnnouncements({
          db,
          client,
          context: {
            action: "manual_group_update",
            connectionId: input.connectionId,
            connectionName: conn.name,
            groupId: input.groupId,
            groupName: group.name ?? input.name,
            oldRate: oldGroup.rate_multiplier ?? null,
            newRate: rateMultiplier,
            changedAt: new Date(),
          },
        });
        const oldRateVal = typeof oldGroup.rate_multiplier === "number" ? oldGroup.rate_multiplier : null;
        if (oldRateVal !== rateMultiplier) {
          await writeGroupRateChangeLog({
            connectionId: input.connectionId,
            groupId: input.groupId,
            groupName: group.name ?? input.name,
            oldRate: oldRateVal,
            newRate: rateMultiplier,
            action: "manual_update",
            sourceDetail: "手动编辑分组",
          });
        }
        await safeLogSync(input.connectionId, "update_group", `group:${input.groupId}`, detail, "success");
        return group;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await safeLogSync(input.connectionId, "update_group", `group:${input.groupId}`, detail, "failed", message);
        throw error;
      }
    }),
  deleteGroup: protectedProcedure
    .input(z.object({ connectionId: z.number().int().positive(), groupId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const conn = await getConnection(input.connectionId);
      const detail = { groupId: input.groupId };
      try {
        const result = await getClient(conn).deleteGroup(input.groupId);
        await Promise.all([
          db.blSourceBinding.deleteMany({ where: { connectionId: input.connectionId, targetType: "group", targetId: input.groupId } }),
          db.blGroupRateRule.deleteMany({ where: { connectionId: input.connectionId, groupId: input.groupId } }),
          db.upstreamMonitorRateExclusion.deleteMany({ where: { connectionId: input.connectionId, groupId: input.groupId } }),
        ]);
        await safeLogSync(input.connectionId, "delete_group", `group:${input.groupId}`, detail, "success");
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await safeLogSync(input.connectionId, "delete_group", `group:${input.groupId}`, detail, "failed", message);
        throw error;
      }
    }),
  updateRateMultiplier: protectedProcedure
    .input(z.object({ connectionId: z.number().int().positive(), groupId: z.number().int().positive(), rateMultiplier: rateMultiplierInput }))
    .mutation(async ({ input }) => {
      const conn = await getConnection(input.connectionId);
      const rateMultiplier = normalizeRateMultiplier(input.rateMultiplier);
      try {
        const client = getClient(conn);
        const oldGroup = await client.getGroup(input.groupId);
        const group = await client.updateGroupRateMultiplier(input.groupId, rateMultiplier);
        await publishRateChangeAnnouncements({
          db,
          client,
          context: {
            action: "manual_group_rate_update",
            connectionId: input.connectionId,
            connectionName: conn.name,
            groupId: input.groupId,
            groupName: group.name ?? oldGroup.name,
            oldRate: oldGroup.rate_multiplier ?? null,
            newRate: rateMultiplier,
            changedAt: new Date(),
          },
        });
        const oldRateVal = typeof oldGroup.rate_multiplier === "number" ? oldGroup.rate_multiplier : null;
        if (oldRateVal !== rateMultiplier) {
          await writeGroupRateChangeLog({
            connectionId: input.connectionId,
            groupId: input.groupId,
            groupName: group.name ?? oldGroup.name,
            oldRate: oldRateVal,
            newRate: rateMultiplier,
            action: "manual_rate_update",
            sourceDetail: "手动更新倍率",
          });
        }
        await safeLogSync(input.connectionId, "update_group_rate_multiplier", `group:${input.groupId}`, { groupId: input.groupId, rateMultiplier }, "success");
        return group;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await safeLogSync(input.connectionId, "update_group_rate_multiplier", `group:${input.groupId}`, { groupId: input.groupId, rateMultiplier }, "failed", message);
        throw error;
      }
    }),
  rateMultipliers: protectedProcedure
    .input(z.object({ connectionId: z.number().int().positive(), groupId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      if (ctx.mockMode) return mock.groups.rateMultipliers(input.groupId);
      const conn = await getConnection(input.connectionId);
      return getClient(conn).getRateMultipliers(input.groupId);
    }),
  setRateMultipliers: protectedProcedure
    .input(z.object({
      connectionId: z.number().int().positive(),
      groupId: z.number().int().positive(),
      entries: z.array(z.object({ user_id: z.number().int().positive(), rate_multiplier: rateMultiplierInput })).min(1),
    }))
    .mutation(async ({ input }) => {
      const conn = await getConnection(input.connectionId);
      const entries = input.entries.map((entry) => ({ ...entry, rate_multiplier: normalizeRateMultiplier(entry.rate_multiplier) }));
      try {
        await getClient(conn).setRateMultipliers(input.groupId, entries);
        await safeLogSync(input.connectionId, "set_user_rate_multipliers", `group:${input.groupId}`, { entries, groupId: input.groupId }, "success");
        return { ok: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await safeLogSync(input.connectionId, "set_user_rate_multipliers", `group:${input.groupId}`, { entries, groupId: input.groupId }, "failed", message);
        throw error;
      }
    }),
  clearRateMultipliers: protectedProcedure
    .input(z.object({ connectionId: z.number().int().positive(), groupId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const conn = await getConnection(input.connectionId);
      try {
        await getClient(conn).clearRateMultipliers(input.groupId);
        await safeLogSync(input.connectionId, "clear_user_rate_multipliers", `group:${input.groupId}`, { groupId: input.groupId }, "success");
        return { ok: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await safeLogSync(input.connectionId, "clear_user_rate_multipliers", `group:${input.groupId}`, { groupId: input.groupId }, "failed", message);
        throw error;
      }
    }),
  rateChangeLogs: protectedProcedure
    .input(z.object({
      connectionId: z.number().int().positive(),
      groupId: z.number().int().positive().optional(),
      limit: z.number().int().min(1).max(200).default(50),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.mockMode) {
        const logs = mock.groups.rateChangeLogs();
        return input.groupId ? logs.filter((l) => l.groupId === input.groupId).slice(0, input.limit) : logs.slice(0, input.limit);
      }
      const where: { connectionId: number; groupId?: number } = { connectionId: input.connectionId };
      if (input.groupId !== undefined) where.groupId = input.groupId;
      const logs = await db.groupRateChangeLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
      return logs;
    }),
});
