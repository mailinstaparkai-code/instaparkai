-- Operator contact details + profile photo, requested so the Parking Admin's "Add
-- Operator" form can capture more than username/password/full_name/employee_id, and
-- so the Valet Operators list can show a photo card instead of a generic icon.
alter table public.valet_accounts
  add column email text,
  add column phone text,
  add column photo_path text;
