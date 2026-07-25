# InstaPark AI — CLAUDE.md

Instructions and context for Claude Code (or any future contributor) working in this
repo. See [`HANDOFF.md`](./HANDOFF.md) for project status and next steps, and
[`design.md`](./design.md) for the design system.

## What this is

InstaPark AI is an enterprise parking management platform, built in phases:

1. **Super Admin Portal** (done) — the platform owner's console: organizations, parking
   sites, zones, slots, access workflows, tariff rules.
2. **Valet Parking Application** (in progress) — a Parking Admin dashboard, a native
   Android operator app, and a link-based guest tracker, layered on top of a specific
   parking site.

## Repo structure

```
InstaParkAI/
  apps/
    super-admin/           Next.js app — Super Admin portal + Parking Admin dashboard
                            + the JSON API the Android app consumes (`src/app/api/
                            parking-admin/v1/*`)
    valet-operator-android/ Kotlin + Jetpack Compose native app (parking_admin /
                            valet_operator roles). `releases/*.apk` holds signed builds,
                            checked into git by deliberate carve-out — see that app's
                            README.md before touching `.gitignore` there.
  supabase/
    migrations/          SQL migrations, applied via `supabase db push` (see below)
  design.md               Design system: colors, type, spacing, components, motion
  CLAUDE.md                This file
  HANDOFF.md               Project status, access notes, what's next
```

No separate dweb/mweb web app — mweb is served from the same Next.js app under
`/parking-admin/m/*` (own route tree, own `MobileAppShell`), not a second deployment.

## Stack

- **Backend**: Supabase — Postgres + RLS, Supabase Auth, Storage. No custom backend
  server; all data access is via the Supabase client (RLS-scoped) or the service-role
  client (see Auth model below).
- **Frontend**: Next.js (App Router, Turbopack), Tailwind CSS v4, shadcn/ui
  (`@base-ui-components/react` under the hood, not Radix), `lucide-react` icons,
  `next-themes` for light/dark.
- **Hosting**: Vercel (project `insta-park-ai/instaparkai-super-admin`).

## Auth model — two separate systems, intentionally

This is the single most important thing to understand before touching auth code.

1. **`super_admin`** (and legacy `site_admin`, unused going forward) — real **Supabase
   Auth** users. Session lives in Supabase's own cookies, checked via
   `src/lib/supabase/server.ts` / `client.ts`. RLS policies (`is_super_admin()`,
   `current_site_id()` SQL functions) gate access to `organizations`, `parking_spaces`,
   `zones`, `slots`, `access_workflows`, `tariff_rules`.

2. **`parking_admin` / `valet_operator`** — a **fully separate, custom username/password
   system** (`valet_accounts` + `valet_sessions` tables), *not* Supabase Auth. This was a
   deliberate choice (not a shortcut) — see `HANDOFF.md` for why. Consequences:
   - These sessions carry no `auth.uid()`, so the RLS policies above don't apply to them.
   - `valet_accounts` / `valet_sessions` have RLS **enabled with no policies** — deny-all
     for `anon`/`authenticated`. All access goes through server-side code using the
     **service-role client** (`src/lib/supabase/service.ts`), which bypasses RLS by
     design. **Authorization for these tables lives in application code, not Postgres.**
     Any new Server Action or Route Handler touching `valet_accounts`/`valet_sessions`
     must check the caller's role/site itself — there is no database safety net.
   - Passwords: Node's built-in `crypto.scrypt` (`src/lib/valet-auth/password.ts`), not a
     third-party hashing lib.
   - Sessions: random token, only the SHA-256 hash stored server-side, set as an httpOnly
     cookie (`src/lib/valet-auth/session.ts`).
   - Login lives at `/parking-admin/login`, separate from `/login` (Supabase Auth,
     `super_admin` only). `src/proxy.ts` → `src/lib/supabase/proxy.ts` protects both route
     trees independently — the `/parking-admin/*` branch only does a cheap cookie-presence
     check (no `node:crypto` at the edge); the real, DB-verified check happens in the
     page/layout via `getValetSession()`.

## Database conventions

- Every table has an `updated_at` trigger via the shared `public.set_updated_at()`
  function — reuse it, don't write a new one per table.
- RLS pattern for platform tables: a policy for `super_admin` (`using (is_super_admin())`)
  granting full access, plus a narrower `site_admin`-scoped read policy where relevant.
  `is_super_admin()` and `current_site_id()` (both `SECURITY DEFINER`) exist specifically
  to avoid recursive-RLS issues when a policy needs to query `profiles` itself — reuse
  them rather than inlining a `profiles` subquery in a new policy.
- **Enum columns**: never assign a bare `CASE WHEN ... THEN 'a' ELSE 'b' END` to an enum
  column without an explicit `::enum_type` cast. Postgres resolves two string-literal
  `CASE` branches to `text` (not "unknown"/literal), and there's no implicit `text →
  enum` cast — this silently breaks at runtime, not at migration-apply time. (Real bug
  hit in this repo: see migration `20260712082304_fix_handle_new_user_role_cast.sql`.)
- **PostgREST embeds**: a `child(count)` embed through a table with a **unique** FK
  (one-to-one) returns a single object or `null`, not an array — unlike a normal
  one-to-many embed, which returns `[]`/`[...]`. Check the FK's uniqueness before writing
  `.foo[0]` — if it's unique, that's a bug waiting to crash on the first row.

## Frontend conventions

- **Server → Client Component boundary**: never pass a bare component reference (e.g. a
  `lucide-react` icon component, `icon={SomeIcon}`) as a prop from a Server Component
  into a Client Component — React can't serialize a function/class across that boundary
  and it throws at request time (not build time). Render it first
  (`icon={<SomeIcon className="size-5" />}`) and pass the resulting element instead.
- **Clickable cards with a kebab menu** (`components/parking-spaces/components/
  entity-card.tsx` is the reference implementation): the whole-card link is an absolutely
  positioned `<Link>` at the back of the stack; only the kebab trigger gets `relative
  z-10` to sit above it. Do **not** add `z-10`/`relative` to other content wrappers
  (badges, stats, etc.) "for safety" — that creates dead click zones that swallow clicks
  meant for the underlying link (hit this exact bug once already in this section).
- **Dialogs bound to a Server Action**: prefer the `FormDialog` /
  `ConfirmDeleteDialog` components (`app/dashboard/parking-spaces/components/`) over a
  raw `<form action={serverAction}>` inside a shadcn `Dialog` — the raw version doesn't
  close itself after a successful submit (a real bug we hit and fixed). Both components
  call the action programmatically via `onSubmit` and close on success.
- This app's Next.js version renamed the `middleware.ts` convention to `proxy.ts`
  (exporting a function named `proxy`, not `middleware`) — don't "fix" `src/proxy.ts`
  back to the old convention.
- Design tokens live in `apps/super-admin/src/app/globals.css` as CSS variables, driven
  by `design.md`. Don't hardcode a raw hex/px value in a component — add or reuse a
  token.
- **A disabled action button needs a reachable explanation, not just `disabled={...}`**
  (`dispatch-operator-button.tsx` had this bug: the trigger was `disabled={!operators
  .length}`, so the dialog's own fallback message — "No operators are currently
  available." — could never actually render, since the dialog never opened while
  disabled). Prefer leaving the trigger enabled and explaining the empty/blocked state
  inside the dialog/panel it opens, over silently disabling it with no indication why.

## Performance: latency here is round-trips, not SQL

Read this before "optimizing" a slow page — the intuitive fixes are the wrong ones in
this app.

- **The tables are tiny** (order of tens of rows). Postgres will sequential-scan them
  faster than it can use an index, so query tuning and new indexes buy **nothing**
  measurable today. The indexes in `20260725012309_hot_path_indexes.sql` are
  future-proofing and say so in their own header comment — don't credit them with a
  speedup.
- **What actually costs time is each network round-trip from the serverless function to
  Supabase**, and the *first* query in a function invocation additionally pays a TLS
  handshake. Functions (`bom1`/Mumbai, `apps/super-admin/vercel.json`) and Supabase
  (`ap-south-1`/Mumbai, moved from Tokyo — see HANDOFF.md) are now co-located, so this
  matters less than it used to, but the lever is still always **reduce the number of
  sequential round-trips**: `Promise.all` independent queries, wrap per-request-stable
  reads in React `cache()`, and cache genuinely low-churn reference data
  (`getCachedVehicleTypes`/`getCachedTariffRules` in `lib/parking-admin/queue.ts`) with
  `unstable_cache` — never cache anything that embeds live mutable state (e.g. `zones`'
  embedded `slots.status`).
- **This Next.js version's `revalidateTag`/`unstable_cache` cache-invalidation APIs are
  not the ones in anyone's training data** (per this repo's own `AGENTS.md` — read
  `node_modules/next/dist/docs/` before writing cache-invalidation code). `revalidateTag`
  now **requires a second `profile` argument** (`revalidateTag(tag, "max")` or `{expire}`)
  and is meant for Route Handlers/webhooks with stale-while-revalidate semantics; calling
  it with one argument is deprecated and will eventually error. Inside a **Server
  Action** — which is every mutation path in this app — use `updateTag(tag)` instead: it
  immediately expires the tag for read-your-own-writes, and is the only one of the two
  that works there. Getting this backwards doesn't fail loudly at the call site; it shows
  up as a stale-data bug (or a TypeScript arity error, if you're lucky) somewhere else
  entirely.
- `getValetSession` / `getValetSessionFromToken` (`lib/valet-auth/session.ts`) and
  `getSiteRow` (`lib/parking-admin/queue.ts`) are **deliberately `cache()`-wrapped** —
  every route verifies the session twice (once in `layout.tsx`, once in `page.tsx`), and
  `getSiteName`/`isAutoAllocateEnabled` read the same `parking_spaces` row. Don't unwrap
  them.
- `createServiceClient()` returns a **shared instance**, not a fresh client per call —
  safe because it's stateless and always the same service-role principal. The
  cookie-bound `server.ts` client must stay per-request; don't "fix" that one to match.
- **Measuring**: `pg_stat_statements` is enabled on the remote project, so you can count
  real queries for one page load —
  `select sum(calls) from pg_stat_statements where query ilike '%<table>%'` before and
  after. Watch out for the notifications bell (polls every 20s) confounding the count:
  measure from a page that isn't open, or via `curl` with a session cookie.
- **`ReturnType<typeof createSupabaseClient>` silently destroys the generated table
  types** (every row degrades to `never`, producing dozens of errors far from the actual
  change). Type off a local factory function instead — see `lib/supabase/service.ts`.

## Working with Supabase locally

- No local Supabase stack — Docker isn't set up in this environment, and migrations are
  applied straight to the linked remote project:
  ```bash
  npx supabase migration new <name>   # create a new migration file
  npx supabase db push                # apply pending migrations to the remote project
  npx supabase db query --linked "<sql>"   # ad-hoc read query against the remote project
  ```
- Service-role operations (creating `valet_accounts`, etc.) from a one-off script:
  prefer `npx supabase db query --linked` or a Server Action over a bare Node script —
  the plain `@supabase/supabase-js` client's realtime module can throw on this Node
  version outside of Next.js's runtime.

## Deploying

- `git push` triggers Vercel's GitHub integration automatically, **but** in this
  environment it has intermittently gotten stuck/cancelled — if that happens, deploy
  manually and it works fine:
  ```bash
  vercel deploy --prod --yes
  ```
- **`vercel.json` lives at `apps/super-admin/vercel.json`, not the repo root** — Vercel
  reads it from the configured Root Directory, so a copy at the root is silently ignored.
  It currently pins functions to `bom1` (Mumbai); see the Performance section above for
  why that matters.
- **Always run this from the repo root** (`/Users/siddharthasaha/InstaParkAI`), never
  from `apps/super-admin`. The Vercel project's Root Directory is configured as
  `apps/super-admin`; running the CLI from inside that directory double-applies it and
  can silently deploy to (or auto-create) a *different* Vercel project instead of
  erroring. **This caused a real multi-hour production outage once** — see `HANDOFF.md`'s
  Accounts & access section for the full story and the `curl` sanity check to run after
  every manual deploy.
- Env vars (already set in the Vercel project's Production environment — update there,
  not just `.env.local`, if they ever rotate): `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, plus
  `FIREBASE_SERVICE_ACCOUNT_JSON` / `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` /
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY` for push notifications (see `HANDOFF.md`'s Phase C
  section).

## Native Android app (`apps/valet-operator-android`)

- Shares zero business logic with the web app by forking — it's a separate Kotlin
  codebase that consumes the same JSON API (`apps/super-admin/src/app/api/
  parking-admin/v1/*`), which itself is backed by the same `lib/parking-admin/*`
  functions the web Server Actions call. Fix a bug in the underlying `lib/` function once
  and both web and Android pick it up; a bug in Android's own Kotlin (rendering,
  validation, etc.) needs a matching fix there specifically.
- New tables for `parking_admin`/`valet_operator`-owned data (e.g. `valet_push_tokens`)
  should follow the same deny-all-RLS / service-role-only pattern as
  `valet_accounts`/`valet_sessions` (see Auth model above) — not the `super_admin`
  RLS-policy pattern.
- **Firebase BOM 34.x gotcha**: `firebase-messaging-ktx` (and other `-ktx` Firebase
  artifacts) no longer exist as of BOM 34.0.0 — Firebase folded the Kotlin extension
  APIs into the main artifacts and dropped the separate `-ktx` modules from the BOM's
  constraint list in July 2025. Depend on `com.google.firebase:firebase-messaging`
  directly (no `-ktx` suffix); the KTX-style APIs still work, just from that artifact.
- `google-services.json` (the Firebase project config) is gitignored — machine-local,
  not committed. A fresh clone can't build the Firebase-dependent parts (push
  notifications) without the project owner supplying a fresh copy.
- See that app's own `README.md` for build/signing/release-versioning instructions —
  don't duplicate them here.

## Where to look next

- [`HANDOFF.md`](./HANDOFF.md) — current status, access/account notes, what's next.
- [`design.md`](./design.md) — the full design system.
- `supabase/migrations/` — read in order for the full schema history; each file's header
  comment explains *why*, not just *what*.
