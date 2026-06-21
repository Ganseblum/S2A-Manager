"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/app/brand-mark";
import { ProjectPromoLinks } from "@/components/app/project-promo-links";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const login = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.session.invalidate();
      router.replace("/");
      router.refresh();
    },
    onError: (e) => setError(e.message),
  });

  return (
    <div className="auth-screen flex min-h-screen items-center justify-center px-4 py-6 sm:px-6" data-motion="section">
      <div className="w-full max-w-sm" data-motion="panel">
        <div className="mb-4 flex justify-end" data-motion="control">
          <ThemeToggle />
        </div>
        <Card className="w-full">
          <CardHeader>
            <BrandMark className="mb-3 size-12 text-slate-900 dark:text-white" />
            <CardTitle className="text-2xl">S2A Manager</CardTitle>
            <CardDescription>登录后管理 Sub2API 连接、倍率和同步任务。项目仓库 langrenjh-alt/S2A-Manager，SUB2API 中转站推荐 z30.top。</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setError("");
                login.mutate({ email, password });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••" />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={login.isPending}>
                {login.isPending ? "登录中..." : "登录"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <ProjectPromoLinks stacked className="mt-3" />
      </div>
    </div>
  );
}
