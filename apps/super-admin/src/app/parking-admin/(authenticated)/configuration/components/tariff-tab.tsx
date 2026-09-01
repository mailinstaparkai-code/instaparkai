import { Button } from "@/components/ui/button";
import { FormDialog } from "../../../components/form-dialog";
import { DeleteButton } from "../../../components/delete-button";
import { createTariffRule, updateTariffRule, deleteTariffRule } from "../actions";
import { TariffRuleFields } from "./tariff-rule-fields";

type TariffRule = {
  id: string;
  vehicle_category: string;
  pricing_type: string;
  rate: number;
  surge_multiplier: number | null;
  slab_tiers: { upto_minutes: number | null; rate: number }[] | null;
  effective_from: string;
};

function formatRate(rule: TariffRule) {
  if (rule.pricing_type === "slab") return "Tiered";
  return (
    `₹${rule.rate}` + (rule.pricing_type === "surge" && rule.surge_multiplier ? ` × ${rule.surge_multiplier}` : "")
  );
}

// Editing a rule inserts a new versioned row for the same vehicle_category rather
// than mutating the old one (see actions.ts's updateTariffRule) -- rows arrive
// ordered by vehicle_category, effective_from ascending (page.tsx's query), so
// grouping them here just needs to track the latest already-effective row (current)
// and any not-yet-effective ones (upcoming) per category.
function groupByCategory(tariffRules: TariffRule[]) {
  const now = Date.now();
  const groups = new Map<string, { current: TariffRule | null; upcoming: TariffRule[] }>();
  for (const rule of tariffRules) {
    const g = groups.get(rule.vehicle_category) ?? { current: null, upcoming: [] };
    if (new Date(rule.effective_from).getTime() <= now) {
      g.current = rule;
    } else {
      g.upcoming.push(rule);
    }
    groups.set(rule.vehicle_category, g);
  }
  return [...groups.entries()].map(([category, g]) => ({ category, ...g }));
}

export function TariffTab({
  tariffRules,
  vehicleTypes,
}: {
  tariffRules: TariffRule[];
  vehicleTypes: { id: string; name: string }[];
}) {
  const groups = groupByCategory(tariffRules);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Fare is picked by vehicle type at handover; add a rule per type.
        </p>
        <FormDialog
          trigger={<Button size="sm" disabled={!vehicleTypes.length}>+ Tariff Rule</Button>}
          title="New tariff rule"
          action={createTariffRule}
          submitLabel="Create"
        >
          <TariffRuleFields vehicleTypes={vehicleTypes} />
        </FormDialog>
      </div>

      <div className="glass-card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="p-3 font-medium">Vehicle type</th>
              <th className="p-3 font-medium">Pricing</th>
              <th className="p-3 font-medium">Rate</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {groups.map(({ category, current, upcoming }) => (
              <tr key={category} className="border-b border-border last:border-0">
                <td className="p-3 capitalize">{category}</td>
                <td className="p-3 capitalize">{current?.pricing_type ?? "—"}</td>
                <td className="p-3">
                  {current ? (
                    <span className="font-numeric">{formatRate(current)}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                  {upcoming.map((rule) => (
                    <p key={rule.id} className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      Scheduled: {formatRate(rule)} ({rule.pricing_type}) from{" "}
                      {new Date(rule.effective_from).toLocaleDateString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                      <DeleteButton
                        title={`scheduled ${category} tariff`}
                        action={deleteTariffRule}
                        hiddenFields={{ id: rule.id }}
                      />
                    </p>
                  ))}
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-2">
                    {current && (
                      <FormDialog
                        trigger={
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        }
                        title={`Edit ${category} tariff`}
                        action={updateTariffRule}
                        submitLabel="Save"
                      >
                        <input type="hidden" name="id" value={current.id} />
                        <TariffRuleFields
                          vehicleTypes={vehicleTypes}
                          lockedVehicleCategory={category}
                          initial={{
                            pricing_type: current.pricing_type as "flat" | "hourly" | "surge" | "slab",
                            rate: current.rate,
                            surge_multiplier: current.surge_multiplier,
                            slab_tiers: current.slab_tiers,
                          }}
                        />
                      </FormDialog>
                    )}
                    {current && (
                      <DeleteButton
                        title={`${category} tariff`}
                        action={deleteTariffRule}
                        hiddenFields={{ id: current.id }}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!groups.length && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">
                  No tariff rules yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
