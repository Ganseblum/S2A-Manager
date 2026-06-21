"use client";

import { createContext, useCallback, useContext, useState, type PropsWithChildren } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastMessage = Required<Pick<ToastInput, "title" | "variant">> &
  Pick<ToastInput, "description"> & {
    id: string;
  };

type ToastContextValue = {
  showToast: (toast: ToastInput) => void;
  dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const variantStyles: Record<ToastVariant, string> = {
  success: "border-emerald-500/20 bg-emerald-500/12 text-emerald-800 dark:text-emerald-100",
  error: "border-destructive/25 bg-destructive/[0.12] text-destructive",
  info: "border-white/[0.45] bg-white/[0.72] text-foreground dark:border-white/10 dark:bg-zinc-950/[0.72]",
};

const iconStyles: Record<ToastVariant, string> = {
  success: "text-emerald-600 dark:text-emerald-300",
  error: "text-destructive",
  info: "text-primary",
};

const variantIcons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, description, variant = "info", durationMs = 3500 }: ToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((current) => [{ id, title, description, variant }, ...current].slice(0, 4));
      window.setTimeout(() => dismissToast(id), durationMs);
    },
    [dismissToast],
  );

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <div className="fixed right-4 top-4 z-[100] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((toast) => {
          const Icon = variantIcons[toast.variant];
          return (
            <div
              key={toast.id}
              role={toast.variant === "error" ? "alert" : "status"}
              data-motion="toast"
              className={cn("rounded-xl border p-3 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.28),0_18px_58px_hsl(217_34%_35%/0.18)] backdrop-blur-2xl dark:shadow-[inset_0_1px_0_hsl(0_0%_100%/0.08),0_20px_70px_hsl(0_0%_0%/0.45)]", variantStyles[toast.variant])}
            >
              <div className="flex items-start gap-3">
                <Icon className={cn("mt-0.5 size-5 shrink-0", iconStyles[toast.variant])} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{toast.title}</p>
                  {toast.description ? <p className="mt-1 break-words text-xs opacity-85">{toast.description}</p> : null}
                </div>
                <button
                  type="button"
                  className="rounded-sm p-0.5 opacity-60 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
                  onClick={() => dismissToast(toast.id)}
                  aria-label="关闭提示"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
