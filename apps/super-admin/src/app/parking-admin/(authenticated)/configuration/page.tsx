import { redirect } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentSiteId, getValetSession } from "@/lib/valet-auth/session";
import { listQrCodes } from "@/lib/parking-admin/qr-codes";
import { ZonesSlotsTab } from "./components/zones-slots-tab";
import { VehicleTypesTab } from "./components/vehicle-types-tab";
import { TariffTab } from "./components/tariff-tab";
import { GuestRequestsTab } from "./components/guest-requests-tab";

const TABS = [
  { key: "zones", label: "Zones & Slots" },
  { key: "vehicle-types", label: "Vehicle Types" },
  { key: "tariffs", label: "Payments" },
  { key: "requests", label: "Vehicle Requests" },
] as const;
type Tab = (typeof TABS)[number]["key"];

export default async function ConfigurationPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getValetSession();
  if (!session) {
    redirect("/parking-admin/login");
  }
  if (session.role !== "parking_admin") {
    redirect("/parking-admin/dashboard");
  }

  const { tab: tabParam } = await searchParams;
  const tab: Tab = TABS.some((t) => t.key === tabParam) ? (tabParam as Tab) : "zones";

  const supabase = createServiceClient();

  const [{ data: zones }, { data: vehicleTypes }, { data: tariffRules }, { data: site }, qrCodes] =
    await Promise.all([
      supabase
        .from("zones")
        .select("id, name, slots(id, slot_number, is_ev, is_disabled_slot, status)")
        .eq("parking_space_id", getCurrentSiteId(session))
        .order("name"),
      supabase
        .from("vehicle_types")
        .select("id, name")
        .eq("parking_space_id", getCurrentSiteId(session))
        .order("name"),
      supabase
        .from("tariff_rules")
        .select("id, vehicle_category, pricing_type, rate, surge_multiplier, slab_tiers")
        .eq("parking_space_id", getCurrentSiteId(session))
        .order("vehicle_category"),
      supabase
        .from("parking_spaces")
        .select("guest_request_mode")
        .eq("id", getCurrentSiteId(session))
        .single(),
      listQrCodes(supabase, session),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Configuration</h1>
        <p className="text-sm text-muted-foreground">
          Zones, slots, vehicle types, and pricing for your site
        </p>
      </div>

      <div className="flex gap-6 border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/parking-admin/configuration?tab=${t.key}`}
            className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-brand-orange text-brand-orange"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "zones" && <ZonesSlotsTab zones={zones ?? []} />}
      {tab === "vehicle-types" && <VehicleTypesTab vehicleTypes={vehicleTypes ?? []} />}
      {tab === "tariffs" && (
        <TariffTab tariffRules={tariffRules ?? []} vehicleTypes={vehicleTypes ?? []} />
      )}
      {tab === "requests" && (
        <GuestRequestsTab
          guestRequestMode={(site?.guest_request_mode as "link" | "qr" | undefined) ?? "link"}
          qrCodes={qrCodes}
        />
      )}
    </div>
  );
}
