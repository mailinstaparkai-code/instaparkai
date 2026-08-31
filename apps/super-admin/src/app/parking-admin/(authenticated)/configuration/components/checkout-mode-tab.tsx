"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { updateDirectCheckoutMode } from "../actions";

export function CheckoutModeTab({ directCheckoutModeEnabled }: { directCheckoutModeEnabled: boolean }) {
  const [pending, setPending] = useState(false);

  async function handleChange(checked: boolean) {
    setPending(true);
    try {
      const formData = new FormData();
      if (checked) formData.set("direct_checkout_mode", "on");
      await updateDirectCheckoutMode(formData);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-card flex items-center justify-between gap-4 bg-gradient-to-br from-brand-blue/10 via-card to-card p-4">
        <div>
          <p className="text-sm font-medium">Direct Checkout mode</p>
          <p className="text-xs text-muted-foreground">
            When on, checkout skips guest requests, operator dispatch, and OTP
            confirmation entirely — a vehicle checks in and, whenever it's ready to
            leave, an operator taps Checkout on it directly from the Live Queue,
            confirms the fare, and finishes. Mobile number and QR code become optional
            at check-in too, since there&apos;s no guest tracking link in this mode.
            When off, everything works exactly as it does today.
          </p>
        </div>
        <Switch
          key={String(directCheckoutModeEnabled)}
          defaultChecked={directCheckoutModeEnabled}
          disabled={pending}
          onCheckedChange={handleChange}
        />
      </div>
    </div>
  );
}
