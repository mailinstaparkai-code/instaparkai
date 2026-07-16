-- Adds a "voided" terminal state for mis-entered tickets (wrong plate/mobile typed at
-- check-in, duplicate check-in, etc.) that staff currently have no way to correct or
-- remove from the Live Queue -- flagged by /impeccable critique as a real gap: the only
-- prior option was "live with it" for the rest of the shift.
alter type public.valet_ticket_status add value 'voided';

alter table public.valet_tickets
  add column voided_at timestamptz,
  add column voided_by uuid references public.valet_accounts (id) on delete set null,
  add column void_reason text;

alter type public.valet_notification_kind add value 'vehicle_voided';
