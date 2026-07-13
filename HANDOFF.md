# InstaPark AI — Project Handoff

Status snapshot for anyone (human or agent) picking this project up. For coding
conventions and gotchas, see [`CLAUDE.md`](./CLAUDE.md). For the design system, see
[`design.md`](./design.md).

**This repo is public.** Don't commit real credentials (passwords, API keys, service-role
keys) to any file, including this one — reference where to find/reset them instead.

## Live URLs

- **App**: https://instaparkai-super-admin.vercel.app
  - Super Admin login: `/login`
  - Parking Admin login: `/parking-admin/login`
- **Repo**: https://github.com/mailinstaparkai-code/instaparkai
- **Vercel project**: `insta-park-ai/instaparkai-super-admin`
- **Supabase project**: `mailinstaparkai-code's Project` (ref `iennufkectrehbluhxgl`,
  region ap-northeast-1)

## What's built

**Super Admin Portal** — complete for its current scope:
- Supabase Auth login, RBAC (`super_admin` / `site_admin`)
- Hierarchical data model: Organizations → Parking Spaces → Zones → Slots, with a
  card-grid drill-down UI (breadcrumbs, create/edit/delete with cascade-aware confirmation
  dialogs at every level)
- Site Profile Management (type, geolocation, timezone), Access Workflow Builder
  (ANPR/RFID/HID primary+fallback), Dynamic Tariff Engine (flat/hourly/surge)
- App shell: sidebar + topbar per `design.md`, working light/dark theme toggle

**Valet Parking Application — Phase A + B + C (core workflow)**:
- Separate username/password auth for `parking_admin` / `valet_operator` roles
  (`valet_accounts` / `valet_sessions` tables), independent of Supabase Auth — see
  `CLAUDE.md` for why and how this works. `valet_operator` accounts **can** log in at
  `/parking-admin/login` (shared with `parking_admin`) and get a role-scoped sidebar —
  see the Valet Operators bullet below for details. This was a deliberate stopgap fix,
  not the original plan (which assumed operators would be Android-app-only) — the
  dedicated native app is still the long-term intent, see Suggested next steps.
- `valet_parking_enabled` feature flag per parking space; Super Admin can toggle it and
  create the first Parking Admin account for a site
- A seeded test site ("Hotel Parking Test") with a Parking Admin account — see **Test
  accounts** below
- **Slab-based tariff pricing** (`tariff_rules.slab_tiers` jsonb, `pricing_type = 'slab'`)
  alongside flat/hourly/surge, configurable from the site detail page in the Super Admin
  portal.
- **`valet_tickets` table** (Phase B data model): vehicle_number, vehicle_type,
  mobile_number, slot assignment, status (`parked → requested → in_transit → arrived →
  completed`), OTP, fare_amount, payment_collected. Private `valet-photos` Storage bucket
  created for check-in/handover photos, but photo upload UI isn't built yet (see Known
  gaps).
- **Parking Admin dashboard** (`/parking-admin/*`, Phase C): real KPIs (active vehicles,
  arrived, completed today, avg turnaround) on the dashboard home; a **Live Queue** page
  (`/parking-admin/queue`) with vehicle check-in, slot assignment, and the full status
  lifecycle (guest-requested → dispatch operator → mark arrived → complete handover with
  OTP verification + fare/payment capture); a **Valet Operators** page
  (`/parking-admin/operators`) for the Parking Admin to create/edit/deactivate/delete
  `valet_operator` accounts for their site — Edit updates username/full name/employee ID
  and optionally rotates the password (`updateOperator` in `operators/actions.ts`; blank
  password field keeps the current one, same "leave blank to keep current" convention as
  Communication settings' credential fields). Operators can log in with those credentials
  at `/parking-admin/login` and get a restricted sidebar (`valetOperatorNav` in
  `nav-config.ts`: Dashboard, Live Queue, Vehicles only — no account management, no
  Communication settings, both of which stay `parking_admin`-only via each page's own
  role check). `queue/actions.ts`'s ticket-lifecycle actions (check-in through complete
  handover) accept both roles (`assertValetStaff()`) since running the queue is an
  operator's actual job; hitting an admin-only page/URL as an operator redirects to the
  operator's own dashboard rather than bouncing back to the login screen. Fare is
  auto-suggested at handover from the
  site's tariff rules (`src/lib/tariff.ts`) but always operator-editable — no payment
  gateway, matches the "GPay screenshot + mark collected" design.
