/**
 * 全量 Mock 数据模块。
 * 字段名与真实 Sub2API 返回值保持一致 (snake_case)，
 * 确保前端组件类型校验通过。
 */

// ================================================================
// Helpers
// ================================================================
let _mockId = 9000;
function uid() { return ++_mockId; }

function ago(minutes: number) { return new Date(Date.now() - minutes * 60_000); }
function agoISO(minutes: number) { return ago(minutes).toISOString(); }

const now = new Date();
const nowISO = now.toISOString();

// ================================================================
// Auth
// ================================================================
export const auth = {
  session: { authed: true, email: "admin@mock.local", initialized: true },
  listUsers: [
    { id: 1, email: "admin@mock.local", createdAt: new Date("2025-01-01") },
  ],
};

// ================================================================
// Connections - 返回 maskConnection 后的格式，必须有 id/name
// ================================================================
export const connections = {
  list: [{
    id: 9999, name: "Mock 站点 (本地演示)", baseUrl: "https://mock.example.com",
    adminApiKey: "••••••", enabled: true, syncMode: "manual",
    lastCheckAt: ago(5), createdAt: ago(1440 * 30), updatedAt: ago(5),
  }],
};

// ================================================================
// Groups (分组倍率) - 字段名匹配 Sub2ApiAdminClient 返回
// ================================================================
function groupObj(id: number, name: string, rate: number) {
  return {
    id, name,
    description: `${name} 模型分组`,
    created_at: agoISO(1440 * 7),
    updated_at: agoISO(60),
    model_count: 3 + (id % 3),
    user_count: 100 + id * 7,
    total_tokens: 5000000 + id * 200000,
    is_default: id === 10,
    rate_multiplier: rate,
  };
}
const groupDefs = [
  { id: 10, name: "GPT-4o", rate: 1.2 },
  { id: 20, name: "Claude-3.5-Sonnet", rate: 0.95 },
  { id: 30, name: "Gemini-2.0-Pro", rate: 1.0 },
  { id: 40, name: "DeepSeek-V3", rate: 0.58 },
  { id: 50, name: "Qwen-Plus", rate: 0.65 },
  { id: 60, name: "Llama-4-Maverick", rate: 0.7 },
  { id: 70, name: "Mixtral-8x22B", rate: 0.75 },
  { id: 80, name: "Command-R+", rate: 0.8 },
];

export const groups = {
  list: groupDefs.map((g) => groupObj(g.id, g.name, g.rate)),
  details: (groupId: number) => {
    const g = groupDefs.find((x) => x.id === groupId) ?? groupDefs[0];
    return groupObj(g.id, g.name, g.rate);
  },
  rateMultipliers: (_groupId: number) => [
    { user_id: uid(), email: "user1@test.com", rate_multiplier: 0.96, name: "VIP用户", updated_at: agoISO(120) },
    { user_id: uid(), email: "user2@test.com", rate_multiplier: 1.8, name: "普通用户", updated_at: agoISO(180) },
    { user_id: uid(), email: "user3@test.com", rate_multiplier: 0.72, name: "合作伙伴", updated_at: agoISO(240) },
  ],
  rateChangeLogs: () => [
    { id: uid(), connectionId: 9999, groupId: 10, groupName: "GPT-4o", oldRate: 1.0, newRate: 1.2, action: "manual_update", sourceDetail: "手动编辑分组", createdAt: ago(180) },
    { id: uid(), connectionId: 9999, groupId: 20, groupName: "Claude-3.5-Sonnet", oldRate: 1.0, newRate: 0.95, action: "manual_rate_update", sourceDetail: "手动更新倍率", createdAt: ago(150) },
    { id: uid(), connectionId: 9999, groupId: 30, groupName: "Gemini-2.0-Pro", oldRate: 1.05, newRate: 1.0, action: "apply_rule", sourceDetail: "采集源 A站点-主站 / Gemini-Pro (#group_c)", createdAt: ago(120) },
    { id: uid(), connectionId: 9999, groupId: 40, groupName: "DeepSeek-V3", oldRate: 0.5, newRate: 0.58, action: "apply_rule", sourceDetail: "采集源 C站点-测试 / DeepSeek-V3 (#group_d)", createdAt: ago(90) },
    { id: uid(), connectionId: 9999, groupId: 50, groupName: "Qwen-Plus", oldRate: 0.6, newRate: 0.65, action: "manual_update", sourceDetail: "手动编辑分组", createdAt: ago(60) },
    { id: uid(), connectionId: 9999, groupId: 10, groupName: "GPT-4o", oldRate: 1.2, newRate: 1.26, action: "apply_rule", sourceDetail: "采集源 B站点-备站 / GPT-4o (#group_a)", createdAt: ago(30) },
    { id: uid(), connectionId: 9999, groupId: 40, groupName: "DeepSeek-V3", oldRate: 0.58, newRate: 0.59, action: "auto_sync", sourceDetail: "采集源 C站点-测试 / DeepSeek-V3 (#group_d)", createdAt: ago(10) },
  ],
};

