-- V2: split "check-in" (arrival at reception) and "parked" (car actually parked,
-- slot assigned) into two distinct lifecycle steps. Previously `checkInVehicle` set
-- status straight to `parked` and slot assignment was optional at that same step.
alter type public.valet_ticket_status add value 'checked_in' before 'parked';

alter table public.valet_tickets
  add column parked_at timestamptz,
  add column parked_by uuid references public.valet_accounts (id) on delete set null;

alter type public.valet_notification_kind add value 'vehicle_parked' after 'vehicle_checked_in';
