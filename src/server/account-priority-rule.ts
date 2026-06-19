import type { Sub2ApiGroup } from "@/server/clients/sub2api-admin";
import { Sub2ApiAdminClient } from "@/server/clients/sub2api-admin";
import { getAccountGroupIds, getAccountId, getAccountName, getAccountPriority, getAccountRate } from "@/server/account-utils";
import { getSetting, setSetting } from "@/server/settings";
import { ratesEqual } from "@/server/rates";
import { writeSyncLog } from "@/server/sync-logs";

export type AccountPriorityRuleConfig = {
  enabled: boolean;
  targetGroupIds: number[];
  updatedAt?: string | null;
};

export type AccountPriorityApplyResult = {
  ok: boolean;
  skipped: boolean;
  enabled: boolean;
  targetGroupIds: number[];
  matchedAccounts: number;
  updated: number;
  unchanged: number;
  skippedAccounts: number;
  failed: number;
  groups: Array<{ groupId: number; groupName: string; accountCount: number }>;
  updates: AccountPriorityUpdatePlan[];
  failures: Array<AccountPriorityUpdatePlan & { error: string }>;
  message: string;
};

type AccountPriorityUpdatePlan = {
  accountId: number;
  accountName: string;
  rateMultiplier: number;
  oldPriority: number | null;
  newPriority: number;
  matchedGroupIds: number[];
};

type CandidateAccount = {
  account: unknown;
  accountId: number;
  accountName: string;
  rateMultiplier: number | null;
  oldPriority: number | null;
  matchedGroupIds: number[];
};

const defaultRule: AccountPriorityRuleConfig = {
  enabled: false,
  targetGroupIds: [],
  updatedAt: null,
};

function settingKey(connectionId: number) {
  return `account_priority_rule:${connectionId}`;
}

function uniquePositiveIds(values: unknown[]) {
  return Array.from(new Set(values
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0)))
    .sort((left, right) => left - right);
}

function normalizeRule(value: unknown): AccountPriorityRuleConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) return defaultRule;
  const raw = value as Partial<AccountPriorityRuleConfig>;
  const updatedAt = typeof raw.updatedAt === "string" ? raw.updatedAt : null;
  return {
    enabled: raw.enabled === true,
    targetGroupIds: uniquePositiveIds(Array.isArray(raw.targetGroupIds) ? raw.targetGroupIds : []),
    updatedAt,
  };
}

export async function readAccountPriorityRule(connectionId: number) {
  const raw = await getSetting(settingKey(connectionId), "");
  if (!raw.trim()) return defaultRule;
  try {
    return normalizeRule(JSON.parse(raw) as unknown);
  } catch {
    return defaultRule;
  }
}

export async function saveAccountPriorityRule(connectionId: number, rule: Pick<AccountPriorityRuleConfig, "enabled" | "targetGroupIds">) {
  const normalized = normalizeRule({
    enabled: rule.enabled,
    targetGroupIds: rule.targetGroupIds,
    updatedAt: new Date().toISOString(),
  });
  if (normalized.enabled && normalized.targetGroupIds.length === 0) {
    throw new Error("启用调度优先级规则时必须至少选择一个 Sub2API 分组");
  }
  await setSetting(settingKey(connectionId), JSON.stringify(normalized));
  return normalized;
}

function groupLabel(group: Sub2ApiGroup | undefined, groupId: number) {
  return group?.name?.trim() || `#${groupId}`;
}

function buildCandidates(input: {
  accounts: unknown[];
  groups: Sub2ApiGroup[];
  targetGroupIds: number[];
}) {
  const targetGroupIdSet = new Set(input.targetGroupIds);
  const candidateById = new Map<number, CandidateAccount>();
  const skipped: CandidateAccount[] = [];

  for (const account of input.accounts) {
    const accountId = getAccountId(account);
    if (!accountId) continue;

    const matchedGroupIds = getAccountGroupIds(account).filter((groupId) => targetGroupIdSet.has(groupId));
    if (matchedGroupIds.length === 0) continue;

    const accountName = getAccountName(account, accountId);
    const candidate: CandidateAccount = {
      account,
      accountId,
      accountName,
      rateMultiplier: getAccountRate(account),
      oldPriority: getAccountPriority(account),
      matchedGroupIds,
    };

    if (candidate.rateMultiplier === null) {
      skipped.push(candidate);
      continue;
    }

    candidateById.set(accountId, candidate);
  }

  const groupCounts = new Map<number, number>();
  for (const candidate of candidateById.values()) {
    for (const groupId of candidate.matchedGroupIds) {
      groupCounts.set(groupId, (groupCounts.get(groupId) ?? 0) + 1);
    }
  }

  const groupsById = new Map(input.groups.map((group) => [group.id, group]));
  const groups = input.targetGroupIds.map((groupId) => ({
    groupId,
    groupName: groupLabel(groupsById.get(groupId), groupId),
    accountCount: groupCounts.get(groupId) ?? 0,
  }));

  return { candidates: Array.from(candidateById.values()), groups, skipped };
}

