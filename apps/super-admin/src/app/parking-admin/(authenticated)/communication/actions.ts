"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { getValetSession } from "@/lib/valet-auth/session";
import { sendTestMessage as sendTestMessageInternal, type Channel, type TriggerKey } from "@/lib/communication-triggers";

const PATH = "/parking-admin/communication";

async function assertParkingAdmin() {
  const session = await getValetSession();
  if (!session || session.role !== "parking_admin") {
    throw new Error("Parking Admin access required.");
  }
  return session;
}

const SECRET_FIELDS = [
  "twilio_account_sid",
  "twilio_auth_token",
  "twilio_sms_from",
  "twilio_whatsapp_from",
  "sendgrid_api_key",
  "sendgrid_from_email",
] as const;

export async function updateCommunicationSettings(formData: FormData) {
  const session = await assertParkingAdmin();
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("communication_settings")
    .select(SECRET_FIELDS.join(", "))
    .eq("parking_space_id", session.assignedSiteId)
    .maybeSingle<Record<(typeof SECRET_FIELDS)[number], string | null>>();

  // Blank field on submit means "keep the existing value" -- credentials are never
  // echoed back into the form, so an empty submission shouldn't wipe them out.
  const values: Record<string, string | null> = {};
  for (const field of SECRET_FIELDS) {
    const raw = formData.get(field)?.toString().trim();
    values[field] = raw ? raw : (existing?.[field] ?? null);
  }

  const { error } = await supabase.from("communication_settings").upsert(
    {
      parking_space_id: session.assignedSiteId,
      sms_enabled: formData.get("sms_enabled") === "on",
      whatsapp_enabled: formData.get("whatsapp_enabled") === "on",
      email_enabled: formData.get("email_enabled") === "on",
      ...values,
    },
    { onConflict: "parking_space_id" }
  );
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
}

export async function updateTriggerSetting(formData: FormData) {
  const session = await assertParkingAdmin();
  const supabase = createServiceClient();

  const trigger_key = formData.get("trigger_key")?.toString() as TriggerKey | undefined;
  const channel = formData.get("channel")?.toString() as Channel | undefined;
  if (!trigger_key || !channel) return;

  const enabled = formData.get("enabled") === "on";
  const template = formData.get("template")?.toString().trim() || null;
  const subject =
    channel === "email" ? formData.get("subject")?.toString().trim() || null : null;
  const provider_reference =
    channel === "whatsapp" ? formData.get("provider_reference")?.toString().trim() || null : null;

  const { error } = await supabase.from("communication_trigger_settings").upsert(
    {
      parking_space_id: session.assignedSiteId,
      trigger_key,
      channel,
      enabled,
      template,
      subject,
      provider_reference,
    },
    { onConflict: "parking_space_id,trigger_key,channel" }
  );
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
}

export async function sendTestMessage(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await assertParkingAdmin();
  const supabase = createServiceClient();

  const trigger_key = formData.get("trigger_key")?.toString() as TriggerKey | undefined;
  const channel = formData.get("channel")?.toString() as Channel | undefined;
  const recipient = formData.get("recipient")?.toString().trim();
  if (!trigger_key || !channel || !recipient) {
    return { ok: false, error: "Missing recipient." };
  }

  const { data: site } = await supabase
    .from("parking_spaces")
    .select("name")
    .eq("id", session.assignedSiteId)
    .single();

  const result = await sendTestMessageInternal({
    supabase,
    siteId: session.assignedSiteId,
    siteName: site?.name ?? "Valet parking",
    triggerKey: trigger_key,
    channel,
    recipient,
  });

  revalidatePath(PATH);
  return result;
}
