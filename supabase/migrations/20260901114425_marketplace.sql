-- Marketplace: an admin-side catalog of third-party vendor integrations (ANPR plate
-- readers today, more categories later) that a super_admin can configure and assign to
-- customers (organizations) independently of any runtime wiring. This migration adds
-- only the catalog + entitlement tables -- lib/ocr-worker.ts's `runOcr` is still the only
-- function that talks to an OCR engine, and stays that way; wiring a marketplace-selected
-- vendor into the actual check-in flow is a deliberately separate, later change. This
-- layer's job is only to let a super_admin store vendor credentials and flip customers
-- on/off, per category, per app.
--
-- One api_key per app, platform-level, not per-customer: organization_app_assignments is
-- a lightweight on/off entitlement (has this org been switched on for this app?), never a
-- second place to enter a key. api_key starts NULL for every seeded app -- real vendor
-- keys are entered through the Marketplace UI after this ships and must never be
-- committed to source control (see the two seed rows below).
--
-- is_configured is intentionally not a stored/generated column: lib/marketplace.ts
-- computes it in application code as `Boolean(api_key)` wherever it's needed, so there is
-- one source of truth (the api_key column) instead of a second column that could drift
-- from it.

create table public.marketplace_categories (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger marketplace_categories_set_updated_at before update on public.marketplace_categories
  for each row execute function public.set_updated_at();

alter table public.marketplace_categories enable row level security;

create policy "marketplace_categories: super_admin manage all"
  on public.marketplace_categories for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create table public.marketplace_apps (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.marketplace_categories (id) on delete cascade,
  name text not null,
  vendor text not null,
  description text,
  endpoint_url text,
  api_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger marketplace_apps_set_updated_at before update on public.marketplace_apps
  for each row execute function public.set_updated_at();

alter table public.marketplace_apps enable row level security;

create policy "marketplace_apps: super_admin manage all"
  on public.marketplace_apps for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create table public.organization_app_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  app_id uuid not null references public.marketplace_apps (id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, app_id)
);

create trigger organization_app_assignments_set_updated_at before update on public.organization_app_assignments
  for each row execute function public.set_updated_at();

alter table public.organization_app_assignments enable row level security;

create policy "organization_app_assignments: super_admin manage all"
  on public.organization_app_assignments for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Seed the ANPR category and its two known vendor apps. api_key stays NULL for both --
-- enter real keys via the Marketplace UI after this ships, never here.
insert into public.marketplace_categories (key, name, description, sort_order) values
  ('anpr', 'ANPR', 'Automatic Number Plate Recognition vendors for reading plates from checkpoint photos.', 0);

insert into public.marketplace_apps (category_id, name, vendor, description, endpoint_url) values
  (
    (select id from public.marketplace_categories where key = 'anpr'),
    'ANPR Plate Reader',
    'Kotai Electronics',
    'Bearer-token REST API, single `image` multipart field per request.',
    'https://kotaielectronics.com/anprdemo/api/anpr_plate_reader.php'
  ),
  (
    (select id from public.marketplace_categories where key = 'anpr'),
    'Circuit Digest ANPR',
    'Circuit Digest',
    'Catalog entry only -- no endpoint URL or request/response documentation was available at seed time. Fill in integration details once the vendor''s API docs are on hand.',
    null
  );
