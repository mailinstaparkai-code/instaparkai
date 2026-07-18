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

Phase 1 (this checkpoint): Login, Dashboard, and Vehicles screens are implemented and
the app builds cleanly (`./gradlew assembleDebug` succeeds). Queue and Profile are
present (Profile has working sign-out; Queue is a placeholder for Phase 2). **Not yet
verified on an emulator/device** — this development machine's only configured AVD
(`Pixel_10_Pro`) currently fails to boot due to low disk space (`Your device does not
have enough disk space to run avd`, ~2GB free). Free up disk space and re-run to get a
real on-device verification pass before treating this phase as fully done.
