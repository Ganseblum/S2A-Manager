/**
 * Mock 模式检测。
 * 优先级：cookie > 环境变量
 * - 环境变量 MOCK_MODE=true 时默认开启（dev 默认启用）
 * - Cookie mock_mode=0 可临时关闭（UI 开关控制）
 * - Cookie mock_mode=1 可强制开启
 */
import { cookies } from "next/headers";

const COOKIE_NAME = "mock_mode";

export function isMockMode(): boolean {
  // 先检查 cookie（UI 开关写入）
  try {
    const cookieVal = cookies().get(COOKIE_NAME)?.value;
    if (cookieVal === "1") return true;
    if (cookieVal === "0") return false;
  } catch {
    // cookies() 在非请求上下文可能抛错
  }
  // fallback 到环境变量
  return process.env.MOCK_MODE === "true";
}

export function setMockModeCookie(enabled: boolean) {
  cookies().set(COOKIE_NAME, enabled ? "1" : "0", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
