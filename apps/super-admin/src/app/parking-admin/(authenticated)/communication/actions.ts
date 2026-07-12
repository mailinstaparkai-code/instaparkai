"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { getValetSession } from "@/lib/valet-auth/session";

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
