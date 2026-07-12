"use client";

import { MessageCircle, Phone, Mail } from "lucide-react";
import type { Channel, TriggerKey } from "@/lib/communication-triggers";
import { ConfigureTriggerDialog } from "./configure-trigger-dialog";
import { TestMessageDialog } from "./test-message-dialog";

const CHANNEL_META: Record<Channel, { label: string; icon: typeof MessageCircle; bg: string; color: string }> = {
  whatsapp: { label: "WhatsApp", icon: MessageCircle, bg: "bg-status-success/15", color: "text-status-success" },
  sms: { label: "SMS", icon: Phone, bg: "bg-status-info/15", color: "text-status-info" },
  email: { label: "Email", icon: Mail, bg: "bg-brand-orange/15", color: "text-brand-orange" },
};

type TriggerRow = {
  enabled: boolean;
  template: string | null;
  subject: string | null;
  provider_reference: string | null;
} | null;

export function ChannelRow({
  triggerKey,
  triggerLabel,
  channel,
  variables,
  row,
  statusText,
  meaningfullyConfigured,
}: {
  triggerKey: TriggerKey;
  triggerLabel: string;
  channel: Channel;
  variables: string[];
  row: TriggerRow;
  statusText: string;
  meaningfullyConfigured: boolean;
}) {
  const meta = CHANNEL_META[channel];
  const isOn = row?.enabled ?? false;

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5">
      <div className="flex items-center gap-2.5">
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${meta.bg}`}>
          <meta.icon className={`size-4 ${meta.color}`} />
        </span>
        <div>
          <p className="flex items-center gap-1.5 text-sm font-medium">
            {meta.label}
            {isOn && (
              <span className="flex items-center gap-1 text-xs font-medium text-status-success">
                <span className="size-1.5 rounded-full bg-status-success" /> ON
              </span>
            )}
          </p>
          {!isOn && <p className="text-xs text-muted-foreground">{statusText}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <ConfigureTriggerDialog
          triggerKey={triggerKey}
          triggerLabel={triggerLabel}
          channel={channel}
          variables={variables}
          row={row}
        />
        <TestMessageDialog
          triggerKey={triggerKey}
          channel={channel}
          disabled={!meaningfullyConfigured}
        />
      </div>
    </div>
  );
}
