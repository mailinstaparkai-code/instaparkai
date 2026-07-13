-- Attribute every ticket-lifecycle transition to the staff account that performed it.
-- checked_in_by already exists and is correctly set; delivered_by already exists but was
-- dead (dispatchVehicle read a form field the UI never submitted) -- fixed in application
-- code to be set by completeHandover instead. requested_by/dispatched_by/arrived_by are
-- new: without them, a transaction report has no "who operated it" for 3 of 5 stages.

alter table public.valet_tickets
  add column requested_by uuid references public.valet_accounts (id) on delete set null,
  add column dispatched_by uuid references public.valet_accounts (id) on delete set null,
  add column arrived_by uuid references public.valet_accounts (id) on delete set null;
