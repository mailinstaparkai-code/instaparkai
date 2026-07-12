-- Fix bug: the CASE expression in handle_new_user() resolves to `text`
-- (both branches are string literals with no non-unknown type to anchor to),
-- and Postgres has no implicit cast from `text` to a user-defined enum, so
-- every signup/invite failed with "Database error saving new user".

create or replace function public.handle_new_user()
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
    (case when exists (select 1 from public.profiles) then 'site_admin' else 'super_admin' end)::public.user_role
  );
  return new;
end;
$$;
