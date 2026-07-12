-- Communication redesign: per-(site, trigger, channel) message configuration, plus a
-- send-attempt log. One trigger fires at each valet_ticket lifecycle transition
-- (checked in / requested / in transit / arrived / handover complete); each trigger has
-- an independent enabled/template/subject per channel, sharing the connection
-- credentials already in communication_settings.
--
-- Same access model as communication_settings/valet_accounts: no auth.uid() involved,
-- so RLS is enabled with NO policies (deny-all for anon/authenticated) and all access
-- goes through server-side code using the service-role client, which enforces
-- site-scoping and role checks itself (assertParkingAdmin()).

create type public.communication_trigger_key as enum (
  'vehicle_checked_in',
  'pickup_requested',
  'vehicle_in_transit',
  'vehicle_arrived',
  'handover_complete'
);

create type public.communication_channel as enum ('whatsapp', 'sms', 'email');

create type public.communication_message_status as enum ('sent', 'failed');

create table public.communication_trigger_settings (
  id uuid primary key default gen_random_uuid(),
  parking_space_id uuid not null references public.parking_spaces (id) on delete cascade,
  trigger_key public.communication_trigger_key not null,
  channel public.communication_channel not null,

  enabled boolean not null default false,
  template text,
  subject text,              -- email only
  provider_reference text,   -- whatsapp only; admin-facing note (e.g. a Twilio Content
                              -- Template SID) -- not read by messaging.ts, documentation only

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (parking_space_id, trigger_key, channel)
);

create index communication_trigger_settings_site_idx
  on public.communication_trigger_settings (parking_space_id);

create trigger communication_trigger_settings_set_updated_at
  before update on public.communication_trigger_settings
  for each row execute function public.set_updated_at();

alter table public.communication_trigger_settings enable row level security;

create table public.communication_messages (
  id uuid primary key default gen_random_uuid(),
  parking_space_id uuid not null references public.parking_spaces (id) on delete cascade,
  ticket_id uuid references public.valet_tickets (id) on delete set null, -- null for test sends

  trigger_key public.communication_trigger_key not null,
  channel public.communication_channel not null,
  recipient text not null,
  status public.communication_message_status not null,
  error text,
  is_test boolean not null default false,

  created_at timestamptz not null default now()
);

create index communication_messages_site_created_idx
  on public.communication_messages (parking_space_id, created_at desc);
create index communication_messages_ticket_idx
  on public.communication_messages (ticket_id);

alter table public.communication_messages enable row level security;

-- Backfill: reproduce today's hardcoded check-in message as a saved "vehicle_checked_in"
-- trigger for every existing site, carrying over each site's current sms_enabled/
-- whatsapp_enabled. Without this, deploying this migration would silently stop the
-- tracking-link message that currently auto-fires at check-in, since the new
-- fireTrigger() requires a saved template before it sends anything.
insert into public.communication_trigger_settings
  (parking_space_id, trigger_key, channel, enabled, template)
select
  cs.parking_space_id,
  'vehicle_checked_in',
  chan.channel,
  case chan.channel
    when 'sms' then cs.sms_enabled
    when 'whatsapp' then cs.whatsapp_enabled
    else false
  end,
  'Your vehicle {{vehicleNumber}} is parked. Track status & request pickup: {{trackingUrl}}'
from public.communication_settings cs
cross join (values ('sms'::public.communication_channel), ('whatsapp'::public.communication_channel)) as chan(channel)
on conflict (parking_space_id, trigger_key, channel) do nothing;
