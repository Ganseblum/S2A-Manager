import { jwtVerify } from "jose/jwt/verify";
import { NextResponse, type NextRequest } from "next/server";
import { appSecret } from "@/server/env";

const cookieName = "s2a_session";
const encoder = new TextEncoder();

function secretKey() {
  return encoder.encode(appSecret());
}

async function hasValidSession(request: NextRequest) {
  const token = request.cookies.get(cookieName)?.value;
  if (!token) return false;

  try {
    const verified = await jwtVerify(token, secretKey());
    return verified.payload.role === "admin" && typeof verified.payload.email === "string" && verified.payload.email.length > 0;
  } catch {
    return false;
  }
}

function firstForwardedValue(value: string | null) {
  return value?.split(",")[0]?.trim() || "";
}

function withoutPort(host: string) {
  if (!host) return "";
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    return end >= 0 ? host.slice(0, end + 1) : host;
  }
  return host.split(":")[0] ?? "";
}

function forwardedOrigin(request: NextRequest) {
  const forwardedHost = firstForwardedValue(request.headers.get("x-forwarded-host"));
  const requestHost = firstForwardedValue(request.headers.get("host"));
  const host = withoutPort(forwardedHost || requestHost || request.nextUrl.hostname || request.nextUrl.host);
  if (!host) return request.nextUrl.origin;

  const forwardedProto = firstForwardedValue(request.headers.get("x-forwarded-proto")).toLowerCase();
  const proto = forwardedProto === "http" || forwardedProto === "https"
    ? forwardedProto
    : request.nextUrl.protocol.replace(/:$/, "") || "http";

  return `${proto}://${host}`;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/login" || pathname === "/setup") return NextResponse.next();
  if (await hasValidSession(request)) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    response.headers.append("Vary", "Cookie");
    return response;
  }

  const url = new URL("/login", forwardedOrigin(request));
  url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.cookies.delete(cookieName);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
