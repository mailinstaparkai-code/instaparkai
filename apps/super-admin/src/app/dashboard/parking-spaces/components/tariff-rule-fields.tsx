"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Field } from "./parking-space-fields";

type PricingType = "flat" | "hourly" | "surge" | "slab";

export function TariffRuleFields() {
  const [pricingType, setPricingType] = useState<PricingType>("hourly");

  return (
    <>
      <Field label="Vehicle category">
        <Input name="vehicle_category" defaultValue="car" placeholder="car" />
      </Field>
      <Field label="Pricing type">
        <select
          name="pricing_type"
          value={pricingType}
          onChange={(e) => setPricingType(e.target.value as PricingType)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="flat">Flat</option>
          <option value="hourly">Hourly</option>
          <option value="surge">Surge</option>
          <option value="slab">Slab (tiered)</option>
        </select>
      </Field>

      {pricingType !== "slab" && (
        <Field label="Rate (₹)">
          <Input name="rate" type="number" step="0.01" required />
        </Field>
      )}

      {pricingType === "surge" && (
        <Field label="Surge multiplier">
          <Input name="surge_multiplier" type="number" step="0.01" />
        </Field>
      )}

      {pricingType === "slab" && (
        <div className="flex flex-col gap-2 rounded-md border border-input p-3">
          <p className="text-xs text-muted-foreground">
            Each tier applies for up to N minutes. Leave the last tier&apos;s minutes blank
            for &quot;and beyond&quot;.
          </p>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-xs text-muted-foreground">Tier {i + 1}</span>
              <Input
                name={`slab_upto_minutes_${i}`}
                type="number"
                min={1}
                placeholder={i === 2 ? "and beyond" : "up to minutes"}
              />
              <Input name={`slab_rate_${i}`} type="number" step="0.01" placeholder="rate ₹" />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
