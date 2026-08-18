-- Tracks the latest signed release per platform so the app itself can check for
-- updates and prompt the user to download a newer build -- there's no Play Store
-- distribution for this app, so nothing else does this today. Managed manually
-- (super_admin RLS only, no app-facing write path) as part of the release-cutting
-- checklist in apps/valet-operator-android/README.md, mirroring how release APKs
-- are already a manual, scripted step rather than an automated pipeline.

create table public.app_releases (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('android')),
  version_code integer not null,
  version_name text not null,
  apk_url text not null,
  release_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, version_code)
);

create trigger app_releases_set_updated_at before update on public.app_releases
  for each row execute function public.set_updated_at();

alter table public.app_releases enable row level security;

create policy "app_releases: super_admin manage all"
  on public.app_releases for all
  using (public.is_super_admin())
  with check (public.is_super_admin());
