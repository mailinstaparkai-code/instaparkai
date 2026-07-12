import { Send, Check, X, Zap } from "lucide-react";

export function StatCards({
  total,
  sent,
  failed,
  activeTriggers,
}: {
  total: number;
  sent: number;
  failed: number;
  activeTriggers: number;
}) {
  const stats = [
    { label: "Total Messages", value: total, icon: Send, color: "text-status-info", bg: "bg-status-info/15" },
    { label: "Sent", value: sent, icon: Check, color: "text-status-success", bg: "bg-status-success/15" },
    { label: "Failed", value: failed, icon: X, color: "text-status-danger", bg: "bg-status-danger/15" },
    {
      label: "Active Triggers",
      value: activeTriggers,
      icon: Zap,
      color: "text-brand-orange",
      bg: "bg-brand-orange/15",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="glass-card flex items-start justify-between p-4">
          <div>
            <p className="font-numeric text-2xl">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
          <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${stat.bg}`}>
            <stat.icon className={`size-4 ${stat.color}`} />
          </span>
        </div>
      ))}
    </div>
  );
}
