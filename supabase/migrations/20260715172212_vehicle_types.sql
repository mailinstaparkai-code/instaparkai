-- Vehicle types become site-configurable instead of a fixed 4-value list, so each
-- Parking Admin can add types like "4-Wheeler"/"2-Wheeler" per the V1 Changes doc.
create table public.vehicle_types (
  id uuid primary key default gen_random_uuid(),
  parking_space_id uuid not null references public.parking_spaces (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (parking_space_id, name)
);

-- RLS: deny-all, service-role only -- same pattern as every other valet_*-adjacent
-- table this Parking-Admin-facing config area touches.
alter table public.vehicle_types enable row level security;

-- Backfill the 4 values every existing ticket already relies on, so dropping the
-- CHECK constraint below doesn't leave existing sites' check-in dropdowns empty.
insert into public.vehicle_types (parking_space_id, name)
select ps.id, v.name
from public.parking_spaces ps
cross join (values ('car'), ('bike'), ('suv'), ('xuv')) as v(name)
on conflict (parking_space_id, name) do nothing;

alter table public.valet_tickets
  drop constraint valet_tickets_vehicle_type_check;
