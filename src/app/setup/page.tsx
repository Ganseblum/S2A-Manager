"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Code2 } from "lucide-react";

export default function SetupPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const setup = trpc.auth.setup.useMutation({
    onSuccess: async () => {
      await utils.auth.session.invalidate();
      router.replace("/");
      router.refresh();
    },
    onError: (e) => setError(e.message),
  });

  return (
    <div className="auth-screen flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-3 flex size-10 items-center justify-center rounded-md border border-primary/25 bg-primary/12 text-primary">
            <Code2 className="size-5" />
          </div>
          <CardTitle className="text-2xl">初始设置</CardTitle>
          <CardDescription>创建首个管理员账号，随后进入管理台</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); setError(""); setup.mutate({ email, password }); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">管理员邮箱</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码 (至少6位)</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••" minLength={6} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={setup.isPending}>
              {setup.isPending ? "创建中..." : "创建管理员"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
