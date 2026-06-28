# S2A-Manager 项目记忆

## 项目概述
- S2A-Manager 是一个 Sub2API 站长运维管理面板
- 技术栈：Next.js 14 + React 18 + tRPC + Prisma 5 + PostgreSQL
- 用户 fork 仓库：github.com/Ganseblum/S2A-Manager
- 原始仓库：github.com/langrenjh-alt/S2A-Manager

## 安全审计结论（2026-06-28 完成第三次全面逐行审计）
- 逐行审计了 src/ 下全部 80 个源码文件 + Prisma schema + 配置文件
- **无数据上报、无后门、无泄露**：所有 HTTP 请求只发往用户配置的地址
- 唯一的 fetch() 在 `src/server/http.ts:194`，URL 由调用方传入
- 前端全部通过 `/api/trpc` 同源请求
- Admin API Key：AES-256-GCM 加密存储 + 前端 maskConnection() 脱敏
- 无任何 telemetry/analytics/tracking SDK
- 唯一硬编码 URL 是 GitHub 仓库链接（非数据上报）
- new Function() 沙箱有严格白名单校验

## 部署信息
- 部署在云服务器 154.40.43.181，域名 ai.youc.online
- pnpm 包管理，systemd 服务名 s2a-manager-web.service
- 端口 3001（PORT 环境变量控制），Nginx 反代
- SSL 通过 certbot 自动续期
- 同机部署了 Sub2API（端口 8080）

## 已完成的修改
- 删除了 6 个文件中的 z30.top 推广链接
- package.json start 脚本改为 `next start`（移除硬编码 -p 3000）
- 创建了部署手册、同机部署手册、云服务器部署手册、安全审计报告
