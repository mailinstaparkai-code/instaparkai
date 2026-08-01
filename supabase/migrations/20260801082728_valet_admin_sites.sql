-- Multi-location support for parking_admin accounts.
--
-- valet_operator stays exactly as-is: assigned_site_id remains the single
-- source of truth for that role, unchanged (operators work one physical
-- location per shift). For parking_admin, assigned_site_id is reinterpreted
-- as the default/primary site (initial selection + fallback), while this
-- join table becomes the actual source of truth for which sites the
-- account can access. Kept additive rather than widening/loosening
-- assigned_site_id's NOT NULL constraint or forking the schema per role.
--
-- RLS is deny-all (enabled, no policies) -- same as valet_accounts and
-- valet_sessions. This table carries no auth.uid(); all access goes through
-- server-side code using the service-role client, which must enforce
-- site-scoping/authorization itself (see valet-auth in CLAUDE.md).

create table public.valet_admin_sites (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.valet_accounts (id) on delete cascade,
  site_id uuid not null references public.parking_spaces (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (account_id, site_id)
);

create index valet_admin_sites_account_id_idx on public.valet_admin_sites (account_id);
create index valet_admin_sites_site_id_idx on public.valet_admin_sites (site_id);

alter table public.valet_admin_sites enable row level security;

-- Backfill: every existing parking_admin keeps exactly their current site.
insert into public.valet_admin_sites (account_id, site_id)
select id, assigned_site_id from public.valet_accounts where role = 'parking_admin';

-- Session-level "current site" selection, one row per device/login (web
-- cookie session and Android bearer token are already separate
-- valet_sessions rows for the same account), so switching sites on one
-- device never affects another device's session.
alter table public.valet_sessions
  add column current_site_id uuid references public.parking_spaces (id) on delete set null;

update public.valet_sessions vs
set current_site_id = va.assigned_site_id
from public.valet_accounts va
where vs.account_id = va.id;
