-- Subscription plans (super_admin-managed): cap how many parking_spaces
-- (sites/locations) an organization may have. No billing/payment
-- integration exists anywhere in this app -- this is a structural cap only.
--
-- organizations.subscription_plan_id is nullable and defaults to null on
-- every existing org, meaning "uncapped/grandfathered": nothing changes for
-- current orgs until a super_admin explicitly assigns a plan.

create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  max_locations integer not null check (max_locations > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger subscription_plans_set_updated_at before update on public.subscription_plans
  for each row execute function public.set_updated_at();

alter table public.subscription_plans enable row level security;

create policy "subscription_plans: super_admin manage all"
  on public.subscription_plans for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

alter table public.organizations
  add column subscription_plan_id uuid references public.subscription_plans (id) on delete set null;

insert into public.subscription_plans (name, max_locations) values
  ('Starter', 3),
  ('Pro', 10),
  ('Enterprise', 50);

-- Enforce the cap at the DB layer (parking_spaces has live RLS, no
-- service-role bypass, so this trigger is the real authority -- the
-- friendly pre-check in createParkingSpace is a UX nicety on top of this,
-- not a substitute for it). Only fires on insert, so lowering a plan's
-- max_locations later never touches existing sites.
create function public.enforce_site_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cap integer;
  current_count integer;
begin
  select sp.max_locations into cap
  from public.organizations o
  join public.subscription_plans sp on sp.id = o.subscription_plan_id
  where o.id = new.organization_id;

  if cap is null then
    return new;
  end if;

  select count(*) into current_count
  from public.parking_spaces
  where organization_id = new.organization_id;

  if current_count >= cap then
    raise exception 'Organization has reached its subscription plan''s site limit (%).', cap;
  end if;

  return new;
end;
$$;

create trigger parking_spaces_enforce_site_cap before insert on public.parking_spaces
  for each row execute function public.enforce_site_cap();
