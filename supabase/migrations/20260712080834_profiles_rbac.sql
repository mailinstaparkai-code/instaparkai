-- Auth & RBAC foundation: profiles table, role enum, bootstrap trigger, RLS.
-- assigned_site_id intentionally has no FK yet — the parking_spaces table
-- (hierarchical data model) lands in the next migration, which will add the
-- constraint via ALTER TABLE.

create type public.user_role as enum ('super_admin', 'site_admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role public.user_role not null default 'site_admin',
  assigned_site_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per auth.users user. Drives RBAC: super_admin has global access, site_admin is scoped to assigned_site_id.';

-- The first user ever created becomes super_admin (bootstrap); everyone after
-- defaults to site_admin and must be assigned a site + promoted by a super_admin.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    case when exists (select 1 from public.profiles) then 'site_admin' else 'super_admin' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- SECURITY DEFINER helpers so RLS policies (here and on future tables) can
-- check role/site without re-triggering RLS on profiles (avoids recursion).
create function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin'
  );
$$;

create function public.current_site_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select assigned_site_id from public.profiles where id = auth.uid();
$$;

alter table public.profiles enable row level security;

create policy "profiles: self read"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles: super_admin read all"
  on public.profiles for select
  using (public.is_super_admin());

create policy "profiles: self update own name"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles: super_admin manage all"
  on public.profiles for all
  using (public.is_super_admin())
  with check (public.is_super_admin());
