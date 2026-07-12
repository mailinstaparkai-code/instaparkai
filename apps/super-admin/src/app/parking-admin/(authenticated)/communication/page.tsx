import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { getValetSession } from "@/lib/valet-auth/session";
import { TRIGGER_KEYS } from "@/lib/communication-triggers";
import { StatCards } from "./components/stat-cards";
import { TabBar } from "./components/tab-bar";
import { TriggersPanel } from "./components/triggers-panel";
import { MessageLogTable } from "./components/message-log-table";
import { SettingsPanel } from "./components/settings-panel";

const TABS = ["triggers", "log", "settings"] as const;
type Tab = (typeof TABS)[number];

const SETTINGS_CHANNELS = ["whatsapp", "sms", "email"] as const;
type SettingsChannel = (typeof SETTINGS_CHANNELS)[number];

export default async function CommunicationPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; channel?: string }>;
}) {
  const session = await getValetSession();
  if (!session || session.role !== "parking_admin") {
    redirect("/parking-admin/login");
  }

  const { tab: tabParam, channel: channelParam } = await searchParams;
  const tab: Tab = TABS.includes(tabParam as Tab) ? (tabParam as Tab) : "triggers";
  const channel: SettingsChannel = SETTINGS_CHANNELS.includes(channelParam as SettingsChannel)
    ? (channelParam as SettingsChannel)
    : "whatsapp";

  const supabase = createServiceClient();
  const siteId = session.assignedSiteId;

  const [
    { data: commSettings },
    { data: triggerRows },
    { count: totalCount },
    { count: sentCount },
    { count: failedCount },
    logResult,
  ] = await Promise.all([
    supabase.from("communication_settings").select("*").eq("parking_space_id", siteId).maybeSingle(),
    supabase.from("communication_trigger_settings").select("*").eq("parking_space_id", siteId),
    supabase
      .from("communication_messages")
      .select("id", { count: "exact", head: true })
      .eq("parking_space_id", siteId),
    supabase
      .from("communication_messages")
      .select("id", { count: "exact", head: true })
      .eq("parking_space_id", siteId)
      .eq("status", "sent"),
    supabase
      .from("communication_messages")
      .select("id", { count: "exact", head: true })
      .eq("parking_space_id", siteId)
      .eq("status", "failed"),
    tab === "log"
      ? supabase
          .from("communication_messages")
          .select("*")
          .eq("parking_space_id", siteId)
          .order("created_at", { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [] }),
  ]);

  const activeTriggers = (triggerRows ?? []).filter((r) => r.enabled).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Communication</h1>
        <p className="text-sm text-muted-foreground">
          WhatsApp · SMS · Email — one trigger, per-channel settings
        </p>
      </div>

      <StatCards
        total={totalCount ?? 0}
        sent={sentCount ?? 0}
        failed={failedCount ?? 0}
        activeTriggers={activeTriggers}
      />

      <TabBar
        active={tab}
        channel={channel}
        triggersCount={TRIGGER_KEYS.length}
        logCount={totalCount ?? 0}
      />

      {tab === "triggers" && (
        <TriggersPanel triggerRows={triggerRows ?? []} commSettings={commSettings} />
      )}

      {tab === "log" && <MessageLogTable rows={logResult.data ?? []} />}

      {tab === "settings" && <SettingsPanel channel={channel} settings={commSettings} />}
    </div>
  );
}
