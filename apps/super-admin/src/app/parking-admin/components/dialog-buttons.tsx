import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Glowing orange primary action, matching the reference's "Check in" CTA. */
export function DialogPrimaryButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn(
        "flex-[1.4] bg-brand-orange text-white shadow-[0_8px_20px_-6px_var(--brand-orange)] hover:bg-brand-orange-strong",
        className
      )}
      {...props}
    />
  );
}

/** design.md §5 "Dialog" -- secondary footer button: white, hairline border, inkBody label. */
export function DialogSecondaryButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "flex-1 border-hairline text-ink-body hover:bg-hairline-soft",
        className
      )}
      {...props}
    />
  );
}
