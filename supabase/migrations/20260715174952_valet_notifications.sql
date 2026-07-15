-- In-app notifications widget for Parking Admin / Valet Operator staff -- the top-bar
-- bell has been purely decorative until now. Site-wide (visible to every staff member
-- on the site, not just whoever's assigned), matching "other notifications which you
-- logically think should be there" from the V1 Changes doc.
create type public.valet_notification_kind as enum (
  'vehicle_checked_in', 'vehicle_requested', 'vehicle_dispatched',
  'vehicle_arrived', 'handover_complete'
);

create table public.valet_notifications (
  id uuid primary key default gen_random_uuid(),
  parking_space_id uuid not null references public.parking_spaces (id) on delete cascade,
  ticket_id uuid references public.valet_tickets (id) on delete set null,
  kind public.valet_notification_kind not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index valet_notifications_parking_space_id_idx
  on public.valet_notifications (parking_space_id, created_at desc);

-- RLS: deny-all, service-role only -- same pattern as every other valet_* table.
alter table public.valet_notifications enable row level security;
