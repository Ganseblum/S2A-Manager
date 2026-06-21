"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data, isLoading } = trpc.auth.session.useQuery(undefined, {
    staleTime: 0,
    refetchOnMount: "always",
  });
  const isPublicAuthPath = pathname === "/login" || pathname === "/setup";

  useEffect(() => {
    if (isLoading) return;
    if (!data?.initialized && pathname !== "/setup") {
      router.replace("/setup");
    } else if (data?.initialized && !data?.authed && pathname !== "/login") {
      router.replace("/login");
    } else if (data?.initialized && data?.authed && (pathname === "/login" || pathname === "/setup")) {
      router.replace("/");
    }
  }, [data, isLoading, router, pathname]);

  if (isLoading && isPublicAuthPath) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="auth-screen flex h-screen items-center justify-center" data-motion="section">
        <div className="rounded-xl border border-white/50 bg-white/[0.56] px-4 py-3 text-sm text-muted-foreground shadow-[0_18px_58px_hsl(217_34%_35%/0.14)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.08] dark:shadow-[0_20px_70px_hsl(0_0%_0%/0.35)]" data-motion="card">
          加载中...
        </div>
      </div>
    );
  }

  if (!data?.initialized && pathname !== "/setup") return null;
  if (data?.initialized && !data?.authed && pathname !== "/login") return null;
  if (data?.initialized && data?.authed && (pathname === "/login" || pathname === "/setup")) return null;

  return <>{children}</>;
}
