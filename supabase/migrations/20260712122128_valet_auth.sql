-- Valet Parking Application: a separate username/password auth subsystem for
-- Parking Admin and Valet Operator accounts (super_admin keeps its existing
-- Supabase Auth / email login, untouched).
--
-- These sessions carry no auth.uid(), so Phase 1's RLS helpers
-- (is_super_admin(), current_site_id()) don't apply here. Access to these
-- tables is intentionally locked to the service_role only (RLS enabled, no
-- policies -> deny-all for anon/authenticated) -- all reads/writes go through
-- server-side code (Server Actions / Route Handlers) that verifies the
-- custom session and enforces site-scoping in application code.

alter table public.parking_spaces
  add column valet_parking_enabled boolean not null default false;

create table public.valet_accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  role text not null check (role in ('parking_admin', 'valet_operator')),
  assigned_site_id uuid not null references public.parking_spaces (id) on delete cascade,
  full_name text,
  employee_id text,
  created_by uuid references public.valet_accounts (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index valet_accounts_assigned_site_id_idx on public.valet_accounts (assigned_site_id);

create table public.valet_sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.valet_accounts (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index valet_sessions_account_id_idx on public.valet_sessions (account_id);

create trigger valet_accounts_set_updated_at before update on public.valet_accounts
  for each row execute function public.set_updated_at();

alter table public.valet_accounts enable row level security;
alter table public.valet_sessions enable row level security;
