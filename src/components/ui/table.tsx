import * as React from "react";
import { cn } from "@/lib/utils";

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(({ className, ...props }, ref) => (
  <div className="max-w-full overflow-x-auto overflow-y-hidden rounded-lg border border-white/50 bg-white/[0.42] shadow-[inset_0_1px_0_hsl(0_0%_100%/0.28)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.06]" data-motion="table">
    <table ref={ref} className={cn("w-full min-w-max caption-bottom text-xs sm:text-sm", className)} {...props} />
  </div>
));
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
));
TableBody.displayName = "TableBody";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(({ className, ...props }, ref) => (
  <tr ref={ref} data-motion="row" className={cn("border-b border-white/[0.35] transition-colors hover:bg-white/[0.38] dark:border-white/[0.08] dark:hover:bg-white/[0.08]", className)} {...props} />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement> & { sticky?: number }>(({ className, sticky, style, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-9 whitespace-nowrap bg-white/[0.38] px-2.5 text-left align-middle text-xs font-medium text-muted-foreground sm:h-10 sm:px-3 dark:bg-white/[0.06]",
      sticky !== undefined && "sticky z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",
      className
    )}
    style={{ ...style, left: sticky !== undefined ? sticky : undefined, position: sticky !== undefined ? "sticky" : undefined }}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement> & { sticky?: number }>(({ className, sticky, style, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "p-2.5 align-middle sm:p-3",
      sticky !== undefined && "sticky z-10 bg-white dark:bg-zinc-950",
      className
    )}
    style={{ ...style, left: sticky !== undefined ? sticky : undefined, position: sticky !== undefined ? "sticky" : undefined }}
    {...props}
  />
));
TableCell.displayName = "TableCell";

export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow };
