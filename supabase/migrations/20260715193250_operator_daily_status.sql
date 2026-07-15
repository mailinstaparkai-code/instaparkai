-- V2: explicit per-day operator availability (IN/OUT/Leave/Break), so auto-allocation
-- can be based on who's actually scheduled to work today rather than only derived
-- from live dispatch state. Per-date rows (not just "today") so this can back
-- attendance reporting later, per the V2 doc.
create type public.operator_daily_status_kind as enum ('in', 'out', 'leave', 'break');

create table public.operator_daily_status (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.valet_accounts (id) on delete cascade,
  status_date date not null,
  status public.operator_daily_status_kind not null,
  set_by uuid references public.valet_accounts (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (operator_id, status_date)
);

create index operator_daily_status_operator_date_idx
  on public.operator_daily_status (operator_id, status_date);

create trigger operator_daily_status_set_updated_at before update on public.operator_daily_status
  for each row execute function public.set_updated_at();

-- RLS: deny-all, service-role only -- same pattern as every other valet_* table.
alter table public.operator_daily_status enable row level security;

-- Ship-day safety net: the admin's chosen default is opt-in (OUT until explicitly
-- marked IN for a date), which would otherwise leave zero auto-allocation-eligible
-- operators the moment this migration lands. Backfill today's IST calendar date as
-- "in" for every currently-active operator so live sites aren't broken by the deploy;
-- the opt-in default only takes effect starting the next calendar day.
insert into public.operator_daily_status (operator_id, status_date, status)
select id, (now() at time zone 'Asia/Kolkata')::date, 'in'
from public.valet_accounts
where role = 'valet_operator' and is_active = true;
