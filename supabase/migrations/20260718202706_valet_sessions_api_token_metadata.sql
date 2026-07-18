-- The native Android app authenticates via a bearer token instead of the web's
-- httpOnly cookie, but shares the same valet_sessions table/hash scheme. These
-- columns let API-issued tokens use a longer, sliding expiry (touched on each
-- request) without changing the web cookie session's fixed 7-day TTL, and let
-- an eventual "active sessions" admin view distinguish session origin.
alter table public.valet_sessions
  add column last_used_at timestamptz,
  add column client text not null default 'web';
