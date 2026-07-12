-- Hierarchical data model (PRD 3.2): Organization -> Parking Space -> Zone -> Slot.
-- super_admin has full access; site_admin gets read-only access scoped to their
-- assigned_site_id (structural changes to sites/zones/slots stay a Super Admin
-- Configuration Hub responsibility per the PRD).

create type public.parking_space_type as enum ('corporate', 'commercial', 'industrial', 'hybrid');
create type public.slot_status as enum ('available', 'occupied', 'reserved', 'out_of_service');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.parking_spaces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  type public.parking_space_type not null default 'commercial',
  address text,
  latitude double precision,
  longitude double precision,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.zones (
  id uuid primary key default gen_random_uuid(),
  parking_space_id uuid not null references public.parking_spaces (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.slots (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.zones (id) on delete cascade,
  slot_number text not null,
  category text not null default 'regular',
  is_ev boolean not null default false,
  is_disabled_slot boolean not null default false,
  status public.slot_status not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (zone_id, slot_number)
);

-- Now that parking_spaces exists, close the loop from the RBAC migration.
alter table public.profiles
  add constraint profiles_assigned_site_id_fkey
  foreign key (assigned_site_id) references public.parking_spaces (id) on delete set null;

create trigger organizations_set_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();
create trigger parking_spaces_set_updated_at before update on public.parking_spaces
  for each row execute function public.set_updated_at();
create trigger zones_set_updated_at before update on public.zones
  for each row execute function public.set_updated_at();
create trigger slots_set_updated_at before update on public.slots
  for each row execute function public.set_updated_at();

alter table public.organizations enable row level security;
alter table public.parking_spaces enable row level security;
alter table public.zones enable row level security;
alter table public.slots enable row level security;

create policy "organizations: super_admin manage all"
  on public.organizations for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "parking_spaces: super_admin manage all"
  on public.parking_spaces for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "parking_spaces: site_admin read own site"
  on public.parking_spaces for select
  using (id = public.current_site_id());

create policy "zones: super_admin manage all"
  on public.zones for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "zones: site_admin read own site"
  on public.zones for select
  using (parking_space_id = public.current_site_id());

create policy "slots: super_admin manage all"
  on public.slots for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "slots: site_admin read own site"
  on public.slots for select
  using (
    zone_id in (
      select id from public.zones where parking_space_id = public.current_site_id()
    )
  );
