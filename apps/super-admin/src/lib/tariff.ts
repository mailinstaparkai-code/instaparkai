import "server-only";

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
      const tier = sorted.find((t) => t.upto_minutes === null || minutesParked <= t.upto_minutes);
      return tier ? tier.rate : sorted[sorted.length - 1].rate;
    }
    default:
      return null;
  }
}
