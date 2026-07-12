"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "../../../components/field";
import { FormDialog } from "../../../components/form-dialog";
import type { Channel, TriggerKey } from "@/lib/communication-triggers";
import { updateTriggerSetting } from "../actions";

type TriggerRow = {
  enabled: boolean;
  template: string | null;
  subject: string | null;
  provider_reference: string | null;
} | null;

const CHANNEL_LABEL: Record<Channel, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
};

export function ConfigureTriggerDialog({
  triggerKey,
  triggerLabel,
  channel,
  variables,
  row,
}: {
  triggerKey: TriggerKey;
  triggerLabel: string;
  channel: Channel;
  variables: string[];
  row: TriggerRow;
}) {
  return (
    <FormDialog
      trigger={
        <Button variant="outline" size="sm">
          Configure
        </Button>
      }
      title={triggerLabel}
      action={updateTriggerSetting}
      submitLabel="Save"
    >
      <p className="-mt-2 text-xs text-muted-foreground">{CHANNEL_LABEL[channel]} channel settings</p>
      <input type="hidden" name="trigger_key" value={triggerKey} />
      <input type="hidden" name="channel" value={channel} />

      <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
        <span className="text-sm font-medium">Enabled</span>
        <Switch key={String(row?.enabled)} name="enabled" defaultChecked={row?.enabled} />
      </div>

      {channel === "whatsapp" && (
        <Field label="Twilio Content Template SID (optional)">
          <Input
            name="provider_reference"
            defaultValue={row?.provider_reference ?? ""}
            placeholder="HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          />
        </Field>
      )}

      {channel === "email" && (
        <Field label="Subject">
          <Input name="subject" defaultValue={row?.subject ?? ""} placeholder={triggerLabel} />
        </Field>
      )}

      <Field label="Template">
        <Textarea name="template" rows={5} defaultValue={row?.template ?? ""} />
      </Field>
      <p className="text-xs text-muted-foreground">
        Variables: {variables.map((v) => `{{${v}}}`).join(", ")}
      </p>
    </FormDialog>
  );
}
