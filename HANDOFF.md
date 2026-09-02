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
- **Supabase project**: `instaparkai-mumbai` (ref `jgerhiooqrcqurirdewz`, region
  ap-south-1/Mumbai — moved from the original `ap-northeast-1`/Tokyo project on
  2026-07-25; see the Performance section below for why). The original Tokyo project
  (ref `iennufkectrehbluhxgl`) has been **permanently deleted** — Mumbai is now the only
  Supabase project.

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

- **Polish batch — Phase G (visual parity, web + Android)**: a small punch-list closing
  gaps the V1/V2 work left behind, not a numbered doc this time.
  - **Edit-ticket dialog field parity**: the Edit dialog (web + Android) still used plain
    text fields while Check-in had already been upgraded to the IND chip / phone-icon
    treatment — brought Edit in line on both platforms.
  - **Illustrated vehicle-type icons**: Live Queue and Vehicles ticket rows (desktop web,
    mweb, Android) now show a per-vehicle-type illustration (car/bike/scooter/sedan,
    `src/lib/vehicle-image.ts`) instead of plain text — reuses artwork the Android app
    already had, now shared into `public/img/vehicles/`.
  - **mweb dashboard hero image**: mweb's dashboard previously had no hero art at all;
    added a full-width image matching Android Home's layout.
  - **Android hero image fix**: the *original* Android home hero
    (`img_hero_valet.png`) had a decorative bell baked directly into the photo's pixels
    that looked like (but wasn't) the real notification bell in the top bar — swapped for
    a clean cover photo with no baked-in UI elements. The actual functional bell was
    never affected.
  - **`.glass-card` shading**: added the same inner top-light shadow layer `.metric-card`
    already had — `.glass-card` was visibly flatter than Android's `GlassCard`
    composable, which does have that highlight.

- **Real push notifications for `vehicle_dispatched`** (Phase C, Android FCM + Web
  Push) — layered on top of the existing in-app notifications bell (still there,
  unchanged), so an operator gets a system-tray alert the moment a car is assigned to
  them, not just an in-app badge they have to notice.
  - New `valet_push_tokens` table (one row per account+platform+token, upsert-by-token),
    same deny-all-RLS / service-role-only pattern as `valet_accounts`/`valet_sessions`
    (see `CLAUDE.md`'s Auth model section) — authorization lives in application code, not
    Postgres.
  - `src/lib/push/`: `fcm.ts` (FCM HTTP v1 via `google-auth-library`, service-account
    JSON in `FIREBASE_SERVICE_ACCOUNT_JSON` env var), `web-push.ts` (VAPID via the
    `web-push` package, keys in `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/
    `NEXT_PUBLIC_VAPID_PUBLIC_KEY`), `dispatch.ts` (fans out to every token for one
    operator, **best-effort — never throws**, prunes dead tokens on a 404/410 response).
    Wired into `dispatchToOperator` (`lib/parking-admin/queue.ts`) alongside the
    existing `notify()` in-app call — targets only the operator just assigned the
    pickup, not site-wide like the bell. Verified end-to-end: dispatching a real ticket
    to an operator with **zero** registered tokens still completes normally (HTTP 200,
    ticket flips to `in_transit`, no error in server logs) — the push layer can never
    block the actual dispatch.
  - Two registration paths feeding the same table: `POST /api/parking-admin/v1/
    device-tokens` (bearer auth, Android) and a `push-actions.ts` Server Action (cookie
    auth, mweb), both through a shared `registerPushToken()` upsert helper
    (`src/lib/push/register-token.ts`).
  - **mweb**: now an installable PWA scoped to the `/parking-admin/m/*` tree only
    (`public/manifest.json` + `public/sw.js`, linked via that segment's `metadata.manifest`
    — desktop pages are unaffected, confirmed no `<link rel="manifest">` leaks onto
    `/parking-admin/dashboard`). An explicit **"Enable notifications"** banner
    (`m/push-subscribe.tsx`) only appears when `Notification.permission === "default"` —
    deliberately no unprompted browser permission popup on page load.
  - **Android**: `InstaParkFirebaseMessagingService` posts a system-tray notification +
    haptic on receipt; `POST_NOTIFICATIONS` runtime permission requested once at app
    start (API 33+ only, no-ops below that); FCM token registered right after a
    successful login (`LoginViewModel`). Shipped as **v0.4.0** (see the Android README's
    release table).
  - **Real gotcha hit while wiring this up**: `firebase-messaging-ktx` **doesn't exist
    for BOM 34.x** — Firebase stopped shipping `-ktx` artifacts and removed them from the
    BOM's constraint list in July 2025 (the KTX APIs live in the main `firebase-messaging`
    artifact now, no separate dependency needed). Using `libs.firebase.messaging` (not
    `.messaging.ktx`) in `gradle/libs.versions.toml` avoided an unresolvable-dependency
    Gradle failure.
  - **Not yet verified**: actual push *delivery* to a real device/browser (only the
    server-side send path and its non-blocking guarantee were exercised in this sandboxed
    environment — no real FCM device token or a browser with notification permission
    granted was available to test against). Worth a real-device/real-browser check before
    relying on this in production.

- **Live Queue: "Dispatch operator" now explains itself instead of just going grey** —
  a user report ("why is Dispatch operator disabled when there's an operator marked
  In?") traced to correct-but-silent behavior: `getAvailableOperators`
  (`src/lib/operator-availability.ts`) correctly excludes any operator currently
  `dispatched_by` an `in_transit`/`arrived` ticket (out with another car), regardless of
  their daily In/Break/Out status — but the button just disabled itself with zero
  explanation, and the dialog's fallback message ("No operators are currently
  available.") was unreachable dead code since the trigger never opened while disabled.
  Fix: `getQueueData` (`lib/parking-admin/queue.ts`) now computes a specific
  `dispatchUnavailableReason` (no operators assigned to the site vs. all N currently out
  with another vehicle); `DispatchOperatorButton`'s trigger always opens the dialog now,
  which shows that reason instead. Same fix applied to both `/parking-admin/queue`
  (desktop) and `/parking-admin/m/queue` (mobile), since they share the component.
  Verified against live "Hotel Parking Test" data (both its operators mid-handover) —
  confirmed the reason text, then completed a handover and confirmed the picker
  immediately offered the freed-up operator.

- **Performance pass (web) — the app was slow because requests crossed the planet
  twice.** Reported as "the web application and app feel a bit slow"; audited server,
  client, and Android. The dominant cause was geography, not code: serverless functions
  deployed to `iad1` (Virginia) while Supabase lives in `ap-northeast-1` (Tokyo) and the
  users are in India, so every request went India → Virginia → Tokyo → back. Measured
  against production, one database round-trip inside a function cost **~650ms** (365ms
  for a request making zero queries vs ~1010ms for one making a single query).
  - **Fix with the biggest effect**: pinned functions to `bom1` (Mumbai) via
    `apps/super-admin/vercel.json`, putting them near both the users and the database.
    **Median latency for a one-query request went 1.014s → 0.353s (~2.9x).**
  - **Round-trip reductions** (all verified by counting real queries in
    `pg_stat_statements`, plus an instrumented dev build): `getValetSession` is now
    request-memoized with React `cache()` — measured at **2 session queries per page
    load, now 1**, on every route in both the desktop and mweb trees, since each one
    verifies the session in `layout.tsx` and again in `page.tsx`. `getSiteName` and
    `isAutoAllocateEnabled` now share one request-cached `parking_spaces` read instead of
    querying the same row twice (three times on the auto-allocate path). The five
    lifecycle mutations ran `getSiteName → fireTrigger → notify → dispatchPush` as a
    chain; those side effects are independent and each already swallows its own errors
    and never throws, so they now run concurrently with unchanged failure semantics.
    Check-in's 5 photo uploads went from sequential to parallel. The Vehicles list and
    its revenue aggregate now issue together. `createServiceClient()` returns a shared
    instance rather than rebuilding the client at ~75 call sites.
  - **Guest tracker**: the poller called `router.refresh()` every 6s, re-running the whole
    server component and shipping a fresh RSC payload even when nothing had changed. It
    now polls a status-only Server Action, refreshes only on a real change, and pauses
    while the tab is hidden. Measured: **0 full re-renders over 21s idle (was 3–4), and
    exactly 1 on an actual status change.**
  - **Ordering subtlety preserved**: `requestVehicle` still awaits its own notifications
    before auto-allocating, so a guest can't receive "on the way" ahead of "pickup
    requested".
  - **Indexes are future-proofing only.** `valet_tickets` holds ~20 rows, where Postgres
    correctly prefers a sequential scan — the new composite indexes change nothing
    measurable today. The migration header says so explicitly so nobody credits them with
    the speedup. See `CLAUDE.md`'s Performance section for why round-trip count, not SQL,
    is the lever in this app.
  - **Done — Supabase moved to `ap-south-1` (Mumbai)**, closing the remaining
    Mumbai→Tokyo hop identified above. No `pg_dump`/`psql`/Docker was available in this
    environment, so this was done by hand rather than a real dump/restore: a new project
    (`instaparkai-mumbai`, ref `jgerhiooqrcqurirdewz`) got the schema via `supabase db
    push` (all 21 migrations, replayed clean), then every row from all 17 `public`
    tables (171 rows total) via generated `INSERT`s built from a REST export, then the 9
    `valet-photos` storage objects via `supabase storage cp`. Every row and every photo
    was verified byte/field-identical against the source before cutover (password
    hashes, the `valet_accounts.created_by` self-reference, jsonb photo arrays, storage
    object byte sizes — all matched exactly).
    - **The earlier note above about needing a Super Admin password reset was wrong.**
      No `public` table actually has a live FK to `auth.users` in practice —
      `profiles.id` does reference it, but nothing else references `profiles`, and
      `handle_new_user()` grants `super_admin` to the *first* signup whenever `profiles`
      is empty (`20260712082304_fix_handle_new_user_role_cast.sql`). So `profiles` was
      deliberately **not** migrated — the Super Admin just needs to sign up fresh once
      against the new project (`/login` → "sign up", or an invite) and gets `super_admin`
      automatically. No Supabase Auth data had to move at all.
    - **The real time sink was a Vercel dashboard trap, not the migration itself**:
      editing an existing **Sensitive** environment variable shows a masked-dot
      placeholder in the value field instead of the real secret, and a paste that
      doesn't fully overwrite that placeholder end-to-end leaves literal bullet
      characters (`•`) baked into the *stored* value — not just a display artifact. This
      silently broke both `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
      `SUPABASE_SERVICE_ROLE_KEY` (confirmed via a temporary diagnostic route that
      decoded the unsigned JWT payload — `segmentCount` was 1 instead of 3, i.e. zero
      `.` separators, with real content at the start and bullets at the end). **Fix:
      delete the variable and re-add it fresh, never edit an existing Sensitive var in
      place.**
    - **Old project** (`iennufkectrehbluhxgl`, Tokyo) was kept running untouched as a
      rollback fallback through verification, then **permanently deleted** once the cutover
      was confirmed working end-to-end against real migrated data.
    - **Result**: a warm authenticated request that does a session lookup plus a real
      dashboard query (previously ~1.0s end-to-end before any of this work, ~350ms after
      the Mumbai-functions-only fix) now completes in **~250–280ms**.
  - **Android was not changed in this pass**: no Java runtime is installed in this
    environment, so Kotlin changes couldn't be compiled, let alone tested. Worth knowing
    before chasing Android code: `isMinifyEnabled = false` even for `release` and there's
    no baseline profile, and the `debug` build type points at `10.0.2.2:3000` — **if the
    app is being judged on a debug build, that alone explains a lot**, since debug Compose
    is dramatically slower than release. Two safe wins remain unimplemented: the
    `HttpLoggingInterceptor` in `AppContainer.kt` is added unconditionally (including
    release), and the 20s notifications poll has no `repeatOnLifecycle`, so it keeps
    hitting the network while the app is backgrounded. *(Both landed in the next pass
    below — this bullet is kept for the historical record of what blocked them here.)*

- **Performance pass #2 (web + Android) — no UI/UX or functionality change, by design.**
  A follow-up pass explicitly scoped to changes with zero visible/behavioral difference:
  smaller assets, one fewer cold-render bailout, cached reference-data reads, and three
  Android fixes that were blocked in the pass above.
  - **Web — hero image**: `public/img/valet-hero-mobile.png` (975KB PNG, `priority`, on
    the mobile dashboard's LCP path) re-encoded via `sharp` (already a transitive
    dependency, used for Next's own image optimizer) to WebP at quality 90 — **94KB, a
    ~10x reduction** — visually confirmed byte-for-byte-equivalent-looking via direct
    side-by-side comparison. `next/image`'s `src` updated to the new `.webp` path; the
    PNG was deleted, not kept alongside.
  - **Web — `useSearchParams()` Suspense boundary**: `app-shell.tsx` called it directly
    with no `<Suspense>` ancestor, which is invalid per Next's own rules for this API even
    though it was a no-op today (every route using `AppShell` is already forced dynamic by
    `getValetSession()`'s `cookies()` call, confirmed via a clean `npm run build` with no
    warnings before *and* after). Fixed by extracting the search box into its own
    `SearchForm` component wrapped in `<Suspense fallback={<SearchFormFallback />}>`,
    where the fallback renders the identical markup minus the parts that need the
    resolved query — pure future-proofing, not a speedup.
  - **Web — cached reference-data reads**: `vehicle_types` and `tariff_rules` are
    re-queried on every Live Queue load despite changing only via the Settings page.
    Wrapped both in `unstable_cache` (`getCachedVehicleTypes`/`getCachedTariffRules` in
    `lib/parking-admin/queue.ts`), tagged per-site with a 60s revalidate as a self-healing
    safety net. Invalidated via `updateTag()` (this Next version's
    read-your-own-writes-in-a-Server-Action API — **not** `revalidateTag`, which now
    requires a second `profile` argument and is meant for Route Handlers/webhooks; see
    `node_modules/next/dist/docs/.../updateTag.md`, required reading per this repo's own
    `AGENTS.md` warning that this Next version isn't the one in anyone's training data) in
    every write path — including a **second, independent** `tariff_rules` writer in the
    Super Admin portal (`app/dashboard/parking-spaces/actions.ts`) that would otherwise
    have let a Super Admin pricing edit go silently stale on the Parking Admin side.
    `zones`/`slots` were deliberately **excluded** from caching — they embed live
    `slots.status`, written directly by ticket mutations outside the Settings actions, so
    caching them would show stale occupancy. Verified live: added a throwaway vehicle
    type in Settings, confirmed it appeared in the Live Queue's check-in picker on the
    very next load with zero delay.
  - **Android — the two items blocked in the prior pass, plus one more, all now
    verified**: the JBR bundled with Android Studio
    (`/Applications/Android\ Studio.app/Contents/jbr/Contents/Home`) works as `JAVA_HOME`
    when the bare system `java` doesn't — that part was never actually the blocker; the
    real one (disk space, `~/.gradle` cache had filled the volume) resolved itself between
    sessions. `HttpLoggingInterceptor` now gated behind `BuildConfig.DEBUG` in
    `AppContainer.kt`. The 20s notifications poll (`NotificationsViewModel.pollWhileActive`
    + `NotificationsBell`) is now driven by `lifecycleOwner.lifecycle.repeatOnLifecycle
    (Lifecycle.State.STARTED)` instead of a bare `viewModelScope.launch { while(true) }`,
    so it pauses while backgrounded and resumes with an immediate refresh on return —
    zero difference while the app is actually in use. Two small `listOf(...)` literals
    rebuilt every recomposition (`QueueScreen.kt`'s `TodaysSummaryStrip`,
    `DashboardScreen.kt`'s `MyStatusCard`) wrapped in `remember` (keyed on `tickets` +
    `colors` for the former, since those genuinely change; unkeyed for the latter, since
    it's fully static). The Home-screen hero (`img_hero_valet.png`, 953KB, same
    photo as the web one) got the identical WebP re-encode treatment. **All verified for
    real**: booted the project's `Pixel_10_Pro` AVD, installed a freshly built debug APK,
    logged in against the local dev server (the debug build already points at
    `10.0.2.2:3000`), and visually confirmed the hero image, the live `TodaysSummaryStrip`
    counts (7 Active / 3 Parked / 2 Requested, matching real seeded data), and normal
    login/dashboard/queue behavior — not just a successful `./gradlew assembleDebug`.
  - **Deliberately excluded, not silently skipped**: R8/minify (no `proguard-rules.pro`
    exists at all, and Gson's reflection-based DTO parsing could break in ways this
    environment can't fully regression-test) and the Compose BOM bump (2024.10.01 →
    2026.06.01 is ~20 releases, real risk of shifting recomposition/animation timing under
    a zero-behavior-change mandate) — both explicit user calls, not oversights. Revisit
    either with a session that can run a full release-build regression pass.

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

- **OCR-assisted plate scanning at check-in + Marketplace (ANPR vendor management)** —
  the one AI feature not deferred (see Architecture decisions below for why this is an
  intentional exception, not scope creep).
  - **Check-in flow**: a camera icon on the vehicle-number field lets the operator
    photograph the plate; the suggested text pre-fills the field but is always
    operator-editable before submit — never auto-validated or auto-submitted. Default
    engine is **OCR.space** (`lib/ocr-worker.ts`'s `runOcr`, free tier, 25k
    requests/month), with a regex parser (`lib/plate-ocr.ts`'s `parsePlateFromText`)
    that tolerates the two real failure modes hit during testing: a two-line plate
    where the line break lands mid-group, and a blue "IND" country-stamp mark that OCR
    reads as literal text sitting in the middle of the plate number.
  - **Marketplace** (`/dashboard/marketplace`, Super Admin only): a catalog of
    third-party ANPR vendors (`marketplace_categories`/`marketplace_apps`/
    `organization_app_assignments` tables) a Super Admin can configure with an API
    key/endpoint and assign per-organization, independent of any code change — assigning
    a vendor to an org routes that org's check-in plate scans through it instead of the
    OCR.space default. **Kotai Electronics** (Bearer-token REST API) is the one vendor
    with a real working adapter; **Circuit Digest** is catalog-only (no usable API docs
    were ever supplied, so no adapter exists — flip it on and it just silently falls
    back to OCR.space, by design); **CarmenCloud** was investigated (full API contract
    documented) but the given API key was rejected by CarmenCloud's own service with an
    explicit-deny error across every region tested, including their own documentation's
    example — **on hold pending the account/key issue being resolved on CarmenCloud's
    side**, no code was written for it.
  - **FastALPR (self-hosted)** — a quota-free alternative added after Kotai's demo key
    hit its free-trial limit and CarmenCloud's key was rejected outright. Wraps
    [fast-alpr](https://github.com/ankandrew/fast-alpr) (MIT license, ONNX-based, no
    per-call cost) in a small FastAPI service (`alpr-service/` at the repo root — a
    separate Python/Docker deploy, not part of the Next.js app) hosted on Render's free
    tier. See `CLAUDE.md`'s ANPR section for the accuracy findings (real-photo batch
    testing found this — and every alternative tried, including an India-specific
    open-source model — has a meaningful garbled/wrong-read rate) and the
    format-validation safety net now in place to catch it. **Known limitation**:
    Render's free tier spins the service down after inactivity, so the first request
    after a quiet period pays a real cold-start delay (potentially tens of seconds)
    before falling into its normal ~2-4s response time — upgrading that one Render
    service off the free tier removes this if it becomes a real operational problem.
  - **Super Admin can now reset a Parking Admin's login password from the UI** (see
    Test accounts below) — closes a gap that previously required a direct SQL query.

All other AI features remain deferred by design (see Architecture decisions above).

## Architecture decisions worth knowing before you continue

- **Backend is Supabase-native**, not the custom NestJS/Redis/MQTT stack described in the
  original platform PRD — RLS + Supabase Auth + Storage instead, to match the Supabase
  project already connected to this GitHub repo.
- **Parking Admin / Valet Operator auth is deliberately separate from Supabase Auth**
  (explicit user decision, not a shortcut) — a standalone username/password system. See
  `CLAUDE.md`'s Auth model section before touching anything under
  `src/lib/valet-auth/` or `src/app/parking-admin/`.
- **AI features are mostly still deferred, with one exception**: damage-detection
  computer vision, predictive ETA, smart slot allocation, and staffing analytics remain
  explicitly out of scope until the manual workflow is solid end-to-end — don't add
  them opportunistically. **ANPR OCR plate scanning at check-in has since been built**
  (see the What's built bullet below and `CLAUDE.md`'s ANPR section) — that line is
  intentionally an exception to the "AI stays deferred" rule, not evidence the rule
  changed generally.
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
- **Push notification delivery is unverified for real**: the Phase C work above confirmed
  the send path never blocks a dispatch and correctly no-ops for operators with zero
  tokens, but no real Android device or browser-with-permission-granted was available in
  this sandboxed environment, so an actual notification landing on a real phone/browser
  has not been observed firsthand — worth a quick real-device/real-browser check.
- **No ANPR vendor tested so far is reliable enough to trust unattended** — the best
  option found (self-hosted FastALPR) still returns a wrong-but-well-formed plate often
  enough that it slipped past the format-validation safety net in testing (one
  single-letter misread confirmed by eye: `KA53HA4481` returned for actual
  `KA53MA4481`). The check-in UI's "operator confirms/edits before submit" design is
  load-bearing here, not just a nicety — don't ever wire plate OCR to auto-submit
  without a human in the loop, on any vendor.
- CarmenCloud (a candidate second real ANPR vendor) is blocked on the vendor's own
  side — the provided API key is rejected with an explicit-deny error on every region
  endpoint, including CarmenCloud's own documented example. No code exists for it; pick
  this back up once the account/key issue is resolved externally.
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
- **`alpr-service` (the self-hosted FastALPR wrapper) is deployed separately on
  Render**, not Vercel — a Web Service pointed at `alpr-service/` in this repo (Root
  Directory `alpr-service`, Dockerfile Path `Dockerfile` — see `CLAUDE.md`'s ANPR
  section for the Root-Directory/Dockerfile-Path gotcha that broke the first deploy
  attempt). Its `ALPR_API_KEY` env var (set in Render's dashboard) must match the "API
  key" value entered for the FastALPR row in Super Admin's Marketplace UI — they're the
  same shared secret, not a vendor-issued key. If FastALPR stops working, check Render's
  own dashboard/logs for that service first (separate from Vercel's).
- Env vars live in Vercel's Production environment settings (not just `.env.local` —
  update both if they ever rotate): `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, plus three added for
  push notifications (Phase C above): `FIREBASE_SERVICE_ACCOUNT_JSON` (the Firebase
  project's service-account key, full JSON as a single-line string — used server-side
  only, for FCM HTTP v1 auth), `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` (Web Push,
  generated via the `web-push` package's `generateVAPIDKeys()`), and
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (same public key, client-exposed so mweb's subscribe
  flow can read it). The Android app's own Firebase config (`google-services.json`) is
  gitignored — it lives only on the machine that built the release APK; ask the project
  owner if a fresh environment needs to rebuild the Android app from scratch.

## Test accounts

- **Super Admin**: `mail.instaparkai@gmail.com`, password set by the project owner
  directly (not stored anywhere in this repo).
- **Parking Admin** (test site "Hotel Parking Test"): username `hotelvikas`. Password has
  been reset multiple times during verification passes (the original was
  unknown/unrecorded) — most recently to `Reset-Test-9f3kQ2` while verifying the ANPR
  work below; treat it as a disposable test credential, not a stable one, and expect it
  to change again next time someone needs to verify against this account. A Super Admin
  can now reset a Parking Admin's password directly from the UI ("Reset password" next
  to "Edit sites"/"Delete" on the Organization detail page's Parking Admins list,
  `resetParkingAdminPassword` in `parking-admin-actions.ts`) — the old
  `npx supabase db query --linked` + manual `hashPassword()` workaround is no longer the
  only option, though it still works if needed.
- **Valet Operators** (same test site): `testoperator` (Test Operator Final) and `valet1`
  (Ravi Kumar) — both created during verification (operator-login flow, then reused for
  Phase A's round-robin/availability testing, which needed 2+ operators). Passwords
  shared with the project owner directly, not stored in this repo. Safe to delete from
  the Valet Operators tab if no longer needed.

## Suggested next steps

Roughly in order (matches the phased plan this project has been following):

1. **Physical-device smoke test of the Android release APK (v0.4.0)** — install it on a
   real staff phone and confirm two things that couldn't be verified in this sandboxed
   environment: photo capture (the emulator's own camera pipeline is known-flaky, see
   Known gaps in earlier phases — unrelated to app code) and, new in this batch, that a
   `vehicle_dispatched` push notification actually lands in the system tray with the
   expected vibration.
2. **Real-browser check of mweb Web Push** — grant notification permission in an actual
   mobile browser (not this sandboxed one, which reports `Notification.permission:
   "denied"` globally and can't exercise the "Enable notifications" banner) and confirm a
   dispatch triggers a real browser notification end to end.
3. Collect a guest email at check-in (+ `valet_tickets.guest_email` column) so the
   already-built Email channel in Communication triggers can actually fire.
4. Delivered/read message tracking via Twilio status-callback + SendGrid event webhooks.
5. AI enhancements — only after the above is live and there's real usage data to build
   against.
6. If Android distribution ever needs to grow beyond handing staff a signed APK
   directly (auto-update, wider rollout), revisit Play Console's internal testing track
   — that needs a Google Play Developer account (real Google account, $25 one-time fee,
   identity verification) that doesn't exist yet for this project.
7. Resolve the CarmenCloud API key/account issue (rejected with an explicit-deny error)
   if a second real ANPR vendor is still wanted — the integration itself is fully
   designed and ready to build the moment the key works.
8. If FastALPR's cold-start delay (Render free tier) turns into a real operator
   complaint, upgrading that one Render service off the free tier is the fix — no code
   changes needed.
