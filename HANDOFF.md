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
  mobile_number, slot assignment, status (`checked_in → parked → requested → in_transit →
  arrived → completed` — the `checked_in`/`parked` split was added in the V2 Changes batch
  below; originally just `parked → requested → in_transit → arrived → completed`), OTP,
  fare_amount, payment_collected. Private `valet-photos` Storage bucket
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

- **V1 Changes batch** — five phases built from a punch-list doc the project owner
  shared (`Valet Parking App V1 Changes.docx`), in this order:
  - **Phase A — Operator assignment & availability**: dispatch now requires picking a
    genuinely *available* operator (`src/lib/operator-availability.ts`'s
    `getAvailableOperators()` — active `valet_operator`s for the site minus whoever's
    currently `dispatched_by` on an `in_transit`/`arrived` ticket), not auto-stamping
    whoever clicked the button. This is a semantic change to `dispatched_by` (added in
    the Reports work above): it now means "the assigned operator," not "who clicked
    dispatch." Sites can flip on **full auto-allocation**
    (`parking_spaces.auto_allocate_operator`, toggle on Live Queue, `parking_admin`-only)
    — when on, `requestVehicle()` immediately round-robins to the least-recently-assigned
    available operator and dispatches in the same call, no manual picker shown; if no
    operator is free, the ticket just stays `requested` until one is (or an admin
    dispatches manually as a fallback — the picker still works on auto-allocate sites).
  - **Phase B — Self-service Configuration** (`/parking-admin/configuration`,
    `parking_admin`-only, wired to the "Settings" nav item): three tabs, all following
    the `operators/actions.ts` service-client + manual-site-scoping pattern (the
    equivalent Super Admin CRUD for zones/slots/tariffs is RLS-gated to `super_admin`
    and wasn't reusable as-is). **Zones & Slots** — create/delete, reusing the existing
    `zones`/`slots` tables. **Vehicle Types** — `vehicle_types` is a new site-scoped
    table; `valet_tickets.vehicle_type` was previously a hardcoded 4-value Postgres
    CHECK constraint (`car`/`bike`/`suv`/`xuv`), now free text validated only by this
    table's contents (backfilled with the original 4 values for every existing site so
    check-in didn't break). The check-in dropdown reads live from it. **Payments** —
    reuses `tariff_rules` as-is (already vehicle-type-capable at the data level); the
    only real change is a `Select` populated from Vehicle Types instead of a freeform
    text input for `vehicle_category`.
  - **Phase C — Notifications widget**: the top-bar bell was purely decorative since
    the shell was built — now backed by a real `valet_notifications` table
    (`src/lib/valet-notifications.ts`'s `notify()`, best-effort, fired alongside the
    existing `fireTrigger()` calls at all 5 ticket-lifecycle stages). Site-wide (every
    `parking_admin`/`valet_operator` on the site sees it, not just whoever's assigned),
    unread badge, opening the dropdown marks everything read, polls every 20s
    (`NotificationsBell`, same plain-polling pattern as the guest tracker — no Supabase
    Realtime elsewhere in this app). Super Admin's bell is untouched; no notification
    data model exists for that surface.
  - **Phase E — Per-vehicle timeline**: click a vehicle number (Live Queue or Vehicles)
    to open its full journey in a dialog — same unpivot logic as the Vehicle Transaction
    Report, extracted into `src/lib/ticket-timeline.ts` so both stay in sync
    (`TicketTimelineDialog`, `getTicketTimeline()` action).
  - **Phase D — Dedicated mobile routes**: new `/parking-admin/m/*` route tree
    (dashboard, queue, vehicles, profile) with its own `MobileAppShell` — bottom tab bar
    (Home/Queue/Vehicles/Profile, `design.md` §6's spec minus Scan/Earnings, which have
    no backend to point at), safe-area padding, card-per-row lists instead of the
    desktop pages' tables. Reuses every existing Server Action and dialog component
    as-is (check-in, dispatch, handover, timeline) — this phase is new UI only, no new
    backend logic. "Switch to mobile view" / "Switch to desktop view" links in each
    shell's user menu / Profile tab. **The original desktop Live Queue/Vehicles pages
    are unchanged** — still raw tables, still not mobile-responsive on their own (see
    Known Gaps) — the mobile fix is the new `/m/` routes, not a retrofit of the desktop
    ones.

- **V2 Changes batch** — six phases built from a second punch-list doc the project owner
  shared (`Valet Parking App V2 Changes.docx`), describing the end-to-end valet journey
  in detail. Research up front found several of the doc's items already satisfied by the
  V1 batch (mobile check-in with photos, staff-triggerable "Guest requested," the
  notifications bell already rendering on mobile) — only the genuinely new gaps became
  phases:
  - **V2 Phase 1 — Two-step check-in/parking split**: check-in and "car is actually
    parked" used to be the same action (`checkInVehicle` set status straight to `parked`,
    slot optional). Now a new `checked_in` status sits between them
    (`valet_ticket_status` enum + `parked_at`/`parked_by` columns) — check-in only covers
    arrival at reception (no slot picker anymore); a new `markAsParked()` action + "Mark
    as parked" UI trigger lets the operator enter the slot once the car is physically
    parked. `src/lib/ticket-timeline.ts` gained a matching `"parked"` transaction stage
    (distinct from `"checked_in"`, which now means "arrived at reception," not "car is
    parked") — every hardcoded status list in the app (`STATUS_LABEL`/`STATUS_COLOR`
    maps, `FILTERS` arrays, the Reports stage-type filter) needed the new member added.
  - **V2 Phase 2 — IST timestamps everywhere**: every timestamp render site used bare
    `.toLocaleString()`/`.toLocaleTimeString()`, silently following the *browser's* local
    timezone rather than IST — wrong for a fleet of India-based sites viewed from
    anywhere. New `src/lib/format-date.ts` (`formatIST()`/`formatISTTime()`, `Asia/Kolkata`
    via `Intl.DateTimeFormat`) swapped into all 10 render sites. No shared date helper
    existed before this; use `formatIST`/`formatISTTime` for any new timestamp UI, not a
    raw `.toLocaleString()`.
  - **V2 Phase 3 — Operator daily availability**: new `operator_daily_status` table
    (per-operator, per-IST-date, `in`/`out`/`leave`/`break`, upserted by
    `setOperatorDailyStatus()`) — Parking Admins set it from a quick-set dropdown on the
    Operators page. **Deliberately opt-in by design decision** (not the default this
    session recommended): an operator with no explicit row for today is *not*
    auto-allocation-eligible. `getAvailableOperators()` gained a `respectDailyStatus`
    param (default `true`, used by auto-allocation) — when `false` (the manual dispatch
    picker's call site), the daily-status filter is skipped entirely and each operator's
    status shows as an inline badge instead, so a human admin can still deliberately
    dispatch someone marked out/leave/break. The migration backfills `in` for every
    then-active operator for the ship date specifically to avoid the opt-in default
    instantly starving auto-allocation the moment it deployed — from the next calendar
    day on, admins must actively mark operators `in` each day.
  - **V2 Phase 4 — 2D slot-wise parking map**: new section on the Parking Admin dashboard
    (`dashboard/parking-map.tsx`) — an auto-generated grid (zones as sections, slots as
    colored cells by live status), a zone filter, and click-through from an occupied cell
    straight into that vehicle's `TicketTimelineDialog`. Deliberately *not* a
    drag-and-drop custom-layout editor (explicit scope decision) — no slot-position data
    exists or was added.
  - **V2 Phase 5 — Multi-select filters, pagination, loading states**: new
    `components/ui/multi-select.tsx` (checkbox-list popover; `components/ui/select.tsx`
    is single-select only and wasn't extended) wired into Live Queue, Vehicles, Reports,
    and Operators — comma-separated query params (`?status=parked,requested`) instead of
    single-value ones. Vehicles and Reports gained real pagination (25/page,
    `.range()` + `count: "exact"` for Vehicles; client-side slicing over the
    already-unpivoted+capped transaction list for Reports, since transactions aren't raw
    DB rows) replacing the previous unbounded `.limit(100)`/500-row cap with no way to
    see the rest. New `components/ui/skeleton.tsx` + a `loading.tsx` per main data route
    (and its `m/` counterpart), plus `useTransition` wrapping every filter's
    `router.push` so changing a filter shows a pending state instead of feeling frozen.
  - **V2 Phase 6 — Foreground haptic on new notifications**: `notifications-bell.tsx`
    now calls `navigator.vibrate(200)` when a poll tick's unread count is higher than the
    previous tick's (tracked via a `ref`, not state, to avoid an extra re-render). No-ops
    silently on browsers without the Vibration API (iOS Safari, desktop) — no permission
    prompt needed, unlike the Notification API. Deliberately foreground-only per an
    explicit scope decision (no Service Worker/Push API/PWA manifest) — doesn't fire when
    the tab is closed or backgrounded.

- **Native Android app** (`apps/valet-operator-android`) — Kotlin + Jetpack Compose,
  built in 6 phases against a brand-new bearer-token JSON API layer under
  `apps/super-admin/src/app/api/parking-admin/v1/*`, functionally mirroring
  `/parking-admin/m/*` mweb (not the richer `design.md` §6 concept — no QR tickets, OCR,
  or Earnings tab).
  - **Phase 0 — API auth plumbing**: `valet_sessions` gained `client` (`web`/`android`)
    and `last_used_at` columns. `createValetApiToken`/`getValetSessionFromToken` extend
    the existing cookie-session code rather than forking it — same table, same
    scrypt/SHA-256 scheme, distinguished by `client`. Android tokens: 30-day TTL, sliding
    (extended when used within 7 days of expiry); the web cookie's fixed 7-day TTL is
    unchanged. `src/lib/supabase/proxy.ts` gained an early `/api/` bypass so bearer-token
    requests skip the cookie-redirect/Supabase-Auth branches.
  - **Phase 1 — Read-only API + Android skeleton**: extracted `lib/parking-admin/
    dashboard.ts` + `vehicles.ts` out of RSC page bodies (both `m/dashboard` and
    `m/vehicles` now call them — byte-identical rendering verified), backing
    `GET dashboard` / `GET vehicles`. Android: Gradle project scaffold (no Hilt, no
    kotlinx.serialization — manual DI + Retrofit/Gson, deliberately to reduce
    build-tooling risk), Login → 4-tab bottom nav (Home/Queue/Vehicles/Profile) →
    Dashboard + Vehicles screens.
  - **Phase 2 — Queue + full ticket lifecycle**: extracted `lib/parking-admin/queue.ts`
    from `queue/actions.ts` (both `(authenticated)/queue` and `m/queue` now call it),
    backing 11 new REST endpoints (check-in, mark-parked, request, dispatch,
    mark-arrived, complete-handover, edit, void, timeline, photos, auto-allocate — all
    under `/api/parking-admin/v1/queue/*`). Android `QueueScreen`: status filters,
    role-gated auto-allocate toggle, and a dialog per lifecycle step.
  - **Phase 3 — Photo capture**: check-in (5 fields) and handover (1 optional) wired to
    the device's stock camera app (`ActivityResultContracts.TakePicture()` +
    `FileProvider`) rather than an embedded CameraX preview — same end result, less
    code/risk for a first cut. `ImageCompressor` mirrors the web's
    `compressImageFile` (1280px max, JPEG quality 0.7) before upload.
  - **Phase 4 — Notifications**: extracted `lib/parking-admin/notifications.ts` from the
    bell's Server Actions, backing `GET notifications` / `POST notifications/mark-read`.
    Android `NotificationsBell` in the shared top bar (all 4 tabs): 20s polling, unread
    badge, mark-all-read on open, and the same vibrate-on-increase haptic as the web's
    V2 Phase 6 (200ms, only when unread count rises tick-over-tick).
  - **Phase 5 — Internal distribution**: signed release build (`keystore.properties`,
    gitignored, read by `app/build.gradle.kts`; release falls back to unsigned if that
    file is missing). Distribution is a raw APK handed to staff devices, **not** Play
    Console — that needs a registered/paid/verified Google Play Developer account, which
    doesn't exist for this project. **The keystore is a one-way door**: back it up
    outside the repo the moment it's generated, since losing it means future release
    builds can't install as *updates* over an existing install (Android enforces
    same-signer for upgrades) — regenerating a keystore is not a recovery path.

All AI features remain deferred by design (see below).

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
- **Desktop pages still aren't mweb-friendly** (mitigated, not fixed): Live Queue,
  Vehicles, and the Communication Message Log all render as raw `<table>`s in
  `overflow-x-auto`, which still scroll horizontally on a narrow viewport instead of
  reflowing. The V1 Changes Phase D above adds separate, genuinely mobile-friendly
  routes (`/parking-admin/m/*`) as the intended way to use this app on a phone — but the
  *original* desktop routes were deliberately left as-is (out of scope for that phase),
  so visiting `/parking-admin/queue` (not `/m/queue`) on a phone still has this problem.
- **Operator daily availability is opt-in, not opt-out** (V2 Phase 3, explicit decision):
  if nobody visits the Operators page to mark an operator `in` on a given IST calendar
  day, that operator is invisible to auto-allocation for the whole day (manual dispatch
  still sees them, with a badge). The ship-day migration backfilled `in` for that one
  day only — this is a real day-to-day operational risk if a site relies on
  auto-allocation and nobody remembers to set daily status each morning. Worth watching
  for real-world reports of "auto-allocate isn't picking anyone" before assuming it's a
  bug — check `operator_daily_status` for that date first.
- Two Vercel deploys in this batch hit a stale `.next/dev` cache after a local
  `rm -rf .next && npm run build` collided with the still-running dev preview server
  (`ENOENT ... pages-manifest.json` / `Cannot find module '.../[turbopack]_runtime.js'`)
  — not an app bug, just restart the dev server (`preview_stop` + `preview_start`) if a
  local preview 500s after a manual production build.

## Accounts & access

- **GitHub, Vercel, and Supabase** are all connected to the `mailinstaparkai-code`
  account/org. If CLI tools (`gh`, `vercel`, `npx supabase`) in a fresh environment show a
  *different* authenticated account and can't see this project, re-authenticate
  (`gh auth login`, `vercel login`, `npx supabase login`) with the account that owns it —
  this has come up more than once in a sandboxed dev environment.
- **Vercel auto-deploy on `git push` has intermittently gotten stuck/cancelled** in this
  environment (unrelated to code changes — confirmed via `vercel ls instaparkai-super-admin
  --scope insta-park-ai`, which showed a run of `Canceled` production deploys spanning
  ~17 hours before this was caught). If a push doesn't go live, run `vercel deploy --prod
  --yes` manually from the **repo root** (`/Users/siddharthasaha/InstaParkAI`), not from
  `apps/super-admin` — the project's Root Directory is configured as `apps/super-admin`
  in Vercel's dashboard, and running the CLI from inside that directory double-applies
  it, silently deploying to (or auto-creating) a *different* project instead of erroring.
  **This exact mistake caused a real multi-hour production outage**: a stray
  `apps/super-admin/.vercel/project.json` linked to a project literally named
  `super-admin` (not `instaparkai-super-admin`), so every manual deploy that "succeeded"
  was actually updating `super-admin-beta-nine.vercel.app` — a domain nothing points at —
  while the real `instaparkai-super-admin.vercel.app` (hardcoded into the Android app's
  release build, and what mweb/dweb/users actually hit) sat on a stale build for hours
  with no error anywhere. Before trusting a manual deploy, verify
  `.vercel/project.json` **at the repo root** reads `"projectName":"instaparkai-super-admin"`
  (that's the correct link — `apps/super-admin/.vercel/project.json` is redundant/unused
  now and should be ignored, not relied on), then run the deploy from the repo root. After
  deploying, sanity-check with `curl -s -o /dev/null -w "%{http_code}" https://instaparkai-super-admin.vercel.app/api/parking-admin/v1/me`
  — expect `401` (reached, auth required); a `404` HTML page means you deployed to (or are
  checking) the wrong place.
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
- **Valet Operators** (same test site): `testoperator` (Test Operator Final) and `valet1`
  (Ravi Kumar) — both created during verification (operator-login flow, then reused for
  Phase A's round-robin/availability testing, which needed 2+ operators). Passwords
  shared with the project owner directly, not stored in this repo. Safe to delete from
  the Valet Operators tab if no longer needed.

## Suggested next steps

Roughly in order (matches the phased plan this project has been following):

1. **Physical-device smoke test of the Android release APK** — Phase 5 verified the
   signed build installs, launches, and reaches the production API on the emulator, but
   photo capture specifically should get a clean check on a real device: the emulator's
   own camera capture pipeline hung mid-JPEG-conversion during Phase 3 testing (a known
   AVD/virtual-scene-camera flakiness, confirmed via logcat to be unrelated to the app's
   permission/FileProvider/intent wiring, all of which fired correctly) — worth
   confirming it's smooth end-to-end where it matters.
2. Collect a guest email at check-in (+ `valet_tickets.guest_email` column) so the
   already-built Email channel in Communication triggers can actually fire.
3. Delivered/read message tracking via Twilio status-callback + SendGrid event webhooks.
4. AI enhancements — only after the above is live and there's real usage data to build
   against.
5. If Android distribution ever needs to grow beyond handing staff a signed APK
   directly (auto-update, wider rollout), revisit Play Console's internal testing track
   — that needs a Google Play Developer account (real Google account, $25 one-time fee,
   identity verification) that doesn't exist yet for this project.
