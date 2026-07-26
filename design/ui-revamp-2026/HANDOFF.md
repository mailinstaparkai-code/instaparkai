# Handoff — InstaPark AI UI revamp → Claude Code

Give Claude Code **this file plus `design.md`** and the two design files. Everything it
needs to build is written down; nothing should be inferred from memory of the old UI.

## Files to hand over

| File | What it is |
|---|---|
| `design.md` | The spec. §9 (Premium pass) is the current target for the app; §2–5 are the shared base; §7b is the web dashboard. |
| `Valet App Revamp.dc.html` | Visual reference, newest first: **Turn 4 = `4a`…`4g`** (build this), Turn 2/Turn 1 are earlier drafts. |
| `Admin Web Revamp.dc.html` | Visual reference for the parking-admin web (`3a`…`3h`). |
| `Current App (baseline).dc.html` | The app as it ships today — for before/after comparison only. |
| `assets/logo_instaparkai.png` | The brand lockup to ship (light backgrounds). Vehicle/hero art already exists in the repo. |

Open the `.dc.html` files in a browser to see the screens; they are self-contained.

## Paste this as the opening prompt

> You are implementing an approved UI revamp of the InstaPark Valet Android app
> (`apps/valet-operator-android`, Kotlin + Jetpack Compose). The design spec is `design.md`
> — treat **§9 Premium pass** as the source of truth, with §4b (iconography) and §2–5 as
> the shared base. Visual reference: `Valet App Revamp.dc.html`, section **Turn 4**
> (screens `4a` Login, `4b` Home, `4c` Live Queue, `4d` Vehicles, `4e` Profile,
> `4f` Check-in sheet, `4g` Handover + remaining sheets).
>
> Hard constraints:
> - **No functional change.** No new features, no removed features, no altered API calls,
>   no changed role-gating, no renamed labels or copy — this is a visual/UX refinement only.
>   The only interaction changes allowed are the ones §6/§9 name explicitly: slot and
>   operator pickers become tappable rows instead of dropdowns, OTP becomes four boxes,
>   the Home capacity donut becomes a meter, dialogs become bottom sheets.
> - Every colour, size, radius, shadow, weight and spacing value must come from `design.md`.
>   If a value is missing, ask — do not invent one.
> - Light theme is the default; keep the existing dark theme working with the dark ramp in §2.
> - Work through the phase list below, one phase per commit, and build after each phase.
>
> Start with Phase 1 and show me the diff before moving on.

## Phases (one commit each)

1. **Tokens.** Rewrite `ui/theme/Color.kt`, `Theme.kt`, `Type.kt` from §9 + §7. Add Inter to
   `res/font/` (400/500/600/700) and wire `Typography`. Flip `ThemeStore`'s default to light
   (respect a user's stored choice). Add the elevation/radius/spacing constants as a
   `ValetTokens` object rather than inline literals.
2. **Primitives.** `GlassCard` → borderless white card (radius 26, two-layer ambient shadow);
   new/updated `PrimaryButton` (56dp, radius 18, gradient + glow), `SecondaryButton`,
   `DestructiveButton`, `ValetTextField` (56dp, focus halo), `StatusChip`, `FilterChip`,
   `SegmentedStatus`, `StatDashlet`, `PhotoCaptureTile`, `VehicleThumb`.
3. **Icons.** Replace filled Material icons with the outline set in §4b at 20–24dp,
   stroke-consistent, tinted from tokens. No emoji anywhere.
4. **Chrome.** Frosted floating dock (§9) replacing `NavigationBar`; top bars per screen;
   ship `img_logo_lockup_light` and use the full InstaParkAi lockup.
5. **Sheets.** `PremiumDialog` → bottom-sheet shell; port all seven dialogs (check-in,
   mark parked, dispatch, handover, edit, void, photos) with identical fields and validation.
6. **Screens.** Login → Home → Queue → Vehicles → Profile, matching `4a`…`4e`.
7. **Motion.** 250–300ms `cubic-bezier(0.2,0,0,1)`; press scale 0.98; spring on the dock
   indicator; keep the existing haptic tick and `animateItem()` list animations.
8. **Web dashboard** (`apps/super-admin`, parking-admin routes) per §7b + `3a`…`3h`, using
   the CSS variables in §7. Same rule: skin only.

## Screen → source-file map (app)

| Design | Source to change |
|---|---|
| `4a` Login | `ui/login/LoginScreen.kt` |
| `4b` Home | `ui/dashboard/DashboardScreen.kt` (+ `StatDashlet`, `AnimatedSegmented`, `GlassCard`) |
| `4c` Live Queue | `ui/queue/QueueScreen.kt` (`TicketCard`, chips, `TodaysSummaryStrip`) |
| `4d` Vehicles | `ui/vehicles/VehiclesScreen.kt` |
| `4e` Profile | `ui/profile/ProfileScreen.kt` (+ `ThemeTogglePill`) |
| `4f`/`4g` Sheets | `ui/components/PremiumDialog.kt`, `VehicleTypeSelector.kt`, `PhotoCaptureField.kt`, dialogs in `QueueScreen.kt` |
| Dock / top bar | `ui/navigation/ValetNavGraph.kt` |
| Status colours | `ui/components/StatusPill.kt` (`statusAccent`) |

ViewModels, repositories, DTOs and `data/` must not change.

## Definition of done

- A grep of `ui/` returns no purple (`8B5CF6`), no old orange (`FF5A1F`), no dark-first
  default, no filled `material.icons.filled.*` in redesigned screens, and no emoji.
- Every screen matches its reference at 390dp width: same order of elements, same labels.
- Light and dark both build and render; all seven dialogs open and submit as before.
- Text ≥13sp, tap targets ≥48dp, contrast readable in direct sunlight.
- Screenshot each rebuilt screen on a device and compare side-by-side with `4a`…`4g`.
