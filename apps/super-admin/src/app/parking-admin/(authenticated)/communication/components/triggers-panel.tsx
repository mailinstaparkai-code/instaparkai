import { TRIGGER_KEYS, TRIGGER_DEFINITIONS, CHANNELS, type Channel } from "@/lib/communication-triggers";
import { TriggerCard } from "./trigger-card";

type TriggerRow = {
  trigger_key: string;
  channel: Channel;
  enabled: boolean;
  template: string | null;
  subject: string | null;
  provider_reference: string | null;
};

type Settings = {
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  email_enabled: boolean;
} | null;

export function TriggersPanel({
  triggerRows,
  commSettings,
}: {
  triggerRows: TriggerRow[];
  commSettings: Settings;
}) {
  const channelMasterOn: Record<Channel, boolean> = {
    sms: commSettings?.sms_enabled ?? false,
    whatsapp: commSettings?.whatsapp_enabled ?? false,
    email: commSettings?.email_enabled ?? false,
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {TRIGGER_KEYS.map((triggerKey) => {
        const definition = TRIGGER_DEFINITIONS[triggerKey];
        const rows = CHANNELS.map(
          (channel) =>
            triggerRows.find((r) => r.trigger_key === triggerKey && r.channel === channel) ?? null
        );
        return (
          <TriggerCard
            key={triggerKey}
            triggerKey={triggerKey}
            label={definition.label}
            description={definition.description}
            variables={definition.variables}
            rows={rows}
            channelMasterOn={channelMasterOn}
          />
        );
      })}
    </div>
  );
}
