import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { getValetSession } from "@/lib/valet-auth/session";
import { Car, ListOrdered, CircleCheckBig, Clock } from "lucide-react";

export default async function MobileDashboardPage() {
  const session = await getValetSession();
  if (!session) return null;

  const supabase = createServiceClient();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [{ data: site }, { data: tickets }] = await Promise.all([
    supabase
      .from("parking_spaces")
      .select("name, valet_parking_enabled")
      .eq("id", session.assignedSiteId)
      .single(),
    supabase
      .from("valet_tickets")
      .select("status, checked_in_at, completed_at")
      .eq("parking_space_id", session.assignedSiteId)
      .gte("checked_in_at", startOfToday.toISOString()),
  ]);

  const activeCount =
    tickets?.filter((t) => t.status !== "completed" && t.status !== "voided").length ?? 0;
  const arrivedCount = tickets?.filter((t) => t.status === "arrived").length ?? 0;
  const completedToday = tickets?.filter((t) => t.status === "completed") ?? [];

  const avgTurnaroundMinutes = completedToday.length
    ? Math.round(
        completedToday.reduce(
          (sum, t) =>
            sum +
            (new Date(t.completed_at!).getTime() - new Date(t.checked_in_at).getTime()) / 60000,
          0
        ) / completedToday.length
      )
    : null;

  const kpis = [
    { label: "Active vehicles", value: activeCount, icon: Car },
    { label: "Arrived", value: arrivedCount, icon: ListOrdered },
    { label: "Completed today", value: completedToday.length, icon: CircleCheckBig },
    {
      label: "Avg turnaround",
      value: avgTurnaroundMinutes !== null ? `${avgTurnaroundMinutes}m` : "—",
      icon: Clock,
    },
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

      <div className="grid grid-cols-2 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="glass-card p-4">
            <kpi.icon className="size-5 text-brand-orange" />
            <p className="mt-3 font-numeric text-2xl">{kpi.value}</p>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
          </div>
        ))}
      </div>

      <Link
        href="/parking-admin/m/queue"
        className="glass-card block p-4 text-center text-sm font-medium text-brand-orange"
      >
        Go to Live Queue →
      </Link>
    </div>
  );
}
