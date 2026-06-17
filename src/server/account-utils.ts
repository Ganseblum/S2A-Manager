export type RemoteAccountLike = {
  id?: number | string | null;
  account_id?: number | string | null;
  accountId?: number | string | null;
  name?: string | null;
  username?: string | null;
  rate_multiplier?: number | string | null;
  rateMultiplier?: number | string | null;
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
