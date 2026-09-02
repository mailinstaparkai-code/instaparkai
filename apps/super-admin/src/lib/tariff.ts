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
      // Each finite tier's rate is a one-time delta for reaching that block (e.g.
      // "first hour ₹20" is owed in full once any part of that hour is used). The
      // final tier (upto_minutes: null, see this column's own migration comment,
      // 20260712151137_slab_tariff_pricing.sql) is different: its rate applies to
      // "any remaining duration," i.e. it's a per-hour-or-part-thereof rate for time
      // beyond the last finite cutoff, not a one-time addition -- a vehicle parked for
      // 6 hours against "first hour ₹20, then ₹40/hr" owes 20 + 40*5, not 20 + 40.
      // (Real bug hit in this repo: a 6-hour stay was quoted the same flat total as a
      // 2-hour one, since the old logic summed every tier's rate exactly once.)
      let total = 0;
      let previousCutoff = 0;
      for (const tier of sorted) {
        if (tier.upto_minutes === null) {
          const remainingMinutes = Math.max(0, minutesParked - previousCutoff);
          const extraHours = Math.ceil(remainingMinutes / 60);
          total += tier.rate * extraHours;
          break;
        }
        total += tier.rate;
        previousCutoff = tier.upto_minutes;
        if (minutesParked <= tier.upto_minutes) break;
      }
      return total;
    }
    default:
      return null;
  }
}
