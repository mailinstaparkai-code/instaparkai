-- Access Workflow Logic Builder (PRD 3.2) + Dynamic Tariff Engine (PRD 3.2).
-- Both are Super Admin Configuration Hub tables: super_admin manages, site_admin
-- gets read-only access scoped to their assigned_site_id (same pattern as
-- zones/slots in the hierarchical data model migration).

create type public.tariff_pricing_type as enum ('flat', 'hourly', 'surge');

-- One access workflow per site: an ordered list of auth methods, e.g.
-- '["anpr", "rfid"]' means ANPR is primary, RFID is the fallback.
create table public.access_workflows (
  id uuid primary key default gen_random_uuid(),
  parking_space_id uuid not null unique references public.parking_spaces (id) on delete cascade,
  methods jsonb not null default '["anpr"]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tariff_rules (
  id uuid primary key default gen_random_uuid(),
  parking_space_id uuid not null references public.parking_spaces (id) on delete cascade,
  vehicle_category text not null default 'car',
  pricing_type public.tariff_pricing_type not null default 'hourly',
  rate numeric(10, 2) not null,
  surge_multiplier numeric(4, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger access_workflows_set_updated_at before update on public.access_workflows
  for each row execute function public.set_updated_at();
create trigger tariff_rules_set_updated_at before update on public.tariff_rules
  for each row execute function public.set_updated_at();

alter table public.access_workflows enable row level security;
alter table public.tariff_rules enable row level security;

create policy "access_workflows: super_admin manage all"
  on public.access_workflows for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "access_workflows: site_admin read own site"
  on public.access_workflows for select
  using (parking_space_id = public.current_site_id());

create policy "tariff_rules: super_admin manage all"
  on public.tariff_rules for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "tariff_rules: site_admin read own site"
  on public.tariff_rules for select
  using (parking_space_id = public.current_site_id());
