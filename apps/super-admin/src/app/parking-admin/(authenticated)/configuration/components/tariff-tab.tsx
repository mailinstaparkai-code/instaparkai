import { Button } from "@/components/ui/button";
import { FormDialog } from "../../../components/form-dialog";
import { DeleteButton } from "../../../components/delete-button";
import { createTariffRule, deleteTariffRule } from "../actions";
import { TariffRuleFields } from "./tariff-rule-fields";

type TariffRule = {
  id: string;
  vehicle_category: string;
  pricing_type: string;
  rate: number;
  surge_multiplier: number | null;
};

export function TariffTab({
  tariffRules,
  vehicleTypes,
}: {
  tariffRules: TariffRule[];
  vehicleTypes: { id: string; name: string }[];
}) {
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
            {tariffRules.map((rule) => (
              <tr key={rule.id} className="border-b border-border last:border-0">
                <td className="p-3 capitalize">{rule.vehicle_category}</td>
                <td className="p-3 capitalize">{rule.pricing_type}</td>
                <td className="p-3">
                  {rule.pricing_type === "slab" ? (
                    "Tiered"
                  ) : (
                    <>
                      <span className="font-numeric">₹{rule.rate}</span>
                      {rule.pricing_type === "surge" && rule.surge_multiplier
                        ? ` × ${rule.surge_multiplier}`
                        : ""}
                    </>
                  )}
                </td>
                <td className="p-3">
                  <DeleteButton
                    title={`${rule.vehicle_category} tariff`}
                    action={deleteTariffRule}
                    hiddenFields={{ id: rule.id }}
                  />
                </td>
              </tr>
            ))}
            {!tariffRules.length && (
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
