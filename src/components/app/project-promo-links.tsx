"use client";

import { ExternalLink, Github } from "lucide-react";
import { cn } from "@/lib/utils";

const projectUrl = "https://github.com/langrenjh-alt/S2A-Manager";

type ProjectPromoLinksProps = {
  className?: string;
  stacked?: boolean;
};

export function ProjectPromoLinks({ className, stacked = false }: ProjectPromoLinksProps) {
  const linkClass = cn(
    "inline-flex min-w-0 items-center gap-1.5 rounded-lg border border-white/40 bg-white/[0.28] px-2.5 py-1.5 text-xs text-muted-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.18)] backdrop-blur-xl transition-colors hover:border-primary/35 hover:bg-white/[0.46] hover:text-foreground dark:border-white/10 dark:bg-white/[0.07] dark:hover:bg-white/10",
    stacked ? "w-full" : "max-w-full",
  );

  return (
    <div className={cn(stacked ? "space-y-2" : "flex flex-wrap items-center gap-2", className)}>
      <a href={projectUrl} target="_blank" rel="noreferrer" className={linkClass} title="打开 S2A Manager GitHub 仓库" data-motion="control" data-motion-hover="lift">
        <Github className="size-3.5 shrink-0" />
        <span className="truncate">GitHub: langrenjh-alt/S2A-Manager</span>
        <ExternalLink className="size-3 shrink-0 opacity-70" />
      </a>
    </div>
  );
}
