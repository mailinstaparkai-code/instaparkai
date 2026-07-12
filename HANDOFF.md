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

**Valet Parking Application — Phase A only** (auth foundation):
- Separate username/password auth for `parking_admin` / `valet_operator` roles
  (`valet_accounts` / `valet_sessions` tables), independent of Supabase Auth — see
  `CLAUDE.md` for why and how this works
- `valet_parking_enabled` feature flag per parking space; Super Admin can toggle it and
  create the first Parking Admin account for a site
- A seeded test site ("Hotel Parking Test") with a Parking Admin account — see **Test
  accounts** below
- Parking Admin dashboard is currently a stub (greeting + placeholder KPI cards) — no
  real queue/check-in/reporting functionality yet

**Not started**: valet vehicle data model (check-in/status/OTP/photos), the full Parking
Admin operations dashboard, the guest tracking page, the Android operator app, and all AI
features (deferred by design — see below).

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
- Tariff Engine doesn't yet support slab-based pricing (e.g. "first hour ₹20, next hour
  ₹40") — only flat/hourly/surge. Needed for the valet Phase B build.
- No payment gateway integration anywhere yet (valet payment collection is planned to be
  manual — GPay screenshot + "mark collected" — not a gateway integration).

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

1. **Slab-based tariff pricing** — small schema + UI addition to the existing Tariff
   Engine.
2. **Valet vehicle data model** (Phase B): check-in/status lifecycle, OTP, photos in
   Supabase Storage.
3. **Parking Admin operations dashboard** (Phase C): replace the current stub with the
   real live queue, Valet Operator user management, reports, communication settings.
4. **Guest tracking page** (Phase D): public `/track/[token]` route.
5. **Android operator app** (Phase E): native Kotlin/Compose, consuming a small JSON API
   under this Next.js app (bearer-token auth, since the Android app can't use Supabase's
   client SDK against the custom `valet_accounts` session model).
6. AI enhancements — only after the above is live and there's real usage data to build
   against.