function planPriorityUpdates(candidates: CandidateAccount[]) {
  const sorted = [...candidates].sort((left, right) => {
    const leftRate = left.rateMultiplier ?? 0;
    const rightRate = right.rateMultiplier ?? 0;
    if (!ratesEqual(leftRate, rightRate)) return leftRate - rightRate;
    const nameDiff = left.accountName.localeCompare(right.accountName, "zh-CN");
    return nameDiff === 0 ? left.accountId - right.accountId : nameDiff;
  });

  const plans: AccountPriorityUpdatePlan[] = [];
  let priority = 0;
  let lastRate: number | null = null;

  for (const candidate of sorted) {
    const rateMultiplier = candidate.rateMultiplier;
    if (rateMultiplier === null) continue;
    if (lastRate === null || !ratesEqual(rateMultiplier, lastRate)) {
      priority += 1;
      lastRate = rateMultiplier;
    }
    plans.push({
      accountId: candidate.accountId,
      accountName: candidate.accountName,
      rateMultiplier,
      oldPriority: candidate.oldPriority,
      newPriority: priority,
      matchedGroupIds: candidate.matchedGroupIds,
    });
  }

  return plans;
}

async function logPriorityResult(input: {
  db: unknown;
  connectionId: number;
  action: string;
  result: AccountPriorityApplyResult;
}) {
  if (input.result.skipped) return;
  try {
    await writeSyncLog(input.db, {
      connectionId: input.connectionId,
      action: input.action,
      target: `connection:${input.connectionId}`,
      detail: {
        targetGroupIds: input.result.targetGroupIds,
        matchedAccounts: input.result.matchedAccounts,
        updated: input.result.updated,
        unchanged: input.result.unchanged,
        skippedAccounts: input.result.skippedAccounts,
        failed: input.result.failed,
        groups: input.result.groups,
        updates: input.result.updates.slice(0, 120),
        failures: input.result.failures.slice(0, 40),
      },
      status: input.result.ok ? "success" : "failed",
      error: input.result.ok ? undefined : `${input.result.failed} 个账号优先级更新失败`,
    });
  } catch {
    // Logging must not hide the remote operation result.
  }
}

export async function applyAccountPriorityRule(input: {
  db: unknown;
  connectionId: number;
  s2Client: Sub2ApiAdminClient;
  rule?: AccountPriorityRuleConfig;
  accounts?: unknown[];
  groups?: Sub2ApiGroup[];
  action?: string;
}): Promise<AccountPriorityApplyResult> {
  const rule = input.rule ?? await readAccountPriorityRule(input.connectionId);
  const targetGroupIds = uniquePositiveIds(rule.targetGroupIds);
  const action = input.action ?? "apply_account_priority_rule";

  if (!rule.enabled) {
    return {
      ok: true,
      skipped: true,
      enabled: false,
      targetGroupIds,
      matchedAccounts: 0,
      updated: 0,
      unchanged: 0,
      skippedAccounts: 0,
      failed: 0,
      groups: [],
      updates: [],
      failures: [],
      message: "priority rule disabled",
    };
  }

  if (targetGroupIds.length === 0) {
    throw new Error("调度优先级规则已启用，但没有选择 Sub2API 分组");
  }

  const [accounts, groups] = await Promise.all([
    input.accounts ? Promise.resolve(input.accounts) : input.s2Client.listAccounts(),
    input.groups ? Promise.resolve(input.groups) : input.s2Client.listGroups().catch(() => []),
  ]);
  const { candidates, groups: groupSummaries, skipped } = buildCandidates({ accounts, groups, targetGroupIds });
  const plans = planPriorityUpdates(candidates);
  const updates = plans.filter((plan) => plan.oldPriority !== plan.newPriority);
  const unchanged = plans.length - updates.length;
  const applied: AccountPriorityUpdatePlan[] = [];
  const failures: Array<AccountPriorityUpdatePlan & { error: string }> = [];

  for (const update of updates) {
    try {
      await input.s2Client.updateAccount(update.accountId, { priority: update.newPriority });
      applied.push(update);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ ...update, error: message });
    }
  }

  const result: AccountPriorityApplyResult = {
    ok: failures.length === 0,
    skipped: false,
    enabled: true,
    targetGroupIds,
    matchedAccounts: candidates.length,
    updated: applied.length,
    unchanged,
    skippedAccounts: skipped.length,
    failed: failures.length,
    groups: groupSummaries,
    updates: applied,
    failures,
    message: failures.length === 0 ? "priority rule applied" : "priority rule partially failed",
  };

  await logPriorityResult({
    db: input.db,
    connectionId: input.connectionId,
    action,
    result,
  });

  return result;
}