- **Vehicle log & reports** (`/parking-admin/vehicles`): full ticket history (last 100,
  most recent first) across all statuses, with a filter row (All/Parked/Requested/In
  transit/Arrived/Completed via `?status=` query param) and summary cards (completed
  count, revenue + paid/pending split, avg turnaround, total shown). Shows the
  check-in/delivery operator per ticket (joined via the two `valet_accounts` FKs on
  `valet_tickets` — see the `checked_in_operator`/`delivered_operator` aliased embeds if
  you need the pattern elsewhere) plus the same guest-link and photo-viewer affordances
  as the Live Queue.
- "Reports" (as a distinct analytics page) and "Settings" nav items are still stubs
  (`href: null` in `src/components/shell/nav-config.ts`) — the Vehicles page above covers
  the "reports" need for now (revenue/turnaround/operator visibility), just not as a
  dedicated analytics dashboard.
- **Communication** (`/parking-admin/communication`): redesigned as a **Triggers /
  Message Log / Settings** tabbed page (matching a reference product UI the user
  provided). Five triggers fire at each `valet_tickets` lifecycle transition
  (`vehicle_checked_in`, `pickup_requested`, `vehicle_in_transit`, `vehicle_arrived`,
  `handover_complete`), each independently configurable per channel (WhatsApp/SMS/Email)
  with its own enabled flag + freeform `{{variable}}` template
  (`communication_trigger_settings` table, catalogue + firing logic in
  `src/lib/communication-triggers.ts`'s `fireTrigger()`). Every send attempt — real or
  via the per-row "Test" button — is logged to `communication_messages` (sent/failed +
  error only; no true delivered/read tracking, since that needs Twilio
  status-callback/SendGrid event webhooks which don't exist yet — the stat card is
  honestly labeled "Sent" rather than "Delivered/Read"). `fireTrigger` is best-effort
  (try/catch, never throws) and double-gates on both the per-trigger `enabled` flag *and*
  the channel's master on/off in Settings — a send only goes out if both are on.
  Settings tab still holds the shared per-channel credentials (Twilio SID/token/from
  numbers, SendGrid key/from-email) — same masked-on-redisplay,
  blank-keeps-existing-value behavior as before, now split into WhatsApp/SMS/Email
  sub-tab panels, each with its own "Save Integration" button but all writing to the
  same `communication_settings` row (hidden inputs carry the other two channels'
  `enabled` state through on each save so one panel's save can't blank another's).
  Deliberate simplification: WhatsApp stays on **Twilio's** WhatsApp API (a second
  WhatsApp-enabled Twilio sender) rather than AiSensy (which the reference UI uses) —
  same account/credentials as SMS, avoiding an unverified second provider integration.
  Verified end-to-end against the live Supabase project: `checkInVehicle` and
  `markArrived` each triggered a real Twilio API call that failed with a real Twilio
  error (unverified trial-account number) and was correctly logged; unconfigured
  triggers (`pickup_requested`, `vehicle_in_transit`, `handover_complete` in this test)
  correctly no-op without crashing their lifecycle action; Settings save/mask/reload and
  cross-channel preservation all confirmed. Actual message *delivery* is unverified —
  no live Twilio/SendGrid account connected in this environment, only the API
  request/response cycle was exercised.
- **⚠️ Second leaked-credential sighting**: the same reference doc mentioned above
  (`Insta Park AI - Valet Parking Application.docx`) has 7 embedded screenshots of the
  reference product's Communication tab; several show what look like **live** SendGrid,
  Twilio, and AiSensy credentials plus a personal email address, in addition to the ones
  already flagged in the Architecture section below. None were used anywhere in this
  codebase. If those credentials are still active, they're worth rotating.
- **Guest tracking page** (Phase D): public `/track/[ticket_token]` route, no login. Shows
  a status timeline (Parked → Requested → On the way → Arrived), a "Request my vehicle"
  button (parked stage only), the handover OTP once the vehicle has arrived, and a
  delivered/fare summary once completed. Auto-refreshes every 6s via
  `src/app/track/[token]/status-poller.tsx` (plain polling, not Supabase Realtime, since
  guest sessions aren't Supabase-authenticated). The Live Queue page has a "Guest link"
  copy-to-clipboard button per row (`src/app/parking-admin/(authenticated)/queue/copy-link-button.tsx`)
  for staff to share the link — no SMS/WhatsApp delivery yet (that's Communication
  settings, still a stub).

- **Check-in/handover photo capture**: the check-in dialog has 5 optional photo inputs
  (front/back/left/right/odometer); the handover dialog has 1 optional photo. Files are
  compressed client-side (`src/lib/image-compress.ts`, canvas downscale to ≤1280px +
  JPEG re-encode) before upload, since a raw phone-camera photo can be several MB and
  Server Actions/Vercel have low request-body limits — this is why compression exists,
  not as a nice-to-have. Uploaded via `src/lib/valet-photos.ts` to the `valet-photos`
  bucket, paths stored in `check_in_photos`/`handover_photos` jsonb columns. A "Photos"
  column on the Live Queue opens a dialog of signed-URL thumbnails
  (`src/app/parking-admin/(authenticated)/queue/photos-button.tsx`). All optional — no
  photos required to check in or hand over a vehicle.

- **Reports** (`/parking-admin/reports`): a card-grid landing page — two live cards
  (**Vehicle Transaction Report**, new; **Vehicle Log**, the existing `/parking-admin/vehicles`
  page reframed as a report card) plus grayed "Coming soon" placeholders (Operator
  Performance, Revenue, Peak Hours, Slot Utilization, Repeat Customers, Cancellation),
  matching a reference product UI the user shared. `parking_admin`-only, same
  wrong-role-redirects-to-dashboard pattern as Operators/Communication.
  **Vehicle Transaction Report** (`/parking-admin/reports/vehicle-transactions`)
  unpivots each `valet_tickets` row into up to 5 transaction rows — Checked In / Pickup
  Requested / Dispatched / Arrived / Handover Complete — each with its own timestamp and
  operator, filterable by type/operator/date range (`?type=&operator=&from=&to=`),
  capped at 500 rows, with client-side CSV export (no new backend endpoint). Building
  this surfaced a real bug: `valet_tickets.delivered_by` was **dead** —
  `dispatchVehicle()` read a form field the Live Queue UI never submitted (always
  `null`), and `completeHandover()` (the action that should set it) never touched it at
  all. Fixed by stamping `session.accountId` into `completeHandover` instead. Also added
  `requested_by`/`dispatched_by`/`arrived_by` columns (new migration) and wired them into
  `requestVehicle`/`dispatchVehicle`/`markArrived` — without this, "who performed it" was
  unanswerable for 3 of 5 ticket stages. Tickets created before this fix show `—` for
  those columns (honest gap, not backfilled).

**Not started**: the Android operator app, and all AI features (deferred by design — see
below).

## Architecture decisions worth knowing before you continue

- **Backend is Supabase-native**, not the custom NestJS/Redis/MQTT stack described in the
  original platform PRD — RLS + Supabase Auth + Storage instead, to match the Supabase
  project already connected to this GitHub repo.
- **Parking Admin / Valet Operator auth is deliberately separate from Supabase Auth**
  (explicit user decision, not a shortcut) — a standalone username/password system. See
  `CLAUDE.md`'s Auth model section before touching anything under
  `src/lib/valet-auth/` or `src/app/parking-admin/`.
- **AI features are deferred**: damage-detection computer vision, ANPR OCR plate
  scanning, predictive ETA, smart slot allocation, and staffing analytics are all
  explicitly out of scope until the manual workflow is solid end-to-end. Don't add them
  opportunistically.
- **Guest-facing tracking page** will be public routes inside this same Next.js app
  (e.g. `/track/[token]`), not a separate deployment.
- The original valet PRD mentions embedded reference screenshots from an unrelated
  product that contained live third-party API credentials (SendGrid/AiSensy/Twilio).
  Those were **never used or committed** — flagged to the user for rotation at the time.
  If communication settings (WhatsApp/SMS/Email) get built, each site needs **its own**
  fresh credentials entered through the UI, never anything reused from that source doc.

## Known gaps

- `organizations` RLS only grants `super_admin` a `select` policy — a `site_admin`
  session sees an empty Organizations list on `/dashboard/parking-spaces`. Not a
  regression from recent work; pre-existing, and low-priority since `site_admin` is being
  phased out in favor of `valet_accounts`.
- No payment gateway integration anywhere yet (valet payment collection is manual — GPay
  screenshot + "mark collected" — by design, not a gap to fix).
- Fare suggestion at handover (`src/lib/tariff.ts`) is best-effort (duration × tariff
  rule) and always operator-editable — it isn't wired into any billing/ledger system.
- No Email channel recipient exists yet: `valet_tickets` only captures `mobile_number`,
  not an email address, so Email triggers are fully configurable in the UI but never
  actually fire for real tickets (`fireTrigger` silently skips Email when there's no
  guest email). Adding an optional email field to check-in + a `valet_tickets.guest_email`
  column is the natural fast-follow.
- No true delivered/read message tracking (see Communication bullet above) — would need
  Twilio status-callback + SendGrid event-webhook endpoints, a separate future piece.
- **Not mweb-friendly yet**: Live Queue, Vehicles, and the Communication Message Log all
  render their data as a raw `<table>` in `overflow-x-auto`, which contradicts
  `design.md` §4's "no horizontal scroll — card-per-row on narrow viewports" rule.
  Confirmed by resizing to a 375px viewport: both KPI cards and the table scroll
  horizontally instead of reflowing. The Operators list (card rows, not a table) and all
  dialogs/forms are already responsive. Not fixed as part of the operator-login work —
  would need a per-page card-view fallback below a breakpoint.

## Accounts & access

- **GitHub, Vercel, and Supabase** are all connected to the `mailinstaparkai-code`
  account/org. If CLI tools (`gh`, `vercel`, `npx supabase`) in a fresh environment show a
  *different* authenticated account and can't see this project, re-authenticate
  (`gh auth login`, `vercel login`, `npx supabase login`) with the account that owns it —
  this has come up more than once in a sandboxed dev environment.
- **Vercel auto-deploy on `git push` has intermittently gotten stuck/cancelled** in this
  environment (unrelated to code changes). If a push doesn't go live, run
  `vercel deploy --prod --yes` manually — that path has worked reliably every time it's
  been needed.
- Env vars live in Vercel's Production environment settings (not just `.env.local` —
  update both if they ever rotate): `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## Test accounts

- **Super Admin**: `mail.instaparkai@gmail.com`, password set by the project owner
  directly (not stored anywhere in this repo).
- **Parking Admin** (test site "Hotel Parking Test"): username `hotelvikas`. Password was
  reset during operator-login verification (the original was unknown/unrecorded) — shared
  with the project owner directly, not stored in this repo. If it's needed and unknown
  again, a Super Admin can't currently reset a Parking Admin's password through the UI
  (not built yet) — reset it directly via `npx supabase db query --linked` by generating
  a new hash with `src/lib/valet-auth/password.ts`'s `hashPassword()`, or delete and
  recreate the account from the parking space's detail page in the Super Admin portal.
- **Valet Operator** (same test site): username `testoperator`, created during operator-
  login verification to confirm the new login/nav/lifecycle-action flow end-to-end.
  Password was shared with the project owner directly, not stored in this repo. Safe to
  delete from the Valet Operators tab if no longer needed.

## Suggested next steps

Roughly in order (matches the phased plan this project has been following):

1. **Android operator app** (Phase E): native Kotlin/Compose, consuming a small JSON API
   under this Next.js app (bearer-token auth, since the Android app can't use Supabase's
   client SDK against the custom `valet_accounts` session model). This is the next
   unbuilt piece of the original plan and a much larger effort than anything so far —
   new language/toolchain, Android Studio/emulator work.
2. Collect a guest email at check-in (+ `valet_tickets.guest_email` column) so the
   already-built Email channel in Communication triggers can actually fire.
3. Delivered/read message tracking via Twilio status-callback + SendGrid event webhooks.
4. AI enhancements — only after the above is live and there's real usage data to build
   against.
