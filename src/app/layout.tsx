import type { Metadata } from "next";
import { AuthGuard } from "@/components/app/auth-guard";
import { ThemeProvider } from "@/components/app/theme-provider";
import { TrpcProvider } from "@/components/app/trpc-provider";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

export const metadata: Metadata = { title: "S2A Manager", description: "Sub2API 管理工具" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <TrpcProvider>
              <AuthGuard>{children}</AuthGuard>
            </TrpcProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
