# S2A Manager

S2A Manager 是用于集中管理 Sub2API 站点的后台工具，覆盖分组倍率、账号调度、倍率采集源绑定、上游账号检测、站点设置、任务日志和公告自动发布等场景。

## 主要功能

- 管理多个 Sub2API 连接，并支持手动或 worker 自动同步。
- 分组倍率管理：绑定倍率采集源分组，显示源分组和当前源倍率，支持规则倍率计算。
- 账号调度管理：新增、编辑、删除、启停调度、刷新凭证、清除错误、绑定采集源分组和按模型测试账号。
- 倍率采集：在站内维护采集源站，定时采集源分组倍率和倍率变更，并按充值倍率换算实际倍率。
- 上游源站检测：按账号配置 uptime 检测规则，连续失败达到阈值后暂停调度，但检测会继续运行；恢复时间到达或检测恢复正常时自动恢复调度。
- 公告管理：配置倍率调整公告规则，当分组倍率被同步或规则更新时自动发布公告。
- 站点设置：按 Sub2API 系统设置结构维护常用配置项。
- 服务状态与日志：查看 Web、数据库、worker 心跳、倍率采集源状态、自动同步连接和最近任务日志。

## 技术栈

- Next.js 14 / React 18
- tRPC / TanStack Query
- Prisma 5 / PostgreSQL
- Tailwind CSS
- 后台 worker：`tsx src/worker/monitor.ts`

## 公开源码说明

本仓库只应包含项目源码、Prisma schema/migrations、前端资源、示例配置和文档。公开仓库前请确认以下内容没有进入 Git：

- `.env`、`.env.*` 等真实环境变量文件
- 本地数据库文件，例如 `*.db`、`*.sqlite`
- `logs/`、`*.log` 等运行日志
- `.next/`、`node_modules/`、`build/`、`out/` 等构建或依赖目录
- 部署压缩包、备份包、源码快照，例如 `*.zip`、`*.tar.gz`

`.env.example` 只提供示例值，生产环境必须替换为自己的密钥和数据库连接。仓库当前未附带开源许可证文件；如果要以开源项目形式发布，请先补充 `LICENSE` 并在这里说明授权方式。没有明确许可证时，默认不代表允许他人复制、修改或再分发。

## 快速开始

项目使用 PostgreSQL。以下命令适用于全新开发或测试环境；如果你正在从旧版 SQLite 生产库升级，请先看 [部署指南.md](./部署指南.md) 中的数据迁移说明。

```bash
npm ci
cp .env.example .env
npx prisma migrate deploy
npm run dev
```

首次访问 `http://127.0.0.1:3000` 后创建管理员账号。

后台自动任务需要单独启动：

```bash
npm run worker
```

worker 负责：

- BL 分组倍率自动同步
- 已启用分组倍率规则自动应用
- 上游检测、自动暂停、持续探活和自动恢复
- 倍率变化公告规则自动发布

默认 worker 每 10 分钟运行一轮，可在右上角“应用设置”里调整。最小间隔为 1 分钟；`S2A_WORKER_INTERVAL_SECONDS` 只作为数据库未配置时的启动默认值。设置 `S2A_WORKER_ONCE=1` 可只运行一轮后退出，便于排查问题。

## 环境变量

`.env.example` 提供最小配置：

```env
DATABASE_URL="postgresql://s2amanager:password@127.0.0.1:5432/s2amanager?schema=public"
APP_SECRET="change-me-to-a-24-plus-char-secret!"
ENCRYPTION_KEY="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
```

生产环境必须更换：

- `APP_SECRET`：至少 24 位随机字符串。
- `ENCRYPTION_KEY`：32 字节 base64 字符串，可用 `openssl rand -base64 32` 生成。已有加密数据后不要更换。
- `DATABASE_URL`：PostgreSQL 连接字符串，例如 `postgresql://USER:PASSWORD@HOST:5432/DB?schema=public`。

可选环境变量：

- `S2A_LOG_DIR`：运行日志目录，默认是项目目录下的 `logs/`。
- `S2A_WORKER_INTERVAL_SECONDS`：数据库未配置 worker 间隔时的启动默认值。
- `S2A_WORKER_ONCE=1`：让 worker 只执行一轮后退出。
- `S2A_UPSTREAM_MONITOR_TIMEOUT_SECONDS`：数据库未配置检测超时时的启动默认值。
- `S2A_UPSTREAM_MONITOR_CONCURRENCY`：数据库未配置检测并发时的启动默认值。

## 部署

Ubuntu 部署请看 [部署指南.md](./部署指南.md)。推荐从 GitHub 克隆源码部署，并在服务器上通过 `.env` 单独配置密钥和数据库连接。

全新部署：配置 PostgreSQL 后执行 `npx prisma migrate deploy` 创建当前版本表结构。

从旧版 SQLite 生产库升级：`npx prisma migrate deploy` 只会在 PostgreSQL 中创建当前版本表结构，不会自动把 SQLite 里的管理员账号、连接、分组规则、采集源等业务数据迁入 PostgreSQL。需要先备份 SQLite 文件并单独执行数据迁移方案；确认迁移完成前不要直接用 PostgreSQL 版覆盖生产环境。

## 常用命令

```bash
npm run dev
npm run build
npm run start
npm run worker
npm run lint
npx prisma validate
npx prisma migrate deploy
```

## 注意事项

- Web 服务和 worker 是两个进程，生产环境需要分别托管。
- 倍率采集源在“倍率采集”页面中维护，不需要额外配置独立同步服务。
- 分组倍率规则只有开启“使用倍率规则”后才会自动应用。
- 公告自动发布只会在目标分组倍率实际变化时触发。
- 如果 uptime 规则设置为 1 分钟，worker 运行间隔也应设置为 1 分钟；若单次检测超时或账号数量导致一轮耗时超过 1 分钟，worker 会在本轮结束后立即补跑下一轮，但不会并发重叠。
- 中文内容按 UTF-8 JSON 发送；如果远端公告仍乱码，需要检查反向代理和 Sub2API 站点编码处理。
