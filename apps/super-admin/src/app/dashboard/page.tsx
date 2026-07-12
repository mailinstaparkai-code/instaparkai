import { createClient } from "@/lib/supabase/server";
import {
  ParkingSquare,
  CircleParking,
  CircleCheckBig,
  IndianRupee,
  Car,
  Clock,
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .single();

  const { data: slots } = await supabase.from("slots").select("status");
  const total = slots?.length ?? 0;
  const occupied = slots?.filter((s) => s.status === "occupied").length ?? 0;
  const available = slots?.filter((s) => s.status === "available").length ?? 0;

  const kpis = [
    { label: "Total Slots", value: total.toLocaleString(), icon: ParkingSquare },
    { label: "Occupied", value: occupied.toLocaleString(), icon: CircleParking },
    { label: "Available", value: available.toLocaleString(), icon: CircleCheckBig },
    { label: "Revenue Today", value: "—", icon: IndianRupee },
    { label: "Vehicles Today", value: "—", icon: Car },
    { label: "Avg Stay Duration", value: "—", icon: Clock },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">
          Good morning, {profile?.full_name || "there"} 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening across your sites.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="glass-card p-4">
            <kpi.icon className="size-5 text-brand-orange" />
            <p className="mt-3 font-numeric text-2xl">{kpi.value}</p>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
