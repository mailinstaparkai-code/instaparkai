import "server-only";
import type { createServiceClient } from "@/lib/supabase/service";
import { sendSms, sendWhatsApp, sendEmail, type CommunicationSettings } from "@/lib/messaging";

export const TRIGGER_KEYS = [
  "vehicle_checked_in",
  "pickup_requested",
  "vehicle_in_transit",
  "vehicle_arrived",
  "handover_complete",
] as const;
export type TriggerKey = (typeof TRIGGER_KEYS)[number];

export const CHANNELS = ["whatsapp", "sms", "email"] as const;
export type Channel = (typeof CHANNELS)[number];

export const TRIGGER_DEFINITIONS: Record<
  TriggerKey,
  { label: string; description: string; variables: string[]; defaultTemplate: string }
> = {
  vehicle_checked_in: {
    label: "Vehicle Checked In",
    description: "Sent when a vehicle is checked in and parked.",
    variables: ["vehicleNumber", "vehicleType", "mobileNumber", "siteName", "trackingUrl"],
    defaultTemplate:
      "Your vehicle {{vehicleNumber}} is parked. Track status & request pickup: {{trackingUrl}}",
  },
  pickup_requested: {
    label: "Pickup Requested",
    description: "Sent when a pickup request is made for a parked vehicle.",
    variables: ["vehicleNumber", "siteName", "trackingUrl"],
    defaultTemplate: "We've received your request for {{vehicleNumber}}. Your valet is on the way.",
  },
  vehicle_in_transit: {
    label: "Vehicle In Transit",
    description: "Sent when a valet operator starts bringing the vehicle back.",
    variables: ["vehicleNumber", "siteName", "trackingUrl"],
    defaultTemplate: "{{vehicleNumber}} is on its way to you now.",
  },
  vehicle_arrived: {
    label: "Vehicle Arrived",
    description: "Sent when the vehicle arrives and is ready for handover. Carries the handover OTP.",
    variables: ["vehicleNumber", "siteName", "otp", "trackingUrl"],
    defaultTemplate:
      "{{vehicleNumber}} has arrived. Your handover OTP is {{otp}}. Share this with our valet to collect your vehicle.",
  },
  handover_complete: {
    label: "Handover Complete",
    description: "Sent once the vehicle is handed back and the fare is settled.",
    variables: ["vehicleNumber", "siteName", "fareAmount", "paymentStatus"],
    defaultTemplate:
      "Thanks for parking with us! {{vehicleNumber}} handover complete. Fare: {{fareAmount}} ({{paymentStatus}}).",
  },
};

function substitute(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

type TriggerSettingRow = {
  channel: Channel;
  enabled: boolean;
  template: string | null;
  subject: string | null;
};

// Best-effort: never throws. A messaging failure (bad credentials, provider outage,
// missing config) must never fail the caller's ticket-lifecycle transition.
export async function fireTrigger(args: {
  supabase: ReturnType<typeof createServiceClient>;
  siteId: string;
  triggerKey: TriggerKey;
  ticketId: string;
  mobileNumber: string;
  guestEmail?: string | null;
  variables: Record<string, string>;
}): Promise<void> {
  try {
    const { supabase, siteId, triggerKey, ticketId, mobileNumber, guestEmail, variables } = args;

    const [{ data: commSettings }, { data: triggerRows }] = await Promise.all([
      supabase
        .from("communication_settings")
        .select("*")
        .eq("parking_space_id", siteId)
        .maybeSingle<CommunicationSettings>(),
      supabase
        .from("communication_trigger_settings")
        .select("channel, enabled, template, subject")
        .eq("parking_space_id", siteId)
        .eq("trigger_key", triggerKey)
        .returns<TriggerSettingRow[]>(),
    ]);
    if (!commSettings || !triggerRows?.length) return;

    for (const row of triggerRows) {
      if (!row.enabled || !row.template) continue;

      const channelMasterOn =
        row.channel === "sms"
          ? commSettings.sms_enabled
          : row.channel === "whatsapp"
            ? commSettings.whatsapp_enabled
            : commSettings.email_enabled;
      if (!channelMasterOn) continue;
      if (row.channel === "email" && !guestEmail) continue;

      const body = substitute(row.template, variables);
      const recipient = row.channel === "email" ? guestEmail! : mobileNumber;
      const result =
        row.channel === "sms"
          ? await sendSms(commSettings, mobileNumber, body)
          : row.channel === "whatsapp"
            ? await sendWhatsApp(commSettings, mobileNumber, body)
            : await sendEmail(
                commSettings,
                guestEmail!,
                substitute(row.subject ?? row.template.slice(0, 78), variables),
                body
              );

      await supabase.from("communication_messages").insert({
        parking_space_id: siteId,
        ticket_id: ticketId,
        trigger_key: triggerKey,
        channel: row.channel,
        recipient,
        status: result.ok ? "sent" : "failed",
        error: result.ok ? null : result.error,
      });
    }
  } catch {
    // swallow -- see comment above
  }
}

export async function sendTestMessage(args: {
  supabase: ReturnType<typeof createServiceClient>;
  siteId: string;
  siteName: string;
  triggerKey: TriggerKey;
  channel: Channel;
  recipient: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, siteId, siteName, triggerKey, channel, recipient } = args;

  const [{ data: commSettings }, { data: row }] = await Promise.all([
    supabase
      .from("communication_settings")
      .select("*")
      .eq("parking_space_id", siteId)
      .maybeSingle<CommunicationSettings>(),
    supabase
      .from("communication_trigger_settings")
      .select("template, subject")
      .eq("parking_space_id", siteId)
      .eq("trigger_key", triggerKey)
      .eq("channel", channel)
      .maybeSingle<{ template: string | null; subject: string | null }>(),
  ]);
  if (!commSettings) return { ok: false, error: "Communication settings not configured." };
  if (!row?.template) return { ok: false, error: "No template saved for this channel yet." };

  const sample: Record<string, string> = {
    vehicleNumber: "TEST-1234",
    vehicleType: "car",
    mobileNumber: recipient,
    siteName,
    trackingUrl: "https://example.com/track/test",
    otp: "0000",
    fareAmount: "250",
    paymentStatus: "paid",
  };
  const body = substitute(row.template, sample);
  const result =
    channel === "sms"
      ? await sendSms(commSettings, recipient, body)
      : channel === "whatsapp"
        ? await sendWhatsApp(commSettings, recipient, body)
        : await sendEmail(commSettings, recipient, substitute(row.subject ?? "Test message", sample), body);

  await supabase.from("communication_messages").insert({
    parking_space_id: siteId,
    ticket_id: null,
    trigger_key: triggerKey,
    channel,
    recipient,
    status: result.ok ? "sent" : "failed",
    error: result.ok ? null : result.error,
    is_test: true,
  });

  return result;
}
