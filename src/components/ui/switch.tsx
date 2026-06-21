import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-white/[0.45] bg-white/[0.38] p-px shadow-[inset_0_1px_0_hsl(0_0%_100%/0.24)] backdrop-blur-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/[0.18] focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=checked]:border-primary/50 data-[state=checked]:bg-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.08]",
      className,
    )}
    data-motion="control"
    data-motion-hover="scale"
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb className="pointer-events-none block size-4 rounded-full bg-white shadow-[0_2px_8px_hsl(217_34%_35%/0.18)] transition-transform data-[state=checked]:translate-x-4 data-[state=checked]:bg-primary-foreground data-[state=unchecked]:translate-x-0 dark:bg-foreground" />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
