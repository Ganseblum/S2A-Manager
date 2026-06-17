import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { writeSyncLog } from "@/server/sync-logs";
import { decrypt } from "@/server/crypto";
import { Sub2ApiAdminClient } from "@/server/clients/sub2api-admin";
import {
  defaultRateAnnouncementContentTemplate,
  defaultRateAnnouncementTitleTemplate,
  renderAnnouncementTemplate,
} from "@/server/announcement-rules";

const targetGroupIdsInput = z
  .array(z.number().int().positive())
  .max(500)
  .default([])
  .transform((ids) => Array.from(new Set(ids)).sort((a, b) => a - b));
const announcementStatusInput = z.enum(["draft", "active", "archived"]);
const announcementNotifyModeInput = z.enum(["silent", "popup"]);
const announcementDateInput = z.union([z.string().datetime(), z.literal(""), z.null()]).optional();
const announcementIdsInput = z.array(z.number().int().positive()).min(1).max(500)
  .transform((ids) => Array.from(new Set(ids)));

function toUnixSeconds(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return 0;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) throw new Error("无效的公告时间");
  return Math.floor(timestamp / 1000);
}

function buildAnnouncementPayload(data: {
  title?: string;
  content?: string;
  status?: "draft" | "active" | "archived";
  notify_mode?: "silent" | "popup";
  starts_at?: string | null;
  ends_at?: string | null;
}) {
  const payload: Record<string, unknown> = {};
  if (data.title !== undefined) payload.title = data.title;
  if (data.content !== undefined) payload.content = data.content;
  if (data.status !== undefined) payload.status = data.status;
  if (data.notify_mode !== undefined) payload.notify_mode = data.notify_mode;
  const startsAt = toUnixSeconds(data.starts_at);
  const endsAt = toUnixSeconds(data.ends_at);
  if (startsAt !== undefined) payload.starts_at = startsAt;
  if (endsAt !== undefined) payload.ends_at = endsAt;
  return payload;
}

