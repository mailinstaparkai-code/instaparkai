import "server-only";
import { todayIST } from "./operator-availability";

// A blank date, or today's own IST date, means "effective immediately" -- otherwise
// the chosen date becomes midnight IST of that date. Used by both the web Server
// Action and the Android-facing configuration.ts create/update tariff functions.
export function resolveEffectiveFrom(dateStr: string | null | undefined): string {
  if (!dateStr || dateStr === todayIST()) return new Date().toISOString();
  return new Date(`${dateStr}T00:00:00+05:30`).toISOString();
}

export type TariffRule = {
  vehicle_category: string;
  pricing_type: "flat" | "hourly" | "surge" | "slab";
  rate: number;
  surge_multiplier: number | null;
  slab_tiers: { upto_minutes: number | null; rate: number }[] | null;
};

function pickRule(rules: TariffRule[], vehicleType: string): TariffRule | null {
  return (
    rules.find((r) => r.vehicle_category.toLowerCase() === vehicleType.toLowerCase()) ??
    rules.find((r) => r.vehicle_category.toLowerCase() === "car") ??
    rules[0] ??
    null
  );
}

// Best-effort fare estimate for the manual handover flow -- the operator can always
// override the suggested amount. Not wired into billing/payment gateway (none exists yet).
export function computeFare(
  rules: TariffRule[],
  vehicleType: string,
  minutesParked: number
): number | null {
  const rule = pickRule(rules, vehicleType);
  if (!rule) return null;

  const hours = Math.max(1, Math.ceil(minutesParked / 60));

  switch (rule.pricing_type) {
    case "flat":
      return rule.rate;
    case "hourly":
      return rule.rate * hours;
    case "surge":
      return rule.rate * hours * (rule.surge_multiplier ?? 1);
    case "slab": {
      if (!rule.slab_tiers?.length) return null;
      const sorted = [...rule.slab_tiers].sort((a, b) => {
        if (a.upto_minutes === null) return 1;
        if (b.upto_minutes === null) return -1;
        return a.upto_minutes - b.upto_minutes;
      });
      // Each tier's rate is a delta on top of the ones before it (e.g. "₹30 for the
      // first hour, +₹15 more after 2 hours" is entered as two tiers, 30 and 15) --
      // sum every tier up to and including the matching one, not just that tier alone.
      const matchIndex = sorted.findIndex((t) => t.upto_minutes === null || minutesParked <= t.upto_minutes);
      const cutoff = matchIndex === -1 ? sorted.length - 1 : matchIndex;
      return sorted.slice(0, cutoff + 1).reduce((sum, t) => sum + t.rate, 0);
    }
    default:
      return null;
  }
}