// ================================================================
// Accounts - 字段名匹配 Sub2ApiAdminClient.listAccounts 返回
// ================================================================
const accountDefs = [
  { id: 1, name: "VIP-账号-A", balance: 1250.5, models: 8, status: "active" as const },
  { id: 2, name: "企业-账号-B", balance: 3400.0, models: 12, status: "active" as const },
  { id: 3, name: "开发-账号-C", balance: 85.2, models: 5, status: "active" as const },
  { id: 4, name: "测试-账号-D", balance: 0.5, models: 3, status: "inactive" as const },
  { id: 5, name: "备用-账号-E", balance: 520.0, models: 6, status: "active" as const },
  { id: 6, name: "合作-账号-F", balance: 2100.0, models: 10, status: "active" as const },
  { id: 7, name: "临时-账号-G", balance: 0.01, models: 2, status: "disabled" as const },
];

function accountObj(a: typeof accountDefs[number]) {
  return {
    id: a.id,
    name: a.name,
    email: `${a.name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}@mock.local`,
    description: `${a.name} 说明`,
    created_at: agoISO(1440 * 14),
    updated_at: agoISO(30),
    status: a.status,
    platform: a.id <= 3 ? "openai" : "anthropic",
    type: "apikey",
    channel_type: "openai",
    model_count: a.models,
    schedulable: a.status === "active",
    group_ids: a.id <= 3 ? [10, 20, 30] : [40, 50],
    priority: a.id,
    consecutive_errors: a.id === 7 ? 5 : 0,
    last_error: a.id === 7 ? "余额不足" : null,
    last_error_at: a.id === 7 ? agoISO(10) : null,
  };
}

export const accounts = {
  list: accountDefs.map(accountObj),
  balances: accountDefs.map((a) => ({
    accountId: a.id,
    accountName: a.name,
    balance: a.balance,
    threshold: a.id === 3 ? 100 : a.id === 7 ? 50 : null,
    updatedAt: agoISO(5),
  })),
};

// ================================================================
// BL (倍率采集) - 字段名匹配 BlPublicClient 返回 (snake_case)
// ================================================================
function blRate(group_id: string, name: string, platform: string, rate: number, site_id: number, site_name: string) {
  return {
    site_id, site_name, group_id, name, platform,
    recharge_ratio: 1,
    rate_multiplier: rate, actual_rate_multiplier: rate,
    user_rate: null, actual_user_rate: null,
    effective_rate: rate, actual_effective_rate: rate,
    collected_at: agoISO(15),
  };
}

function blChange(entityType: string, entityKey: string, field: string, oldValue: string | null, newValue: string | null, changeType: string, site_id: number, site_name: string, group_id?: string, group_name?: string, platform?: string, actualOld?: number | null, actualNew?: number | null) {
  return {
    id: uid(), created_at: agoISO(15),
    site_id, site_name, site_type: "",
    recharge_ratio: 1,
    group_id: group_id ?? "", group_name: group_name ?? null,
    platform: platform ?? null,
    old_value: oldValue, new_value: newValue,
    actual_old_value: actualOld ?? null, actual_new_value: actualNew ?? null,
    change_type: changeType, entity_type: entityType, entity_key: entityKey, field,
    model_name: entityType === "model" ? entityKey : null,
    model_id: entityType === "model" ? entityKey : null,
    original_rate: null, original_user_rate: null, subscription_type: null,
    is_exclusive: false,
  };
}

