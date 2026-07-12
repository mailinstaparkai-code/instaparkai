import Link from "next/link";
import { MessageCircle, Phone, Mail, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Field } from "../../../components/field";
import { updateCommunicationSettings } from "../actions";
import { SettingsForm } from "../settings-form";

type Channel = "whatsapp" | "sms" | "email";

type Settings = {
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  email_enabled: boolean;
  twilio_account_sid: string | null;
  twilio_auth_token: string | null;
  twilio_sms_from: string | null;
  twilio_whatsapp_from: string | null;
  sendgrid_api_key: string | null;
  sendgrid_from_email: string | null;
} | null;

const CHANNEL_TABS: { key: Channel; label: string; icon: typeof MessageCircle }[] = [
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { key: "sms", label: "SMS", icon: Phone },
  { key: "email", label: "Email", icon: Mail },
];

function mask(value: string | null): string {
  if (!value) return "Not set";
  return value.length <= 4 ? "••••" : `•••• ${value.slice(-4)}`;
}

export function SettingsPanel({ channel, settings }: { channel: Channel; settings: Settings }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {CHANNEL_TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/parking-admin/communication?tab=settings&channel=${tab.key}`}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              channel === tab.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </Link>
        ))}
      </div>

      {channel === "whatsapp" && (
        <SettingsForm action={updateCommunicationSettings} submitLabel="Save Integration">
          <ConnectionCard
            icon={MessageCircle}
            title="WhatsApp Connection"
            description="Shared Twilio credentials — every trigger's template is set individually on the Triggers tab."
            configured={!!(settings?.twilio_account_sid && settings?.twilio_whatsapp_from)}
            switchName="whatsapp_enabled"
            defaultChecked={settings?.whatsapp_enabled}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={`Account SID (${mask(settings?.twilio_account_sid ?? null)})`}>
              <Input name="twilio_account_sid" placeholder="Leave blank to keep current" />
            </Field>
            <Field label={`Auth token (${mask(settings?.twilio_auth_token ?? null)})`}>
              <Input name="twilio_auth_token" type="password" placeholder="Leave blank to keep current" />
            </Field>
            <Field label={`WhatsApp sender number (${mask(settings?.twilio_whatsapp_from ?? null)})`}>
              <Input name="twilio_whatsapp_from" placeholder="+1XXXXXXXXXX" />
            </Field>
          </div>
          <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            Uses the same Twilio account as SMS, plus a separate WhatsApp-enabled sender
            number.
          </p>
          <HiddenChannelState settings={settings} exclude="whatsapp_enabled" />
        </SettingsForm>
      )}

      {channel === "sms" && (
        <SettingsForm action={updateCommunicationSettings} submitLabel="Save Integration">
          <ConnectionCard
            icon={Phone}
            title="SMS Connection"
            description="Shared Twilio credentials — every trigger's template is set individually on the Triggers tab."
            configured={!!(settings?.twilio_account_sid && settings?.twilio_sms_from)}
            switchName="sms_enabled"
            defaultChecked={settings?.sms_enabled}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={`Account SID (${mask(settings?.twilio_account_sid ?? null)})`}>
              <Input name="twilio_account_sid" placeholder="Leave blank to keep current" />
            </Field>
            <Field label={`Auth token (${mask(settings?.twilio_auth_token ?? null)})`}>
              <Input name="twilio_auth_token" type="password" placeholder="Leave blank to keep current" />
            </Field>
            <Field label={`SMS sender number (${mask(settings?.twilio_sms_from ?? null)})`}>
              <Input name="twilio_sms_from" placeholder="+1XXXXXXXXXX" />
            </Field>
          </div>
          <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            Trial Twilio accounts can only text phone numbers verified in the Twilio
            console — verify your test number there before sending a test.
          </p>
          <HiddenChannelState settings={settings} exclude="sms_enabled" />
        </SettingsForm>
      )}

      {channel === "email" && (
        <SettingsForm action={updateCommunicationSettings} submitLabel="Save Integration">
          <ConnectionCard
            icon={Mail}
            title="Email Connection"
            description="Shared SendGrid credentials — every trigger's subject & template are set individually on the Triggers tab."
            configured={!!(settings?.sendgrid_api_key && settings?.sendgrid_from_email)}
            switchName="email_enabled"
            defaultChecked={settings?.email_enabled}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={`API key (${mask(settings?.sendgrid_api_key ?? null)})`}>
              <Input name="sendgrid_api_key" type="password" placeholder="Leave blank to keep current" />
            </Field>
            <Field label={`From address (${mask(settings?.sendgrid_from_email ?? null)})`}>
              <Input name="sendgrid_from_email" placeholder="noreply@yoursite.com" />
            </Field>
          </div>
          <HiddenChannelState settings={settings} exclude="email_enabled" />
        </SettingsForm>
      )}
    </div>
  );
}

function ConnectionCard({
  icon: Icon,
  title,
  description,
  configured,
  switchName,
  defaultChecked,
}: {
  icon: typeof MessageCircle;
  title: string;
  description: string;
  configured: boolean;
  switchName: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="glass-card flex items-center justify-between gap-4 p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-status-success/15">
          <Icon className="size-4 text-status-success" />
        </span>
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            {title}
            {configured && (
              <span className="flex items-center gap-1 text-xs font-medium text-status-success">
                <ShieldCheck className="size-3.5" /> Configured
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch key={String(defaultChecked)} name={switchName} defaultChecked={defaultChecked} />
    </div>
  );
}

// updateCommunicationSettings reads sms_enabled/whatsapp_enabled/email_enabled directly
// from the submitted FormData with no "keep existing" fallback (unlike the secret
// fields) -- without carrying the other two channels' current values through as hidden
// inputs, saving one channel's panel would silently disable the other two.
function HiddenChannelState({ settings, exclude }: { settings: Settings; exclude: string }) {
  const fields: { name: string; enabled?: boolean }[] = [
    { name: "sms_enabled", enabled: settings?.sms_enabled },
    { name: "whatsapp_enabled", enabled: settings?.whatsapp_enabled },
    { name: "email_enabled", enabled: settings?.email_enabled },
  ];
  return (
    <>
      {fields
        .filter((f) => f.name !== exclude)
        .map((f) => (
          <input key={f.name} type="hidden" name={f.name} value={f.enabled ? "on" : ""} />
        ))}
    </>
  );
}
