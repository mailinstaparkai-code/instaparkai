-- Valet Phase C remainder: per-site Communication settings (SMS/WhatsApp via Twilio,
-- Email via SendGrid), so the guest tracking link (/track/[token]) can be auto-sent at
-- check-in instead of the Parking Admin copying it manually.
--
-- Each site enters its OWN fresh provider credentials through this UI -- never reused
-- from any third-party reference material. Same access model as valet_accounts: these
-- are real secrets, so RLS is enabled with no policies (deny-all for anon/authenticated)
-- and all access goes through server-side code using the service-role client.

create table public.communication_settings (
  id uuid primary key default gen_random_uuid(),
  parking_space_id uuid not null unique references public.parking_spaces (id) on delete cascade,

  sms_enabled boolean not null default false,
  whatsapp_enabled boolean not null default false,
  email_enabled boolean not null default false,

  -- Twilio covers both SMS and WhatsApp (WhatsApp needs a separate WhatsApp-enabled
  -- sender number on the same account) -- one provider/credential set for both
  -- channels rather than a second unverified integration.
  twilio_account_sid text,
  twilio_auth_token text,
  twilio_sms_from text,
  twilio_whatsapp_from text,

  sendgrid_api_key text,
  sendgrid_from_email text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger communication_settings_set_updated_at before update on public.communication_settings
  for each row execute function public.set_updated_at();

alter table public.communication_settings enable row level security;
