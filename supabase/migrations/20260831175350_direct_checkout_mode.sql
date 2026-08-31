-- Opt-in per-site mode: when on, checkout skips the guest request/dispatch/OTP
-- pipeline entirely in favor of a single "operator confirms fare and completes"
-- step. Default false -- every existing site keeps today's exact flow unchanged.
-- Same shape as auto_allocate_operator (20260713043605_parking_spaces_auto_allocate.sql).
alter table public.parking_spaces
  add column direct_checkout_mode boolean not null default false;
