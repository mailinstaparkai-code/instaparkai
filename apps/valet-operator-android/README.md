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

## Release build (signed APK, internal distribution)

Distribution is a raw signed APK handed directly to staff devices — no Play Console
(that needs a registered, paid, identity-verified Google Play Developer account, which
doesn't exist for this project). Signing config lives in a gitignored `keystore.properties`
at the repo root (`apps/valet-operator-android/keystore.properties`), read by
`app/build.gradle.kts`; the release build type falls back to unsigned if that file is
missing (e.g. a fresh clone) rather than failing outright.

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
./gradlew assembleRelease
# → app/build/outputs/apk/release/app-release.apk
```

**The keystore (`instapark-valet-release.keystore`) is the app's permanent signing
identity — back it up outside this repo (password manager / secure storage) the moment
it's generated.** Losing it means a future release build can no longer be installed as
an *update* over an existing install (Android enforces same-signer for upgrades) —
staff would need to uninstall and reinstall fresh, losing local app state (not account
data, that's server-side). Regenerating a keystore is not a recovery path, only a
new identity.

To install directly from this machine (uninstall first if a differently-signed debug
build is already on the device — Android refuses to install a same-package,
different-signature APK over an existing one):

```bash
adb install -r app/build/outputs/apk/release/app-release.apk
```

## Versioned releases (checked into git)

By project decision, built release APKs are committed into `releases/` in this
directory rather than distributed out-of-band — `releases/*.apk` is **not** gitignored
(everything else under `app/build/` is; this is a deliberate carve-out). This does mean
the repo grows by one APK's worth of history per release (~12MB today) since there's no
Git LFS set up — acceptable for a low-frequency internal-tool release cadence, but worth
revisiting with LFS if release frequency picks up a lot.

**Cutting a new release:**

1. Bump `versionCode` (integer, always +1) and `versionName` (semantic, e.g. `0.2.0`) in
   `app/build.gradle.kts`.
2. Build: `./gradlew assembleRelease` (see above — needs `keystore.properties` present).
3. Copy the output into `releases/`, named `instapark-valet-v<versionName>-build<versionCode>.apk`:
   ```bash
   cp app/build/outputs/apk/release/app-release.apk \
     releases/instapark-valet-v<versionName>-build<versionCode>.apk
   ```
4. Add a row to the table below, commit both the APK and this README edit together, push.

| Version | versionCode | Date | APK | Notes |
|---|---|---|---|---|
| 0.1.0 | 1 | 2026-07-19 | `releases/instapark-valet-v0.1.0-build1.apk` | First signed release. Phases 0–5 complete: full ticket lifecycle, photo capture, notifications, release signing. |
| 0.2.0 | 2 | 2026-07-20 | `releases/instapark-valet-v0.2.0-build2.apk` | 19th-July revamp: brand theme (dark+light, in-app toggle), real app icon, splash, Home/Queue/Vehicles redesign, operator IN/BREAK/OUT self-status, role-gated queue actions. Built on-device UNVERIFIED (emulator blocked by host disk space) — smoke test on a real device. |
| 0.3.0 | 3 | 2026-07-20 | `releases/instapark-valet-v0.3.0-build3.apk` | Premium dialog chrome (PremiumDialog shell, icon-badge headers, icon-tile vehicle-type picker, dashed photo tiles) across all 7 queue popups, matching web's matching redesign. Haptic tick + spring-based sliding animation on the My Status IN/BREAK/OUT toggle. `Modifier.animateItem()` on Queue/Vehicles lists. |
| 0.4.0 | 4 | 2026-07-20 | `releases/instapark-valet-v0.4.0-build4.apk` | Real FCM push notifications for `vehicle_dispatched` (system-tray notification + vibration, `POST_NOTIFICATIONS` runtime permission, token registered on login) — additive to the existing in-app polling bell. Edit-ticket dialog gets the IND-chip field treatment. Home hero image replaced (old asset had a stray decorative bell baked in). |
| 0.4.1 | 5 | 2026-07-25 | `releases/instapark-valet-v0.4.1-build5.apk` | Performance-only patch, zero UI/UX or functionality change: debug HTTP logging interceptor gated behind `BuildConfig.DEBUG` (was shipping in release), notifications poll now pauses via `repeatOnLifecycle(STARTED)` instead of running forever in the background, two recomposition-triggering `listOf(...)` literals wrapped in `remember`, Home hero image re-encoded PNG→WebP (953KB→~95KB, same signing identity so this installs as an update over 0.4.0). Verified on a booted emulator against **production** (not just the dev API): fresh install, real login, hero image, and hot-reload-free normal operation all confirmed working before this row was written. |
| 0.4.2 | 6 | 2026-07-26 | `releases/instapark-valet-v0.4.2-build6.apk` | Sky-blue rebrand (design.md's approved revamp package): new blue/orange token set (purple retired), Inter font bundled, borderless soft-shadow cards, outline icons throughout, slot/operator dropdowns replaced with tappable rows, OTP entry replaced with 4-box input, dialogs rebuilt as bottom sheets, capacity donut replaced with a meter bar, light-first theme default. Matches the same-pass web/mweb/PWA rebrand. Verified on a booted emulator against production: fresh install (uninstall required — this release re-signs over a debug build left on the device from the same session), login screen render, version string. |
| 0.4.3 | 7 | 2026-07-27 | `releases/instapark-valet-v0.4.3-build7.apk` | UI bug-fix + polish pass from a user bug report: splash rebuilt to the light-theme brand reference (new `ic_brand_mark`/`ic_wordmark` assets extracted from the existing icon/wordmark art), login password show/hide toggle, logo header no longer overlapping the status bar, login username/password fields no longer clipping the bottom of typed text (`OutlinedTextField` had a too-tight fixed `height(56.dp)`, swapped for `heightIn(min = 56.dp)`), dashboard hero reframed as a rounded photo card beside the greeting instead of text-over-photo, "Check-in Vehicle" text-wrap fix, tinted per-metric stat cards, on-brand auto-allocate toggle + clickable-looking queue filter tabs, Complete Handover button no longer wrapping to two lines, fully restyled notification tray. Same signing identity as 0.4.2 (verified via `apksigner verify`), installs as a clean update. Verified on a booted emulator against production: fresh install, login screen render (logo, password toggle, unclipped text), version string. |
| 0.4.4 | 8 | 2026-07-28 | `releases/instapark-valet-v0.4.4-build8.apk` | Premium v2 revamp (HANDOFF 28-Jul §10 pass on design.md §9 tokens). Login rebuilt to a photographic split card (full-bleed hero, frosted logo/status pills, gradient shimmer Sign-in) -- caught and fixed a real bug in the same pass: `Modifier.blur()` blurs a Composable's own content in Compose (not a CSS backdrop-blur), which had made the frosted card's fields unreadable; removed in favor of a translucent surface. Home reordered with a new search entry point and a combined "Next up" card (next queue ticket + capacity meter). New global Search feature: live results across active queue + vehicle history, persisted recent searches, quick actions ("Scan plate" routes to the existing manual check-in flow, no OCR). Queue/Vehicles/Profile get the new layered-gradient canvas background. Odometer check-in photo slot confirmed intact. Remember-me/forgot-password/SSO intentionally left out of scope. Same signing identity as 0.4.3 (verified via `apksigner verify`), installs as a clean update. Verified on a booted emulator against production: fresh install, login screen render, version string. |
| 0.4.5 | 9 | 2026-07-28 | `releases/instapark-valet-v0.4.5-build9.apk` | Bug-fix pass from live device testing of 0.4.4: vehicle thumbnails were copied into `res/` during the Premium v2 pass but never actually wired up (Dashboard/Vehicles/Queue all mapped to the old placeholder drawables, Search showed a text-initial instead of an image) -- consolidated into one shared `vehicleImageRes()` (`ui/util/VehicleImage.kt`) used everywhere. Search overlay showed two stacked search bars in dark theme (the scrim was a dark-navy tint at 42% alpha, which barely dims an already-dark background, letting Home's own search field show through); switched to opaque black at 75%, theme-independent. Auto-allocate toggle's description text had no gap before the switch, crowding it; added explicit padding. Vehicles tab filter chips didn't look clickable (still on a bare, unstyled `FilterChip` while Queue had its own styled version from an earlier fix) -- extracted Queue's version into a shared `ValetFilterChip` so both screens use the same one. Same signing identity as 0.4.4 (verified via `apksigner verify`), installs as a clean update. |
| 0.4.6 | 10 | 2026-07-28 | `releases/instapark-valet-v0.4.6-build10.apk` | QR-code check-in mode (matches the same-pass web/mweb feature): Check-in dialog gains a conditional "QR code" field, shown only when the site's `guestRequestMode` (already loaded on the Queue response, no extra API call) is `"qr"`; submit stays disabled until a code is entered in that mode. `QueueTicket`/vehicles-list `Ticket` DTOs gain `qrCode`, displayed as "QR: `<code>`" on both `TicketCard` and `VehicleTicketCard` following the existing "Slot: `<n>`" idiom. `MeResponse`/`DashboardResponse` gain `qrCodeModeEnabled` for consistency with the `valetParkingEnabled` dual-endpoint pattern (not directly used for gating, which reads off the Queue response instead). Verified end-to-end on a booted emulator against the local dev server in the prior debug-build pass: field renders correctly, submit gating works, and a ticket with an assigned code displays "QR: IPK-9001" after reload. This release only carries a version bump on top of that already-verified code (no further functional change) -- the emulator was unavailable for this specific release build due to the host running critically low on disk space (~1.3GB free), so this build was verified via `gradlew assembleRelease` succeeding cleanly and a checksum diff against the previous build confirming the new code was actually packaged, rather than a fresh on-device smoke test. |
| 0.4.7 | 11 | 2026-07-29 | `releases/instapark-valet-v0.4.7-build11.apk` | QR mode: handover confirmation switched from OTP to QR-code re-entry (matches the same-pass web/mweb change) -- since the same physical QR card can already be re-scanned to view the OTP, requiring the operator to also collect and type it added no real security. `HandoverDialog` gains a `qrMode` param: renders an "QR code" text field instead of the 4-digit `OtpBoxInput` when the ticket's `qrCode` is non-null, and `completeHandover` threads a `code`/`isQrMode` pair through `QueueViewModel` → `QueueRepository` → `ParkingAdminApi` (posting to either the `otp` or `qr_code` multipart field). Link-mode tickets are unaffected -- same OTP flow as every prior release. `./gradlew assembleRelease` succeeded cleanly; same signing identity as 0.4.6 (verified via `apksigner verify`). Emulator was unavailable for this release build (host still at ~200MB free disk, same blocker as 0.4.6), so this build was verified via a clean `assembleRelease` plus a checksum diff against the previous build confirming the new code was actually packaged -- functional correctness was already confirmed against the shared backend during the same-pass web verification (wrong QR code rejected, correct code completes handover, code freed for reuse). |

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
existing web Server Actions (zero business-logic fork).

Phase 3 complete: real photo capture wired into check-in (5 fields) and handover
(1 optional), via the device's stock camera app (`ActivityResultContracts.TakePicture()`
+ `FileProvider`) rather than an embedded CameraX preview, plus client-side compression
(`ImageCompressor`, mirrors the web's `compressImageFile`: 1280px max, JPEG quality 0.7)
before upload, and a Photos dialog on each ticket card. Camera permission flow and the
capture command firing were verified via logcat on-device; the emulator's own capture
pipeline is occasionally flaky (known AVD/virtual-scene-camera issue, unrelated to this
code) — worth a clean real-device check.

Phase 4 complete: `GET /notifications` + `POST /notifications/mark-read` (site-scoped,
mirrors the web bell's Server Actions exactly), and a Android `NotificationsBell` in
the shared top bar — 20s polling, unread badge, vibrate-on-increase haptic (matching
web's V2 Phase 6), mark-all-read on open. Verified end-to-end via curl against the live
API.

Phase 5 complete: release signing configured, signed APK builds and installs cleanly,
launches and reaches the production API. See "Release build" above.

19th-July revamp (v0.2.0): full visual redesign per the reference PNGs — new brand
palette (dark-first, in-app light/dark toggle persisted via `ThemeStore`), real
adaptive app icon + system/branded splash, Home screen rebuilt (hero art, My Status
IN/BREAK/OUT animated toggle wired to `POST /status`, stat dashlets, queue preview,
quick actions, capacity donut), Queue cards restyled (vehicle imagery, status
ribbons, role-gated actions: mark-parked only for the check-in operator or admin;
request/dispatch admin-only), Vehicles restyled (stat cards, imagery, status pills).
**Not yet visually verified on emulator** (host disk too full to boot an AVD when
this shipped) — the code compiles and the permission logic is server-verified, but
the first real look happens on a physical device.
