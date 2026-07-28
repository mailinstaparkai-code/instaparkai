-- Nullable: only populated when the site is in 'qr' mode and the operator entered a
-- printed QR card's code at check-in. on delete set null (not cascade) -- deleting a
-- qr_codes row must never take ticket history down with it.
alter table public.valet_tickets
  add column qr_code_id uuid references public.qr_codes (id) on delete set null;

create index valet_tickets_qr_code_id_idx on public.valet_tickets (qr_code_id);
