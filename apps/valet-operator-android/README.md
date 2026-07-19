# InstaPark Valet — Android app

Native Android app (Kotlin + Jetpack Compose) for the `parking_admin` and
`valet_operator` roles, consuming the JSON API at `apps/super-admin/src/app/api/
parking-admin/v1/*`. See `/Users/siddharthasaha/.claude/plans/crispy-gathering-kitten.md`
(or the equivalent plan doc) for the full phased build plan.

## Building locally

This machine's system `java`/`gradle` aren't set up, but Android Studio's bundled JBR
works fine. Either open the project in Android Studio directly, or from the CLI:

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
./gradlew assembleDebug
```

Create `local.properties` (gitignored, machine-specific) pointing at your SDK:

```
sdk.dir=/Users/<you>/Library/Android/sdk
```

## Running against the dev API

The debug build's `BuildConfig.API_BASE_URL` points at `http://10.0.2.2:3000/api/
parking-admin/v1/` — the standard Android-emulator alias for the host machine's
localhost, where `next dev` runs (see `apps/super-admin`). Start that dev server first,
then run the app on an emulator (not a physical device, which can't reach `10.0.2.2`).

The release build points at the production Vercel deployment.

## Status

Phase 1 complete and verified end-to-end on the `Pixel_10_Pro` emulator against the
dev API (`next dev` + `10.0.2.2`): login (real bearer-token auth, wrong-password error
handling), Dashboard (greeting, site badge, KPI tiles matching the API response),
Vehicles (record count, stats, status filter chips, ticket cards with fare/operator
detail), Profile (name/role display, working sign-out that deletes the session
server-side).

Phase 2 complete and verified end-to-end on-device: `QueueScreen` with status filter
chips, role-gated auto-allocate toggle, and the full ticket lifecycle exercised
against the live dev API — check-in, mark parked (slot picker), guest requested
(auto-allocate correctly no-ops when no operator has a daily "in" status, matching
web), manual dispatch (operator picker with daily-status badges), mark arrived,
complete handover (OTP validation with a live wrong-OTP error path, fare, payment
toggle), edit details, and void — all backed by 11 new REST endpoints under
`/api/parking-admin/v1/queue/*` sharing `lib/parking-admin/queue.ts` with the
existing web Server Actions (zero business-logic fork). Check-in and handover don't
send photos yet — that's Phase 3 (CameraX capture + multipart upload).
