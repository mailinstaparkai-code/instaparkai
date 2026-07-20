-- Device/browser push registration for real (system-tray / OS-level) delivery of
-- valet notifications -- additive to valet_notifications (in-app feed), not a
-- replacement. One row per (account, platform, token); re-registering the same
-- token (app reinstall, browser re-subscribe) upserts rather than duplicating.
create type public.valet_push_platform as enum ('android', 'web');

create table public.valet_push_tokens (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.valet_accounts (id) on delete cascade,
  platform public.valet_push_platform not null,
  token text not null,
  -- Web Push additionally needs the subscription's own keys (p256dh/auth) alongside
  -- the endpoint URL; Android's FCM registration token is self-sufficient, so these
  -- stay null for platform = 'android'.
  endpoint text,
  p256dh text,
  auth_key text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index valet_push_tokens_token_idx on public.valet_push_tokens (token);
create index valet_push_tokens_account_id_idx on public.valet_push_tokens (account_id);

create trigger valet_push_tokens_set_updated_at before update on public.valet_push_tokens
  for each row execute function public.set_updated_at();

-- RLS: deny-all, service-role only -- same pattern as every other valet_* table.
alter table public.valet_push_tokens enable row level security;
