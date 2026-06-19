export type RemoteAccountLike = {
  id?: number | string | null;
  account_id?: number | string | null;
  accountId?: number | string | null;
  name?: string | null;
  username?: string | null;
  priority?: number | string | null;
  rate_multiplier?: number | string | null;
  rateMultiplier?: number | string | null;
  group_id?: number | string | null;
  group_ids?: Array<number | string | null> | null;
  groups?: Array<{ id?: number | string | null } | null> | null;
  account_groups?: Array<{ group_id?: number | string | null; groupId?: number | string | null; group?: { id?: number | string | null } | null } | null> | null;
};

export function normalizeAccountId(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

export function getAccountId(account: unknown) {
  if (!account || typeof account !== "object") return null;
  const row = account as RemoteAccountLike;
  return normalizeAccountId(row.id) ?? normalizeAccountId(row.account_id) ?? normalizeAccountId(row.accountId);
}

export function getAccountName(account: unknown, fallbackId: number) {
  if (!account || typeof account !== "object") return `#${fallbackId}`;
  const row = account as RemoteAccountLike;
  const name = typeof row.name === "string" && row.name.trim()
    ? row.name.trim()
    : typeof row.username === "string" && row.username.trim()
      ? row.username.trim()
      : "";
  return name || `#${fallbackId}`;
}

function toFiniteNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function getAccountRate(account: unknown) {
  if (!account || typeof account !== "object") return null;
  const row = account as RemoteAccountLike;
  return toFiniteNumber(row.rate_multiplier) ?? toFiniteNumber(row.rateMultiplier);
}

export function getAccountPriority(account: unknown) {
  if (!account || typeof account !== "object") return null;
  const row = account as RemoteAccountLike;
  const numeric = toFiniteNumber(row.priority);
  return numeric === null ? null : Math.trunc(numeric);
}

export function getAccountGroupIds(account: unknown) {
  if (!account || typeof account !== "object") return [];
  const row = account as RemoteAccountLike;
  const ids: number[] = [];
  const pushId = (value: unknown) => {
    const id = normalizeAccountId(value);
    if (id) ids.push(id);
  };

  if (Array.isArray(row.group_ids)) {
    for (const id of row.group_ids) pushId(id);
  }

  if (Array.isArray(row.groups)) {
    for (const group of row.groups) pushId(group?.id);
  }

  if (Array.isArray(row.account_groups)) {
    for (const accountGroup of row.account_groups) {
      pushId(accountGroup?.group_id ?? accountGroup?.groupId ?? accountGroup?.group?.id);
    }
  }

  pushId(row.group_id);
  return Array.from(new Set(ids));
}
