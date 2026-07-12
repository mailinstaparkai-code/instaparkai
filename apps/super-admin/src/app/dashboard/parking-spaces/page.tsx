import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOrganization } from "./actions";
import { OrganizationNode } from "./tree";
import type { Organization } from "./types";

export default async function ParkingSpacesPage() {
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

  const { data: organizations } = await supabase
    .from("organizations")
    .select(
      "id, name, parking_spaces(id, name, type, address, latitude, longitude, timezone, " +
        "zones(id, name, slots(id, slot_number, category, is_ev, is_disabled_slot, status)), " +
        "access_workflows(id, methods), " +
        "tariff_rules(id, vehicle_category, pricing_type, rate, surge_multiplier))"
    )
    .order("name")
    .returns<Organization[]>();

  return (
    <div className="min-h-dvh bg-background p-8 text-foreground">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Parking Spaces</h1>
            <p className="text-sm text-muted-foreground">
              Organization → Parking Space → Zone → Slot
            </p>
          </div>
          <Link href="/dashboard" className="text-sm text-brand-orange">
            Back to dashboard
          </Link>
        </div>

        {isSuperAdmin && (
          <details className="glass-card p-4">
            <summary className="cursor-pointer text-sm text-brand-orange">
              + New organization
            </summary>
            <form action={createOrganization} className="mt-3 flex items-end gap-2">
              <div className="flex flex-col gap-1">
                <Label>Name</Label>
                <Input name="name" required />
              </div>
              <Button type="submit" size="sm">
                Create
              </Button>
            </form>
          </details>
        )}

        <div className="flex flex-col gap-4">
          {organizations?.map((org) => (
            <OrganizationNode key={org.id} org={org} isSuperAdmin={isSuperAdmin} />
          ))}
          {!organizations?.length && (
            <p className="text-sm text-muted-foreground">
              No organizations yet.
              {isSuperAdmin ? " Create one above to get started." : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
