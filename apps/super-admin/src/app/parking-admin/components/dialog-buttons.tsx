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

/** Outlined secondary action (Cancel), matching the reference's purple outline. */
export function DialogSecondaryButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "flex-1 border-status-disabled text-status-disabled hover:bg-status-disabled/10",
        className
      )}
      {...props}
    />
  );
}
