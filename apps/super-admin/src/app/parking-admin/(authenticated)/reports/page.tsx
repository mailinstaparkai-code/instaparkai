import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Car,
  Users,
  IndianRupee,
  Clock,
  MapPin,
  Repeat,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { getValetSession } from "@/lib/valet-auth/session";

type ReportCard = {
  title: string;
  description: string;
  icon: LucideIcon;
} & ({ href: string } | { comingSoon: true });

const LIVE_REPORTS: ReportCard[] = [
  {
    title: "Vehicle Transaction Report",
    description: "Every check-in, pickup, dispatch, and handover — with timestamps and operator",
    icon: Activity,
    href: "/parking-admin/reports/vehicle-transactions",
  },
  {
    title: "Vehicle Log",
    description: "One row per ticket, full detail",
    icon: Car,
    href: "/parking-admin/vehicles",
  },
];

const COMING_SOON_REPORTS: ReportCard[] = [
  { title: "Operator Performance", description: "Coming soon", icon: Users, comingSoon: true },
  { title: "Revenue Report", description: "Coming soon", icon: IndianRupee, comingSoon: true },
  { title: "Peak Hours", description: "Coming soon", icon: Clock, comingSoon: true },
  { title: "Slot Utilization", description: "Coming soon", icon: MapPin, comingSoon: true },
  { title: "Repeat Customers", description: "Coming soon", icon: Repeat, comingSoon: true },
  { title: "Cancellation Report", description: "Coming soon", icon: XCircle, comingSoon: true },
];

export default async function ReportsPage() {
  const session = await getValetSession();
  if (!session) {
    redirect("/parking-admin/login");
  }
  if (session.role !== "parking_admin") {
    redirect("/parking-admin/dashboard");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Operational reports across vehicle check-ins, pickups, and transactions
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LIVE_REPORTS.map((report) => (
          <Link
            key={report.title}
            href={"href" in report ? report.href : "#"}
            className="glass-card block p-5 transition-colors hover:border-brand-orange/30"
          >
            <report.icon className="size-5 text-brand-orange" />
            <p className="mt-3 font-medium">{report.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{report.description}</p>
          </Link>
        ))}

        {COMING_SOON_REPORTS.map((report) => (
          <div
            key={report.title}
            aria-disabled="true"
            className="glass-card cursor-not-allowed p-5 opacity-50"
          >
            <report.icon className="size-5 text-muted-foreground" />
            <p className="mt-3 font-medium text-muted-foreground">{report.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{report.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
