-- Lets an admin schedule a tariff change for a future date instead of it taking
-- effect the instant it's saved. "Editing" a rule inserts a new row for the same
-- vehicle_category rather than mutating the old one, so the still-active old value
-- stays available until its replacement's effective_from arrives. Existing rows
-- default to now() -- no behavior change for them.
alter table public.tariff_rules
  add column effective_from timestamptz not null default now();