async function applyAnnouncementBatch(input: {
  connectionId: number;
  ids: number[];
  action: "bulk_update_announcement" | "bulk_delete_announcement";
  run: (client: Sub2ApiAdminClient, id: number) => Promise<unknown>;
  detail?: Record<string, unknown>;
}) {
  const client = await getClient(input.connectionId);
  const results: Array<{ id: number; ok: boolean; error?: string }> = [];
  for (const id of input.ids) {
    try {
      await input.run(client, id);
      results.push({ id, ok: true });
      await safeLogSync(input.connectionId, input.action, `id:${id}`, { id, ...(input.detail ?? {}) }, "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ id, ok: false, error: message });
      await safeLogSync(input.connectionId, input.action, `id:${id}`, { id, ...(input.detail ?? {}) }, "failed", message);
    }
  }
  const success = results.filter((item) => item.ok).length;
  return { ok: success === results.length, total: results.length, success, failed: results.length - success, results };
}

async function getClient(connectionId: number) {
  const conn = await db.connection.findUniqueOrThrow({ where: { id: connectionId } });
  return new Sub2ApiAdminClient(conn.baseUrl, decrypt(conn.adminApiKey));
}

async function logSync(connectionId: number, action: string, target: string, detail: Record<string, unknown>, status: "success" | "failed", error?: string) {
  await writeSyncLog(db, { connectionId, action, target, detail, status, error });
}

async function safeLogSync(connectionId: number, action: string, target: string, detail: Record<string, unknown>, status: "success" | "failed", error?: string) {
  try {
    await logSync(connectionId, action, target, detail, status, error);
  } catch {
    // Logging must not hide the remote operation result.
  }
}

export const announcementsRouter = createTRPCRouter({
  rules: protectedProcedure
    .input(z.object({ connectionId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return db.announcementRule.findMany({
        where: { connectionId: input.connectionId },
        orderBy: [{ enabled: "desc" }, { id: "asc" }],
      });
    }),
  createRule: protectedProcedure
    .input(z.object({
      connectionId: z.number().int().positive(),
      name: z.string().trim().min(1).max(100),
      enabled: z.boolean().default(true),
      titleTemplate: z.string().trim().min(1).max(300).default(defaultRateAnnouncementTitleTemplate),
      contentTemplate: z.string().trim().min(1).max(5_000).default(defaultRateAnnouncementContentTemplate),
      targetGroupIds: targetGroupIdsInput,
      status: z.enum(["draft", "active", "archived"]).default("active"),
      notifyMode: z.enum(["silent", "popup"]).default("silent"),
    }))
    .mutation(async ({ input }) => {
      const { connectionId, ...data } = input;
      const rule = await db.announcementRule.create({
        data: {
          connectionId,
          name: data.name,
          enabled: data.enabled,
          titleTemplate: data.titleTemplate,
          contentTemplate: data.contentTemplate,
          targetGroupIds: data.targetGroupIds,
          status: data.status,
          notifyMode: data.notifyMode,
        },
      });
      await safeLogSync(connectionId, "create_announcement_rule", `rule:${rule.id}`, { ruleId: rule.id, name: rule.name, targetGroupIds: rule.targetGroupIds }, "success");
      return rule;
    }),
  updateRule: protectedProcedure
    .input(z.object({
      connectionId: z.number().int().positive(),
      id: z.number().int().positive(),
      name: z.string().trim().min(1).max(100),
      enabled: z.boolean(),
      titleTemplate: z.string().trim().min(1).max(300),
      contentTemplate: z.string().trim().min(1).max(5_000),
      targetGroupIds: targetGroupIdsInput,
      status: z.enum(["draft", "active", "archived"]),
      notifyMode: z.enum(["silent", "popup"]),
    }))
    .mutation(async ({ input }) => {
      const { connectionId, id, ...data } = input;
      await db.announcementRule.updateMany({
        where: { id, connectionId },
        data: {
          name: data.name,
          enabled: data.enabled,
          titleTemplate: data.titleTemplate,
          contentTemplate: data.contentTemplate,
          targetGroupIds: data.targetGroupIds,
          status: data.status,
          notifyMode: data.notifyMode,
        },
      });
      const rule = await db.announcementRule.findFirstOrThrow({ where: { id, connectionId } });
      await safeLogSync(connectionId, "update_announcement_rule", `rule:${rule.id}`, { ruleId: rule.id, name: rule.name, targetGroupIds: rule.targetGroupIds }, "success");
      return rule;
    }),
  deleteRule: protectedProcedure
    .input(z.object({ connectionId: z.number().int().positive(), id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await db.announcementRule.deleteMany({ where: { id: input.id, connectionId: input.connectionId } });
      await safeLogSync(input.connectionId, "delete_announcement_rule", `rule:${input.id}`, { ruleId: input.id }, "success");
      return { ok: true };
    }),
  previewRule: protectedProcedure
    .input(z.object({
      titleTemplate: z.string().min(1),
      contentTemplate: z.string().min(1),
    }))
    .query(({ input }) => {
      const context = {
        action: "preview",
        connectionId: 0,
        connectionName: "示例站点",
        groupId: 1,
        groupName: "Claude Pro",
        oldRate: 1,
        newRate: 1.1,
        sourceSiteId: 1,
        sourceSiteName: "BL 示例源站",
        sourceGroupId: "pro",
        sourceGroupName: "Pro 分组",
        sourceRate: 1.1,
        ruleMode: "average",
        ruleExpression: "avg + 0.1",
        changedAt: new Date(),
      };
      return {
        title: renderAnnouncementTemplate(input.titleTemplate, context),
        content: renderAnnouncementTemplate(input.contentTemplate, context),
      };
    }),
  list: protectedProcedure
    .input(z.object({ connectionId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const client = await getClient(input.connectionId);
      return client.listAnnouncements();
    }),
  create: protectedProcedure
    .input(z.object({
      connectionId: z.number().int().positive(),
      title: z.string().trim().min(1),
      content: z.string().trim().min(1),
      status: announcementStatusInput.default("active"),
      notify_mode: announcementNotifyModeInput.default("silent"),
      starts_at: announcementDateInput,
      ends_at: announcementDateInput,
    }))
    .mutation(async ({ input }) => {
      const { connectionId, ...data } = input;
      const client = await getClient(connectionId);
      const payload = buildAnnouncementPayload(data) as { title: string; content: string } & Record<string, unknown>;
      try {
        await client.createAnnouncement(payload);
        await safeLogSync(connectionId, "create_announcement", "", { title: data.title, status: data.status, startsAt: data.starts_at, endsAt: data.ends_at }, "success");
        return { ok: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await safeLogSync(connectionId, "create_announcement", "", { title: data.title, status: data.status, startsAt: data.starts_at, endsAt: data.ends_at }, "failed", message);
        throw error;
      }
    }),
  update: protectedProcedure
    .input(z.object({
      connectionId: z.number().int().positive(),
      id: z.number().int().positive(),
      title: z.string().trim().min(1).optional(),
      content: z.string().trim().min(1).optional(),
      status: announcementStatusInput.optional(),
      notify_mode: announcementNotifyModeInput.optional(),
      starts_at: announcementDateInput,
      ends_at: announcementDateInput,
    }))
    .mutation(async ({ input }) => {
      const { connectionId, id, ...data } = input;
      const client = await getClient(connectionId);
      const payload = buildAnnouncementPayload(data);
      try {
        await client.updateAnnouncement(id, payload);
        await safeLogSync(connectionId, "update_announcement", `id:${id}`, data as Record<string, unknown>, "success");
        return { ok: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await safeLogSync(connectionId, "update_announcement", `id:${id}`, data as Record<string, unknown>, "failed", message);
        throw error;
      }
    }),
  bulkUpdate: protectedProcedure
    .input(z.object({
      connectionId: z.number().int().positive(),
      ids: announcementIdsInput,
      data: z.object({
        status: announcementStatusInput.optional(),
        notify_mode: announcementNotifyModeInput.optional(),
        starts_at: announcementDateInput,
        ends_at: announcementDateInput,
      }).refine((data) => Object.keys(data).length > 0, "请提供要修改的字段"),
    }))
    .mutation(async ({ input }) => {
      const payload = buildAnnouncementPayload(input.data);
      if (Object.keys(payload).length === 0) throw new Error("请提供要修改的字段");
      return applyAnnouncementBatch({
        connectionId: input.connectionId,
        ids: input.ids,
        action: "bulk_update_announcement",
        detail: input.data as Record<string, unknown>,
        run: (client, id) => client.updateAnnouncement(id, payload),
      });
    }),
  delete: protectedProcedure
    .input(z.object({ connectionId: z.number().int().positive(), id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const client = await getClient(input.connectionId);
      try {
        await client.deleteAnnouncement(input.id);
        await safeLogSync(input.connectionId, "delete_announcement", `id:${input.id}`, {}, "success");
        return { ok: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await safeLogSync(input.connectionId, "delete_announcement", `id:${input.id}`, {}, "failed", message);
        throw error;
      }
    }),
  bulkDelete: protectedProcedure
    .input(z.object({
      connectionId: z.number().int().positive(),
      ids: announcementIdsInput,
    }))
    .mutation(async ({ input }) => {
      return applyAnnouncementBatch({
        connectionId: input.connectionId,
        ids: input.ids,
        action: "bulk_delete_announcement",
        run: (client, id) => client.deleteAnnouncement(id),
      });
    }),
});