export const bl = {
  collectionSites: [
    { id: 1, connectionId: 9999, name: "A站点-主站", baseUrl: "https://a.mock.local", siteType: "sub2api", email: "a@mock.local", passwordEnc: "", authMode: "password", enabled: true, intervalMin: 60, rechargeRatio: 1, accessToken: null, refreshToken: null, tokenExpire: null, newApiUserId: null, lastRunAt: agoISO(15), lastStatus: "success", lastError: null, consecutiveFailures: 0, lastSuccessAt: agoISO(15), createdAt: ago(1440 * 7), updatedAt: ago(15) },
    { id: 2, connectionId: 9999, name: "B站点-备站", baseUrl: "https://b.mock.local", siteType: "sub2api", email: "b@mock.local", passwordEnc: "", authMode: "password", enabled: true, intervalMin: 60, rechargeRatio: 1, accessToken: null, refreshToken: null, tokenExpire: null, newApiUserId: null, lastRunAt: agoISO(15), lastStatus: "success", lastError: null, consecutiveFailures: 0, lastSuccessAt: agoISO(15), createdAt: ago(1440 * 7), updatedAt: ago(15) },
    { id: 3, connectionId: 9999, name: "C站点-测试", baseUrl: "https://c.mock.local", siteType: "new_api", email: "c@mock.local", passwordEnc: "", authMode: "password", enabled: true, intervalMin: 120, rechargeRatio: 1, accessToken: null, refreshToken: null, tokenExpire: null, newApiUserId: "mock-user-3", lastRunAt: agoISO(15), lastStatus: "success", lastError: null, consecutiveFailures: 0, lastSuccessAt: agoISO(15), createdAt: ago(1440 * 7), updatedAt: ago(15) },
  ],
  platforms: ["openai", "anthropic", "google", "deepseek", "alibaba"],
  rates: [
    blRate("group_a", "GPT-4o", "openai", 1.2, 1, "A站点-主站"),
    blRate("group_b", "Claude-3.5-Sonnet", "anthropic", 0.95, 1, "A站点-主站"),
    blRate("group_x", "GPT-3.5-Turbo", "openai", 0.6, 1, "A站点-主站"),
    blRate("group_y", "Claude-Haiku", "anthropic", 0.45, 1, "A站点-主站"),
    blRate("group_z", "Llama-4-Maverick", "meta", 0.8, 1, "A站点-主站"),
    blRate("group_a", "GPT-4o", "openai", 1.15, 2, "B站点-备站"),
    blRate("group_c", "Gemini-2.0-Pro", "google", 1.0, 2, "B站点-备站"),
    blRate("group_m", "Mixtral-8x22B", "mistral", 0.7, 2, "B站点-备站"),
    blRate("group_n", "Command-R+", "cohere", 0.75, 2, "B站点-备站"),
    blRate("group_d", "DeepSeek-V3", "deepseek", 0.55, 3, "C站点-测试"),
    blRate("group_e", "Qwen-Plus", "alibaba", 0.65, 3, "C站点-测试"),
    blRate("group_p", "Ernie-4.0", "baidu", 0.9, 3, "C站点-测试"),
  ],
  changes: {
    changes: [
      blChange("group", "group_a", "rate_multiplier", "1.15", "1.2", "modified", 1, "A站点-主站", "group_a", "GPT-4o", "openai", 1.15, 1.2),
      blChange("group", "group_c", "rate_multiplier", "1.05", "1.0", "modified", 2, "B站点-备站", "group_c", "Gemini-2.0-Pro", "google", 1.05, 1.0),
      blChange("model", "deepseek-v3", "input_price", "0.5", "0.45", "modified", 3, "C站点-测试", undefined, undefined, undefined, 0.5, 0.45),
      blChange("group", "group_new", "rate_multiplier", null, "0.7", "added", 1, "A站点-主站", "group_new", "新分组", "cohere", null, 0.7),
    ],
    total: 4,
    limit: 100,
    offset: 0,
  },
  bindings: {
    bindings: [
      { id: uid(), connectionId: 9999, targetType: "group", targetId: 10, sourceSiteId: 1, sourceSiteName: "A站点-主站", sourceGroupId: "group_a", sourceGroupName: "GPT-4o", sourcePlatform: "openai", createdAt: now, updatedAt: now },
      { id: uid(), connectionId: 9999, targetType: "group", targetId: 20, sourceSiteId: 1, sourceSiteName: "A站点-主站", sourceGroupId: "group_b", sourceGroupName: "Claude-3.5-Sonnet", sourcePlatform: "anthropic", createdAt: now, updatedAt: now },
      { id: uid(), connectionId: 9999, targetType: "group", targetId: 30, sourceSiteId: 2, sourceSiteName: "B站点-备站", sourceGroupId: "group_c", sourceGroupName: "Gemini-2.0-Pro", sourcePlatform: "google", createdAt: now, updatedAt: now },
      { id: uid(), connectionId: 9999, targetType: "group", targetId: 40, sourceSiteId: 3, sourceSiteName: "C站点-测试", sourceGroupId: "group_d", sourceGroupName: "DeepSeek-V3", sourcePlatform: "deepseek", createdAt: now, updatedAt: now },
      { id: uid(), connectionId: 9999, targetType: "group", targetId: 50, sourceSiteId: 3, sourceSiteName: "C站点-测试", sourceGroupId: "group_e", sourceGroupName: "Qwen-Plus", sourcePlatform: "alibaba", createdAt: now, updatedAt: now },
    ],
    rules: [
      { connectionId: 9999, groupId: 10, enabled: true, mode: "average", offset: 0.05, expression: null },
      { connectionId: 9999, groupId: 20, enabled: true, mode: "first", offset: 0, expression: null },
      { connectionId: 9999, groupId: 40, enabled: true, mode: "min", offset: 0.02, expression: null },
    ],
    accountRules: [] as Array<{ connectionId: number; accountId: number; enabled: boolean; mode: string; offset: number; expression: string | null }>,
    rateError: null as string | null,
  },
  sites: [
    { id: 1, name: "A站点-主站", baseUrl: "https://a.mock.local", siteType: "sub2api", email: "a@mock.local", enabled: true, intervalMin: 60, rechargeRatio: 1, lastStatus: "success", lastRunAt: agoISO(15), consecutiveFailures: 0 },
    { id: 2, name: "B站点-备站", baseUrl: "https://b.mock.local", siteType: "sub2api", email: "b@mock.local", enabled: true, intervalMin: 60, rechargeRatio: 1, lastStatus: "success", lastRunAt: agoISO(15), consecutiveFailures: 0 },
    { id: 3, name: "C站点-测试", baseUrl: "https://c.mock.local", siteType: "new_api", email: "c@mock.local", enabled: true, intervalMin: 120, rechargeRatio: 1, lastStatus: "success", lastRunAt: agoISO(15), consecutiveFailures: 0 },
  ],
  listIgnoredRates: [
    { id: uid(), connectionId: 9999, siteId: 1, groupId: "group_x", name: "GPT-3.5-Turbo", createdAt: agoISO(240) },
    { id: uid(), connectionId: 9999, siteId: 1, groupId: "group_y", name: "Claude-Haiku", createdAt: agoISO(240) },
    { id: uid(), connectionId: 9999, siteId: 2, groupId: "group_m", name: "Mixtral-8x22B", createdAt: agoISO(120) },
    { id: uid(), connectionId: 9999, siteId: 2, groupId: "group_n", name: "Command-R+", createdAt: agoISO(120) },
    { id: uid(), connectionId: 9999, siteId: 3, groupId: "group_p", name: "Ernie-4.0", createdAt: agoISO(60) },
  ],
};

