"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Field } from "../../../components/field";

type PricingType = "flat" | "hourly" | "surge" | "slab";

type SlabTier = { upto_minutes: number | null; rate: number };

export type TariffRuleInitial = {
  pricing_type: PricingType;
  rate: number;
  surge_multiplier: number | null;
  slab_tiers: SlabTier[] | null;
};

export function TariffRuleFields({
  vehicleTypes,
  lockedVehicleCategory,
  initial,
}: {
  vehicleTypes: { id: string; name: string }[];
  // When set, this is an edit of an existing category -- show it read-only instead
  // of the create flow's dropdown (changing the category is what "+ Tariff Rule" is
  // for, not "Edit").
  lockedVehicleCategory?: string;
  // Pre-fills the form for editing an existing rule's current values.
  initial?: TariffRuleInitial;
}) {
  const [pricingType, setPricingType] = useState<PricingType>(initial?.pricing_type ?? "hourly");
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const slabTiers = initial?.slab_tiers ?? [];

  return (
    <>
      {lockedVehicleCategory ? (
        <Field label="Vehicle type">
          <div className="flex h-9 items-center rounded-md border border-input bg-muted px-3 text-sm">
            {lockedVehicleCategory}
          </div>
          <input type="hidden" name="vehicle_category" value={lockedVehicleCategory} />
        </Field>
      ) : (
        <Field label="Vehicle type">
          <select
            name="vehicle_category"
            defaultValue={vehicleTypes[0]?.name}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {vehicleTypes.map((vt) => (
              <option key={vt.id} value={vt.name}>
                {vt.name}
              </option>
            ))}
          </select>
        </Field>
      )}
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
          <Input name="rate" type="number" step="0.01" required defaultValue={initial?.rate} />
        </Field>
      )}

      {pricingType === "surge" && (
        <Field label="Surge multiplier">
          <Input
            name="surge_multiplier"
            type="number"
            step="0.01"
            defaultValue={initial?.surge_multiplier ?? undefined}
          />
        </Field>
      )}

      {pricingType === "slab" && (
        <div className="flex flex-col gap-2 rounded-md border border-input p-3">
          <p className="text-xs text-muted-foreground">
            Each tier applies for up to N minutes and adds on top of the tiers before it
            (e.g. ₹30 for the first hour, then +₹15 more after 2 hours). Leave the last
            tier&apos;s minutes blank for &quot;and beyond&quot;.
          </p>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-xs text-muted-foreground">Tier {i + 1}</span>
              <Input
                name={`slab_upto_minutes_${i}`}
                type="number"
                min={1}
                placeholder={i === 2 ? "and beyond" : "up to minutes"}
                defaultValue={slabTiers[i]?.upto_minutes ?? undefined}
              />
              <Input
                name={`slab_rate_${i}`}
                type="number"
                step="0.01"
                placeholder="rate ₹"
                defaultValue={slabTiers[i]?.rate ?? undefined}
              />
            </div>
          ))}
        </div>
      )}

      <Field label="Effective from">
        <Input name="effective_date" type="date" defaultValue={todayStr} />
      </Field>
      <p className="text-xs text-muted-foreground">
        Leave as today to apply immediately, or pick a future date to schedule this
        change in advance.
      </p>
    </>
  );
}
