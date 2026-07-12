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
  `CLAUDE.md` for why and how this works. Verified: `valet_operator` accounts are blocked
  from this web dashboard (parking_admin-only) since they're Android-app-only per plan.
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
  (`/parking-admin/operators`) for the Parking Admin to create/deactivate/delete
  `valet_operator` accounts for their site. Fare is auto-suggested at handover from the
  site's tariff rules (`src/lib/tariff.ts`) but always operator-editable — no payment
  gateway, matches the "GPay screenshot + mark collected" design.
- "Vehicles" (full vehicle log/reports), "Reports", "Communication", and "Settings" nav
  items are still stubs (`href: null` in `src/components/shell/nav-config.ts`).
- **Guest tracking page** (Phase D): public `/track/[ticket_token]` route, no login. Shows
  a status timeline (Parked → Requested → On the way → Arrived), a "Request my vehicle"
  button (parked stage only), the handover OTP once the vehicle has arrived, and a
  delivered/fare summary once completed. Auto-refreshes every 6s via
  `src/app/track/[token]/status-poller.tsx` (plain polling, not Supabase Realtime, since
  guest sessions aren't Supabase-authenticated). The Live Queue page has a "Guest link"
  copy-to-clipboard button per row (`src/app/parking-admin/(authenticated)/queue/copy-link-button.tsx`)
  for staff to share the link — no SMS/WhatsApp delivery yet (that's Communication
  settings, still a stub).

**Not started**: photo capture UI (check-in/handover, 4-side + odometer), SMS/WhatsApp
delivery of the guest tracking link, the Android operator app, and all AI features
(deferred by design — see below).

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
- Check-in/handover photo capture (4-side + odometer) isn't built — the `valet-photos`
  Storage bucket exists but nothing uploads to it yet.
- The guest tracking link (`/track/[token]`) has to be copied and sent manually today
  (Parking Admin clicks "Guest link" on the Live Queue row) — no automatic SMS/WhatsApp
  delivery at check-in yet (needs Communication settings + a messaging provider).
- Fare suggestion at handover (`src/lib/tariff.ts`) is best-effort (duration × tariff
  rule) and always operator-editable — it isn't wired into any billing/ledger system.

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
- **Parking Admin** (test site "Hotel Parking Test"): username `hotelvikas`, password set
  during initial testing. If it's needed and unknown, a Super Admin can't currently reset
  a Parking Admin's password through the UI (not built yet) — reset it directly via
  `npx supabase db query --linked` by generating a new hash with
  `src/lib/valet-auth/password.ts`'s `hashPassword()`, or delete and recreate the account
  from the parking space's detail page in the Super Admin portal.

## Suggested next steps

Roughly in order (matches the phased plan this project has been following):

1. **Check-in/handover photo capture** — wire the existing `valet-photos` Storage bucket
   into the check-in and handover dialogs (4-side + odometer photos).
2. **Reports & full vehicle log** — a `/parking-admin/vehicles` or similar page showing
   all tickets (including completed), turnaround/operator stats; currently only the
   active Live Queue is surfaced.
3. **Communication settings** (Phase C remainder): per-site WhatsApp/SMS/Email toggles +
   the site's own fresh Twilio/SendGrid/AiSensy credentials (never reuse anything from the
   old reference doc — see above) — needed to auto-send the `/track/[token]` link at
   check-in instead of staff copying it manually.
4. **Android operator app** (Phase E): native Kotlin/Compose, consuming a small JSON API
   under this Next.js app (bearer-token auth, since the Android app can't use Supabase's
   client SDK against the custom `valet_accounts` session model).
5. AI enhancements — only after the above is live and there's real usage data to build
   against.
