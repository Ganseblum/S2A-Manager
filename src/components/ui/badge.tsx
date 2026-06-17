import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-primary/15 bg-primary/8 text-primary",
        secondary: "border-border/70 bg-secondary/50 text-secondary-foreground",
        outline: "border-border/80 text-foreground",
        destructive: "border-transparent bg-destructive/10 text-destructive",
        success: "border-emerald-500/15 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300",
        warning: "border-amber-500/15 bg-amber-500/8 text-amber-700 dark:text-amber-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
