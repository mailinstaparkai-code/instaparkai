import Image from "next/image";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { getValetSession } from "@/lib/valet-auth/session";
import { getDashboardSummary } from "@/lib/parking-admin/dashboard";
import { Car, ListOrdered, CircleCheckBig, Clock } from "lucide-react";
import { MyStatusToggle } from "./my-status-toggle";
import { setMyStatus } from "./actions";

export default async function MobileDashboardPage() {
  const session = await getValetSession();
  if (!session) return null;

  const supabase = createServiceClient();
  const summary = await getDashboardSummary(supabase, session);

  const kpis = [
    { label: "Active vehicles", value: summary.kpis.activeVehicles, icon: Car },
    { label: "Arrived", value: summary.kpis.arrived, icon: ListOrdered },
    { label: "Completed today", value: summary.kpis.completedToday, icon: CircleCheckBig },
    {
      label: "Avg turnaround",
      value: summary.kpis.avgTurnaroundMinutes !== null ? `${summary.kpis.avgTurnaroundMinutes}m` : "—",
      icon: Clock,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="relative -mx-4 -mt-4 h-44 overflow-hidden">
        <Image
          src="/img/valet-hero-mobile.webp"
          alt=""
          fill
          className="object-cover object-right-top"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h1 className="text-xl font-semibold">
            Good morning, {session.fullName || session.username} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            {summary.siteName ?? "Your site"}
            {summary.valetParkingEnabled && (
              <span className="ml-2 rounded-full bg-status-success/15 px-2 py-0.5 text-xs font-medium text-status-success">
                Valet enabled
              </span>
            )}
          </p>
        </div>
      </div>

      {session.role === "valet_operator" && (
        <MyStatusToggle status={summary.myDailyStatus.status} action={setMyStatus} />
      )}

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
