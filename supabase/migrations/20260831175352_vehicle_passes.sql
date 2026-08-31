-- Vehicle numbers a parking_admin whitelists for zero-fare checkout. Currently only
-- consulted inside Direct Checkout mode's completion path (not the classic OTP-based
-- handover) -- same table shape as vehicle_types (20260715172212_vehicle_types.sql),
-- deny-all RLS since this is only ever accessed via the service-role client.
create table public.vehicle_passes (
  id uuid primary key default gen_random_uuid(),
  parking_space_id uuid not null references public.parking_spaces (id) on delete cascade,
  vehicle_number text not null,
  label text,
  created_at timestamptz not null default now(),
  unique (parking_space_id, vehicle_number)
);

alter table public.vehicle_passes enable row level security;
