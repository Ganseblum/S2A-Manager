#!/usr/bin/env bash
#=============================================================
# S2A Manager 部署前环境检测脚本
# 作用：检查 Node.js、PostgreSQL、端口占用等是否符合部署要求
# 用法：bash scripts/preflight-check.sh
#=============================================================

set -euo pipefail

# ---- 颜色 ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ---- 计数器 ----
PASS=0
WARN=0
FAIL=0
SKIP_HINT=""

# ---- 检测函数 ----
check_pass() {
  echo -e "  ${GREEN}✅ 通过${NC} $1"
  PASS=$((PASS + 1))
}

check_warn() {
  echo -e "  ${YELLOW}⚠️  警告${NC} $1"
  WARN=$((WARN + 1))
}

check_fail() {
  echo -e "  ${RED}❌ 未通过${NC} $1"
  FAIL=$((FAIL + 1))
}

section() {
  echo ""
  echo -e "${BOLD}${CYAN}━━━ $1 ━━━${NC}"
}

# ---- 版本比较函数：返回 0=满足, 1=不满足 ----
version_ge() {
  # $1=当前版本, $2=最低要求版本
  local v1 v2
  v1=$(echo "$1" | cut -d. -f1)
  v2=$(echo "$2" | cut -d. -f1)
  if [ "$v1" -gt "$v2" ]; then return 0; fi
  if [ "$v1" -eq "$v2" ]; then return 0; fi
  return 1
}

#=============================================================
echo -e "${BOLD}${CYAN}"
echo "╔═══════════════════════════════════════════════════╗"
echo "║     S2A Manager 部署前环境检测                    ║"
echo "║     检测已有环境，避免重复安装                    ║"
echo "╚═══════════════════════════════════════════════════╝"
echo -e "${NC}"

#=============================================================
section "1/6  Node.js"
#=============================================================
NODE_BIN=""
if command -v node &>/dev/null; then
  NODE_BIN=$(command -v node)
  NODE_VER=$(node --version 2>/dev/null | sed 's/v//')
  if version_ge "$NODE_VER" "20"; then
    check_pass "Node.js 已安装：v${NODE_VER}（路径：${NODE_BIN}）"
    SKIP_HINT="${SKIP_HINT}Node.js"
  else
    check_fail "Node.js 版本过低：v${NODE_VER}，需要 v20+"
    echo -e "      ${YELLOW}→ 升级方法：${NC}"
    echo -e "        macOS:  brew install node@22"
    echo -e "        Linux:  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash - && sudo apt install -y nodejs"
  fi
else
  check_fail "Node.js 未安装"
  echo -e "      ${YELLOW}→ 安装方法：${NC}"
  echo -e "        macOS:  brew install node@22"
  echo -e "        Linux:  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash - && sudo apt install -y nodejs"
fi

#=============================================================
section "2/6  npm"
#=============================================================
if command -v npm &>/dev/null; then
  NPM_VER=$(npm --version 2>/dev/null)
  check_pass "npm 已安装：v${NPM_VER}"
else
  check_fail "npm 未安装（通常随 Node.js 一起安装）"
fi

#=============================================================
section "3/6  PostgreSQL"
#=============================================================
PSQL_BIN=""
if command -v psql &>/dev/null; then
  PSQL_BIN=$(command -v psql)
  PSQL_VER=$(psql --version 2>/dev/null | awk '{print $3}')
  check_pass "PostgreSQL 已安装：v${PSQL_VER}（路径：${PSQL_BIN}）"
else
  check_fail "PostgreSQL 未安装"
  echo -e "      ${YELLOW}→ 安装方法：${NC}"
  echo -e "        macOS:  brew install postgresql@18"
  echo -e "        Linux:  sudo apt install -y postgresql postgresql-contrib"
fi

# 检测 PostgreSQL 是否在运行
if [ -n "$PSQL_BIN" ]; then
  if pg_isready &>/dev/null; then
    check_pass "PostgreSQL 服务正在运行"
  else
    check_warn "PostgreSQL 已安装但未运行"
    echo -e "      ${YELLOW}→ 启动方法：${NC}"
    echo -e "        macOS:  brew services start postgresql"
    echo -e "        Linux:  sudo systemctl start postgresql"
  fi
fi

