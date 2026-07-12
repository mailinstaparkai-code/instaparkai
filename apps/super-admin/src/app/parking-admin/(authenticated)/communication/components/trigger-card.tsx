import { CHANNELS, type Channel, type TriggerKey } from "@/lib/communication-triggers";
import { ChannelRow } from "./channel-row";

type TriggerRow = {
  trigger_key: string;
  channel: Channel;
  enabled: boolean;
  template: string | null;
  subject: string | null;
  provider_reference: string | null;
} | null;

function statusText(channel: Channel, row: TriggerRow): string {
  if (row?.enabled) return "ON";
  if (channel === "whatsapp") return row?.provider_reference ? "Template configured" : "No campaign set";
  if (channel === "email") return row?.subject ? "Template configured" : "No subject set";
  return row?.template ? "Template configured" : "No template set";
}

export function TriggerCard({
  triggerKey,
  label,
  description,
  variables,
  rows,
  channelMasterOn,
}: {
  triggerKey: TriggerKey;
  label: string;
  description: string;
  variables: string[];
  rows: TriggerRow[];
  channelMasterOn: Record<Channel, boolean>;
}) {
  return (
    <div className="glass-card flex flex-col gap-3 p-4">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-col gap-2">
        {CHANNELS.map((channel, i) => {
          const row = rows[i];
          const meaningfullyConfigured = !!(row?.enabled && row?.template) && channelMasterOn[channel];
          return (
            <ChannelRow
              key={channel}
              triggerKey={triggerKey}
              triggerLabel={label}
              channel={channel}
              variables={variables}
              row={row}
              statusText={statusText(channel, row)}
              meaningfullyConfigured={meaningfullyConfigured}
            />
          );
        })}
      </div>
    </div>
  );
}