// ================================================================
// Upstream Monitor
// ================================================================
export const upstreamMonitor = {
  list: {
    rows: accountDefs.slice(0, 6).map((a, i) => ({
      accountId: a.id,
      accountName: a.name,
      enabled: a.status === "active",
      checkIntervalMinutes: 10,
      failureThreshold: 3,
      pauseMinutes: 30,
      modelId: "gpt-4o",
      prompt: "Say hello",
      consecutiveFailures: i === 5 ? 3 : 0,
      totalChecks: 100 + i * 10,
      successChecks: 98 + i * 10,
      lastStatus: i === 5 ? "failed" : "success",
      lastMessage: i === 5 ? "Timeout after 30s" : "OK (234ms)",
      lastLatencyMs: i === 5 ? 30000 : 200 + i * 30,
      lastCheckedAt: ago(5 + i),
      nextCheckAt: ago(-5),
      pausedUntil: i === 5 ? ago(-15) : null,
      pauseStartedAt: i === 5 ? ago(5) : null,
      createdAt: ago(1440 * 3),
      updatedAt: ago(5),
    })),
    totalAccounts: 7,
    monitored: 5,
  },
};

// ================================================================
// Announcements
// ================================================================
export const announcements = {
  rules: [
    { id: uid(), connectionId: 9999, name: "倍率变更通知", enabled: true, titleTemplate: "【倍率变更】{group_name}", contentTemplate: "{group_name} 倍率从 {old_rate} 变更为 {new_rate}，来源：{source}", targetGroupIds: [10, 20, 30], status: "active", notifyMode: "silent", createdAt: ago(1440 * 7).toISOString(), updatedAt: ago(60).toISOString() },
    { id: uid(), connectionId: 9999, name: "维护公告", enabled: false, titleTemplate: "系统维护通知", contentTemplate: "预计维护时间：{maintenance_time}", targetGroupIds: [], status: "draft", notifyMode: "popup", createdAt: ago(1440 * 3).toISOString(), updatedAt: ago(120).toISOString() },
  ],
  list: [
    { id: uid(), title: "GPT-4o 倍率已更新", content: "GPT-4o 分组倍率已从 1.0 更新为 1.2", status: "active", notify_mode: "silent", starts_at: agoISO(120), ends_at: null, created_at: agoISO(120) },
    { id: uid(), title: "系统维护通知", content: "本站将于本周日凌晨 2:00-4:00 进行维护升级", status: "active", notify_mode: "popup", starts_at: agoISO(60), ends_at: agoISO(-240), created_at: agoISO(60) },
    { id: uid(), title: "Claude-3.5 接入通知", content: "已接入 Claude-3.5-Sonnet 模型，倍率 0.95", status: "active", notify_mode: "silent", starts_at: agoISO(360), ends_at: null, created_at: agoISO(360) },
  ],
};

