-- QR-code check-in mode: reusable physical QR cards printed per site and handed to
-- guests at check-in. `code` is globally unique (not just per site) because the
-- guest-facing scan URL (/track/qr/<code>) carries no site context. "In use" is
-- deliberately NOT stored here -- it's derived by checking for an active
-- (non-completed/non-voided) valet_tickets row referencing it via qr_code_id (see
-- lib/parking-admin/qr-codes.ts). RLS is deny-all/service-role-only, same pattern as
-- valet_accounts/valet_push_tokens.
create table public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.parking_spaces (id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index qr_codes_site_id_idx on public.qr_codes (site_id);

create trigger qr_codes_set_updated_at before update on public.qr_codes
  for each row execute function public.set_updated_at();

-- RLS: deny-all, service-role only -- same pattern as every other valet_* table.
alter table public.qr_codes enable row level security;
