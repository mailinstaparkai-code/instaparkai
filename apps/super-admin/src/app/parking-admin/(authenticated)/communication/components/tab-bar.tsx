import Link from "next/link";

const TABS = [
  { key: "triggers", label: "Triggers" },
  { key: "log", label: "Message Log" },
  { key: "settings", label: "Settings" },
] as const;

export function TabBar({
  active,
  channel,
  triggersCount,
  logCount,
}: {
  active: "triggers" | "log" | "settings";
  channel: string;
  triggersCount: number;
  logCount: number;
}) {
  const counts: Record<string, number> = { triggers: triggersCount, log: logCount };

  return (
    <div className="flex gap-6 border-b border-border">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        const href =
          tab.key === "settings"
            ? `/parking-admin/communication?tab=settings&channel=${channel}`
            : `/parking-admin/communication?tab=${tab.key}`;
        return (
          <Link
            key={tab.key}
            href={href}
            className={`flex items-center gap-1.5 border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
              isActive
                ? "border-brand-orange text-brand-orange"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {counts[tab.key] !== undefined && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                {counts[tab.key]}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