// ================================================================
// Sync Logs - 匹配 listSyncLogs 返回的 { items, total, nextCursor }
// ================================================================
export const sync = {
  logs: {
    logs: [
      { id: String(uid()), connectionId: 9999, action: "collect_site", actionLabel: "采集站点", target: "A站点-主站", level: "info" as const, detail: "采集完成，5个分组，2个变更", status: "success" as const, error: null, createdAt: agoISO(15) },
      { id: String(uid()), connectionId: 9999, action: "apply_bl_group_rate_rule", actionLabel: "应用规则", target: "group:10", level: "info" as const, detail: "规则已生效", status: "success" as const, error: null, createdAt: agoISO(30) },
      { id: String(uid()), connectionId: 9999, action: "sync_group_rate", actionLabel: "同步倍率", target: "group:40", level: "info" as const, detail: "倍率 0.55 → 0.58", status: "success" as const, error: null, createdAt: agoISO(45) },
      { id: String(uid()), connectionId: 9999, action: "collect_site", actionLabel: "采集站点", target: "B站点-备站", level: "info" as const, detail: "采集完成，4个分组，1个变更", status: "success" as const, error: null, createdAt: agoISO(60) },
      { id: String(uid()), connectionId: 9999, action: "balance_alert", actionLabel: "余额告警", target: "account:3", level: "warning" as const, detail: "余额 ¥85.20，低于阈值 ¥100", status: "success" as const, error: null, createdAt: agoISO(90) },
      { id: String(uid()), connectionId: 9999, action: "test_connection", actionLabel: "测试连接", target: "connection:9999", level: "info" as const, detail: "延迟 123ms，连接正常", status: "success" as const, error: null, createdAt: agoISO(180) },
      { id: String(uid()), connectionId: 9999, action: "update_group_rate_multiplier", actionLabel: "更新倍率", target: "group:50", level: "info" as const, detail: "倍率 0.60 → 0.65", status: "success" as const, error: null, createdAt: agoISO(240) },
      { id: String(uid()), connectionId: 9999, action: "clear_user_rate_multipliers", actionLabel: "清除用户倍率", target: "group:20", level: "info" as const, detail: "已清除", status: "success" as const, error: null, createdAt: agoISO(360) },
      { id: String(uid()), connectionId: 9999, action: "upstream_monitor", actionLabel: "上游监控", target: "account:6", level: "error" as const, detail: "请求超时", status: "failed" as const, error: "Timeout after 30s", createdAt: agoISO(420) },
      { id: String(uid()), connectionId: 9999, action: "collect_all", actionLabel: "全量采集", target: "所有站点", level: "info" as const, detail: "3个站点采集完毕，共12个变更", status: "success" as const, error: null, createdAt: agoISO(480) },
    ],
    total: 42,
    nextCursor: null as string | null,
  },
  logSettings: {
    enabled: true,
    retentionDays: 30,
    minLevel: "info",
  },
};

