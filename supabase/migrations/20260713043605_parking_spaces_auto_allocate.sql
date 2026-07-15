-- Auto-allocation toggle: when on, requestVehicle immediately round-robins to an
-- available operator and dispatches, skipping the manual "pick an operator" step.
alter table public.parking_spaces
  add column auto_allocate_operator boolean not null default false;
