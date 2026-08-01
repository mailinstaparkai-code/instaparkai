import { CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "../parking-spaces/components/parking-space-fields";
import { FormDialog } from "../parking-spaces/components/form-dialog";
import { DeleteButton } from "../parking-spaces/components/delete-button";
import { createPlan, updatePlan, setPlanActive, deletePlan } from "./actions";

type PlanRow = {
  id: string;
  name: string;
  max_locations: number;
  is_active: boolean;
  organizations: { count: number }[];
};

export default async function SubscriptionPlansPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  const isSuperAdmin = profile?.role === "super_admin";

  const { data: plans } = await supabase
    .from("subscription_plans")
    .select("id, name, max_locations, is_active, organizations(count)")
    .order("max_locations")
    .returns<PlanRow[]>();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Subscription Plans</h1>
          <p className="text-sm text-muted-foreground">
            Caps how many parking spaces (locations) each organization may have. No
            billing is wired up -- this is a structural cap only.
          </p>
        </div>

        {isSuperAdmin && (
          <FormDialog
            trigger={<Button>+ New Plan</Button>}
            title="New subscription plan"
            action={createPlan}
            submitLabel="Create"
          >
            <Field label="Name">
              <Input name="name" required placeholder="Pro" />
            </Field>
            <Field label="Max locations">
              <Input name="max_locations" type="number" min={1} required />
            </Field>
          </FormDialog>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans?.map((plan) => {
          const orgCount = plan.organizations[0]?.count ?? 0;
          return (
            <div key={plan.id} className="glass-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground [&_svg]:size-5">
                    <CreditCard />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{plan.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      Up to {plan.max_locations} location{plan.max_locations === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                {!plan.is_active && (
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    Inactive
                  </span>
                )}
              </div>

              <div className="mt-4 flex gap-4 border-t border-border pt-3">
                <div>
                  <p className="font-numeric text-lg">{orgCount}</p>
                  <p className="text-xs text-muted-foreground">
                    Organization{orgCount === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              {isSuperAdmin && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                  <FormDialog
                    trigger={
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    }
                    title="Edit plan"
                    action={updatePlan}
                  >
                    <input type="hidden" name="id" value={plan.id} />
                    <Field label="Name">
                      <Input name="name" required defaultValue={plan.name} />
                    </Field>
                    <Field label="Max locations">
                      <Input
                        name="max_locations"
                        type="number"
                        min={1}
                        required
                        defaultValue={plan.max_locations}
                      />
                    </Field>
                  </FormDialog>

                  <form action={setPlanActive}>
                    <input type="hidden" name="id" value={plan.id} />
                    <input type="hidden" name="is_active" value={(!plan.is_active).toString()} />
                    <Button variant="outline" size="sm" type="submit">
                      {plan.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </form>

                  <DeleteButton
                    title={plan.name}
                    action={deletePlan}
                    hiddenFields={{ id: plan.id }}
                    consequences={
                      orgCount > 0
                        ? [`${orgCount} organization${orgCount === 1 ? " is" : "s are"} on this plan -- deletion will be blocked until they're reassigned or the plan is deactivated instead.`]
                        : []
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
        {!plans?.length && (
          <p className="text-sm text-muted-foreground">
            No subscription plans yet.
            {isSuperAdmin ? " Create one above to get started." : ""}
          </p>
        )}
      </div>
    </div>
  );
}
