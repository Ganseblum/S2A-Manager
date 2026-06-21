import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium shadow-[inset_0_1px_0_hsl(0_0%_100%/0.18)] backdrop-blur-xl transition-colors",
  {
    variants: {
      variant: {
        default: "border-primary/20 bg-primary/10 text-primary",
        secondary: "border-white/[0.35] bg-white/[0.34] text-secondary-foreground dark:border-white/10 dark:bg-white/[0.08]",
        outline: "border-white/40 bg-white/20 text-foreground dark:border-white/10 dark:bg-white/[0.05]",
        destructive: "border-transparent bg-destructive/10 text-destructive",
        success: "border-emerald-500/18 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        warning: "border-amber-500/18 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div data-motion="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