// ================================================================
// Site Settings
// ================================================================
export const siteSettings = {
  get: {
    site_name: "Mock Sub2API 站点",
    site_description: "这是一个用于演示的 Mock 站点",
    logo_url: null,
    contact_email: "admin@mock.local",
    allow_registration: true,
    registration_enabled: true,
    email_verify_enabled: false,
    promo_code_enabled: false,
    topup_enabled: true,
    topup_min_amount: 10,
    default_user_rate: 1.0,
  },
};

// ================================================================
// Service Status - 匹配真实字段
// ================================================================
export const serviceStatus = {
  overview: {
    checkedAt: now,
    web: { ok: true, message: "Web 服务在线", nodeEnv: "development", uptimeSeconds: 360000 },
    database: { ok: true, message: "数据库连接正常" } as { ok: boolean; message: string },
    worker: {
      online: true,
      heartbeatAt: ago(1),
      heartbeatAgeSeconds: 60,
      startedAt: ago(1440 * 7),
      lastRunStartedAt: ago(1440 * 7 + 1),
      lastRunFinishedAt: ago(1),
      lastRunStatus: "success",
      lastRunMessage: "同步完成",
      lastRunDurationMs: 2340,
      nextRunAt: ago(-30),
      intervalSeconds: 60,
      accountBalanceAlertIntervalSeconds: 300,
      accountBalanceAlertLastRunAt: ago(300),
      accountBalanceAlertNextRunAt: ago(-240),
      upstreamMonitorTimeoutSeconds: 30,
      upstreamMonitorConcurrency: 5,
    },
    bl: { configured: true, totalSites: 3, enabledSites: 3, onlineSites: 3, offlineSites: 0 },
    connections: { total: 1, enabled: 1, auto: 0 },
    upstreamMonitor: { rules: 7, enabledRules: 5 },
    recentLogs: {
      total: 3,
      failed: 0,
      items: [
        { id: String(uid()), connectionId: 9999, action: "collect_site", actionLabel: "采集站点", target: "A站点-主站", level: "info", detail: "采集完成", status: "success", error: null, createdAt: agoISO(15) },
        { id: String(uid()), connectionId: 9999, action: "apply_rule", actionLabel: "应用规则", target: "group:10", level: "info", detail: "规则已生效", status: "success", error: null, createdAt: agoISO(30) },
        { id: String(uid()), connectionId: 9999, action: "balance_alert", actionLabel: "余额告警", target: "account:3", level: "warning", detail: "余额不足", status: "success", error: null, createdAt: agoISO(90) },
      ] as { id: string; connectionId: number; action: string; actionLabel: string | null; target: string | null; level: "info" | "warning" | "error"; detail: string | null; status: "success" | "failed"; error: string | null; createdAt: string }[],
    },
  },
};

// ================================================================
// App Settings
// ================================================================
export const appSettings = {
  get: {
    workerIntervalSeconds: 60,
    accountBalanceAlertIntervalSeconds: 300,
    upstreamMonitorTimeoutSeconds: 30,
    upstreamMonitorConcurrency: 5,
  },
};
