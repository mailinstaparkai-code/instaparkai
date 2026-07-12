import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { getValetSession } from "@/lib/valet-auth/session";
import { ParkingSquare, Car, CircleCheckBig, Clock } from "lucide-react";

export default async function ParkingAdminDashboardPage() {
  const session = await getValetSession();
  if (!session) {
    redirect("/parking-admin/login");
  }

  const supabase = createServiceClient();
  const { data: site } = await supabase
    .from("parking_spaces")
    .select("name, valet_parking_enabled")
    .eq("id", session.assignedSiteId)
    .single();

  const kpis = [
    { label: "Self-drive", value: "—", icon: ParkingSquare },
    { label: "Valet", value: "—", icon: Car },
    { label: "Arrived", value: "—", icon: CircleCheckBig },
    { label: "Avg Turnaround", value: "—", icon: Clock },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">
          Good morning, {session.fullName || session.username} 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          {site?.name ?? "Your site"}
          {site?.valet_parking_enabled && (
            <span className="ml-2 rounded-full bg-status-success/15 px-2 py-0.5 text-xs font-medium text-status-success">
              Valet enabled
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="glass-card p-4">
            <kpi.icon className="size-5 text-brand-orange" />
            <p className="mt-3 font-numeric text-2xl">{kpi.value}</p>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        Live queue, vehicle check-in, and valet operator management are coming in the next
        build phase.
      </p>
    </div>
  );
}