#=============================================================
section "4/6  端口占用检测"
#=============================================================
# 检测 Sub2API 端口（3000）
SUB2API_PORT=3000
if lsof -i :${SUB2API_PORT} &>/dev/null || ss -tlnp 2>/dev/null | grep -q ":${SUB2API_PORT} " || netstat -an 2>/dev/null | grep -q "\.${SUB2API_PORT} "; then
  # 尝试获取进程信息
  PORT_INFO=$(lsof -i :${SUB2API_PORT} 2>/dev/null | head -2 | tail -1 || ss -tlnp 2>/dev/null | grep ":${SUB2API_PORT} " || echo "端口被占用")
  check_pass "端口 ${SUB2API_PORT} 已被占用（Sub2API 可能正在运行）"
  echo -e "      ${CYAN}占用信息：${NC} ${PORT_INFO}"
  SUB2API_RUNNING=true
else
  check_warn "端口 ${SUB2API_PORT} 未被占用（Sub2API 可能未运行）"
  echo -e "      ${YELLOW}→ 请确认 Sub2API 是否已启动，或是否使用了其他端口${NC}"
  SUB2API_RUNNING=false
fi

# 检测 S2A Manager 端口（3001）
S2A_PORT=3001
if lsof -i :${S2A_PORT} &>/dev/null || ss -tlnp 2>/dev/null | grep -q ":${S2A_PORT} " || netstat -an 2>/dev/null | grep -q "\.${S2A_PORT} "; then
  check_warn "端口 ${S2A_PORT} 已被占用"
  echo -e "      ${YELLOW}→ S2A Manager 需要使用此端口，请先释放或改用其他端口${NC}"
else
  check_pass "端口 ${S2A_PORT} 空闲，S2A Manager 可使用"
fi

#=============================================================
section "5/6  S2A Manager 数据库检测"
#=============================================================
# 检测 s2amanager 数据库是否已存在
if [ -n "$PSQL_BIN" ] && pg_isready &>/dev/null; then
  DB_EXISTS=$(psql -tAc "SELECT 1 FROM pg_database WHERE datname='s2amanager'" 2>/dev/null || psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='s2amanager'" 2>/dev/null || echo "0")
  if [ "$DB_EXISTS" = "1" ]; then
    check_pass "数据库 s2amanager 已存在，可跳过创建步骤"
    SKIP_HINT="${SKIP_HINT}、数据库创建"
  else
    check_warn "数据库 s2amanager 不存在，需要创建"
  fi
else
  check_warn "PostgreSQL 未运行，无法检测数据库状态"
fi

#=============================================================
section "6/6  S2A Manager 项目状态检测"
#=============================================================
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# 检测 .env 是否已配置
if [ -f "${PROJECT_DIR}/.env" ]; then
  check_pass ".env 已存在"
  SKIP_HINT="${SKIP_HINT}、.env 配置"
else
  check_warn ".env 不存在，需要创建（cp .env.example .env）"
fi

# 检测 node_modules 是否已安装
if [ -d "${PROJECT_DIR}/node_modules" ]; then
  check_pass "node_modules 已存在，可跳过 npm ci"
  SKIP_HINT="${SKIP_HINT}、依赖安装"
else
  check_warn "node_modules 不存在，需要执行 npm ci"
fi

# 检测是否已构建
if [ -d "${PROJECT_DIR}/.next" ]; then
  check_pass "已构建（.next 目录存在），可跳过 npm run build"
  SKIP_HINT="${SKIP_HINT}、构建"
else
  check_warn "未构建，需要执行 npm run build"
fi

#=============================================================
# 汇总
#=============================================================
echo ""
echo -e "${BOLD}${CYAN}━━━ 检测汇总 ━━━${NC}"
echo ""
echo -e "  ${GREEN}通过：${PASS} 项${NC}"
echo -e "  ${YELLOW}警告：${WARN} 项${NC}"
echo -e "  ${RED}未通过：${FAIL} 项${NC}"
echo ""

if [ $FAIL -gt 0 ]; then
  echo -e "${RED}${BOLD}⚠️  有 ${FAIL} 项未通过，请先解决以上问题再继续部署。${NC}"
  echo ""
  exit 1
fi

if [ $WARN -gt 0 ]; then
  echo -e "${YELLOW}${BOLD}ℹ️  有 ${WARN} 项警告，请根据提示处理。${NC}"
  echo ""
fi

if [ -n "$SKIP_HINT" ]; then
  echo -e "${GREEN}${BOLD}✅ 以下步骤可跳过（已有）：${NC}"
  echo -e "   ${SKIP_HINT}"
  echo ""
  echo -e "${CYAN}请对照部署手册，跳过已有环境对应步骤，只执行缺失部分。${NC}"
else
  echo -e "${CYAN}环境基本就绪，请按部署手册逐步执行。${NC}"
fi

echo ""
