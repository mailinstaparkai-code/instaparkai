import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { getValetSession } from "@/lib/valet-auth/session";
import { Input } from "@/components/ui/input";
import { Field } from "../../components/field";
import { updateCommunicationSettings } from "./actions";
import { SettingsForm } from "./settings-form";

function mask(value: string | null): string {
  if (!value) return "Not set";
  return value.length <= 4 ? "••••" : `•••• ${value.slice(-4)}`;
}

export default async function CommunicationSettingsPage() {
  const session = await getValetSession();
  if (!session || session.role !== "parking_admin") {
    redirect("/parking-admin/login");
  }

  const supabase = createServiceClient();
  const { data: settings } = await supabase
    .from("communication_settings")
    .select("*")
    .eq("parking_space_id", session.assignedSiteId)
    .maybeSingle();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Communication</h1>
        <p className="text-sm text-muted-foreground">
          Configure this site&apos;s own SMS, WhatsApp, and Email credentials to
          automatically send the guest tracking link at check-in.
        </p>
      </div>

      <SettingsForm action={updateCommunicationSettings}>
        <div className="glass-card flex flex-col gap-4 p-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="sms_enabled" defaultChecked={settings?.sms_enabled} />
            SMS (via Twilio)
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={`Account SID (${mask(settings?.twilio_account_sid ?? null)})`}>
              <Input name="twilio_account_sid" placeholder="Leave blank to keep current" />
            </Field>
            <Field label={`Auth token (${mask(settings?.twilio_auth_token ?? null)})`}>
              <Input
                name="twilio_auth_token"
                type="password"
                placeholder="Leave blank to keep current"
              />
            </Field>
            <Field label={`SMS sender number (${mask(settings?.twilio_sms_from ?? null)})`}>
              <Input name="twilio_sms_from" placeholder="+1XXXXXXXXXX" />
            </Field>
          </div>
        </div>

        <div className="glass-card flex flex-col gap-4 p-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="whatsapp_enabled"
              defaultChecked={settings?.whatsapp_enabled}
            />
            WhatsApp (via Twilio)
          </label>
          <p className="text-xs text-muted-foreground">
            Uses the same Twilio account above, plus a WhatsApp-enabled sender number.
          </p>
          <Field label={`WhatsApp sender number (${mask(settings?.twilio_whatsapp_from ?? null)})`}>
            <Input name="twilio_whatsapp_from" placeholder="+1XXXXXXXXXX" />
          </Field>
        </div>

        <div className="glass-card flex flex-col gap-4 p-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="email_enabled" defaultChecked={settings?.email_enabled} />
            Email (via SendGrid)
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={`API key (${mask(settings?.sendgrid_api_key ?? null)})`}>
              <Input
                name="sendgrid_api_key"
                type="password"
                placeholder="Leave blank to keep current"
              />
            </Field>
            <Field label={`From address (${mask(settings?.sendgrid_from_email ?? null)})`}>
              <Input name="sendgrid_from_email" placeholder="noreply@yoursite.com" />
            </Field>
          </div>
        </div>
      </SettingsForm>
    </div>
  );
}
