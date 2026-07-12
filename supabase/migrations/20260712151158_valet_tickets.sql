-- Valet Phase B: vehicle data model. A valet_ticket tracks one vehicle through the
-- manual valet workflow: parked -> requested -> in_transit -> arrived -> completed.
--
-- Same access model as valet_accounts/valet_sessions: no auth.uid() involved (Parking
-- Admin/Valet Operator sessions are custom, not Supabase Auth), so RLS is enabled with
-- no policies (deny-all for anon/authenticated) and all access goes through server-side
-- code using the service-role client, which enforces site-scoping itself.

create type public.valet_ticket_status as enum (
  'parked',
  'requested',
  'in_transit',
  'arrived',
  'completed'
);

create table public.valet_tickets (
  id uuid primary key default gen_random_uuid(),
  parking_space_id uuid not null references public.parking_spaces (id) on delete cascade,
  ticket_token text not null unique,

  vehicle_number text not null,
  vehicle_type text not null default 'car' check (vehicle_type in ('car', 'bike', 'suv', 'xuv')),
  mobile_number text not null,

  slot_id uuid references public.slots (id) on delete set null,
  status public.valet_ticket_status not null default 'parked',
  otp text,

  check_in_photos jsonb not null default '[]'::jsonb,
  handover_photos jsonb not null default '[]'::jsonb,

  fare_amount numeric(10, 2),
  payment_collected boolean not null default false,
  payment_screenshot_path text,

  checked_in_by uuid references public.valet_accounts (id) on delete set null,
  delivered_by uuid references public.valet_accounts (id) on delete set null,

  checked_in_at timestamptz not null default now(),
  requested_at timestamptz,
  in_transit_at timestamptz,
  arrived_at timestamptz,
  completed_at timestamptz,

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index valet_tickets_parking_space_id_idx on public.valet_tickets (parking_space_id);
create index valet_tickets_status_idx on public.valet_tickets (status);

create trigger valet_tickets_set_updated_at before update on public.valet_tickets
  for each row execute function public.set_updated_at();

alter table public.valet_tickets enable row level security;

-- Private bucket for check-in / handover photos and payment screenshots. No storage.objects
-- policies are added here (deny-all for anon/authenticated), matching the tables above --
-- reads/writes go through server-side code using the service-role client, which issues
-- short-lived signed URLs when a photo needs to be shown to a browser.
insert into storage.buckets (id, name, public)
values ('valet-photos', 'valet-photos', false)
on conflict (id) do nothing;
