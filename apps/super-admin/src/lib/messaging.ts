import "server-only";

export type CommunicationSettings = {
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  email_enabled: boolean;
  twilio_account_sid: string | null;
  twilio_auth_token: string | null;
  twilio_sms_from: string | null;
  twilio_whatsapp_from: string | null;
  sendgrid_api_key: string | null;
  sendgrid_from_email: string | null;
};

type SendResult = { ok: true } | { ok: false; error: string };

// Indian 10-digit mobile numbers are the norm in this app's check-in form (no country
// code field) -- normalize to E.164 for Twilio, which requires it.
export function toE164Phone(raw: string, defaultCountryCode = "+91"): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) return trimmed;
  return `${defaultCountryCode}${trimmed.replace(/\D/g, "")}`;
}

async function sendTwilioMessage(
  settings: CommunicationSettings,
  from: string,
  to: string,
  body: string
): Promise<SendResult> {
  if (!settings.twilio_account_sid || !settings.twilio_auth_token) {
    return { ok: false, error: "Twilio not configured" };
  }

  const auth = Buffer.from(`${settings.twilio_account_sid}:${settings.twilio_auth_token}`).toString(
    "base64"
  );
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${settings.twilio_account_sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: from, To: to, Body: body }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Twilio error ${res.status}: ${text.slice(0, 200)}` };
  }
  return { ok: true };
}

export async function sendSms(
  settings: CommunicationSettings,
  toPhone: string,
  body: string
): Promise<SendResult> {
  if (!settings.sms_enabled) return { ok: false, error: "SMS disabled" };
  if (!settings.twilio_sms_from) return { ok: false, error: "SMS sender not configured" };
  return sendTwilioMessage(settings, settings.twilio_sms_from, toE164Phone(toPhone), body);
}

// WhatsApp goes through Twilio's WhatsApp API (same account, a separate
// WhatsApp-enabled sender number) rather than a second, unverified provider (AiSensy)
// -- one credential set covers both SMS and WhatsApp channels.
export async function sendWhatsApp(
  settings: CommunicationSettings,
  toPhone: string,
  body: string
): Promise<SendResult> {
  if (!settings.whatsapp_enabled) return { ok: false, error: "WhatsApp disabled" };
  if (!settings.twilio_whatsapp_from) return { ok: false, error: "WhatsApp sender not configured" };
  return sendTwilioMessage(
    settings,
    `whatsapp:${settings.twilio_whatsapp_from}`,
    `whatsapp:${toE164Phone(toPhone)}`,
    body
  );
}

export async function sendEmail(
  settings: CommunicationSettings,
  toEmail: string,
  subject: string,
  body: string
): Promise<SendResult> {
  if (!settings.email_enabled) return { ok: false, error: "Email disabled" };
  if (!settings.sendgrid_api_key || !settings.sendgrid_from_email) {
    return { ok: false, error: "Email not configured" };
  }

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.sendgrid_api_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: toEmail }] }],
      from: { email: settings.sendgrid_from_email },
      subject,
      content: [{ type: "text/plain", value: body }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `SendGrid error ${res.status}: ${text.slice(0, 200)}` };
  }
  return { ok: true };
}
