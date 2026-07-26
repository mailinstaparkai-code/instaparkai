# InstaPark AI — UI design system (2026 brand revamp)

Source of truth for the light, sky-blue revamp of the **valet operator Android app**
(`apps/valet-operator-android`) and, next, the **parking-admin web dashboard**. Derived
from instaparkai.com (nav sky-blue field, white floating logo pill, blue-led cards,
orange reserved for the single CTA).

Design reference: `Valet App Revamp.dc.html` — direction **1a "Sky Field"** (approved).
Baseline for comparison: `Current App (baseline).dc.html` (the dark/orange app as of
v0.4.1). Screen ids in this doc match the badges in the design file (`1a`, `2a`…`2g`).

---

## 1. Direction in one paragraph

Light-first. A soft sky gradient carries the top of each screen; content sits on white
cards with a blue-tinted soft shadow and no borders. **Brand blue leads** (navigation,
selection, links, informational status, neutral confirms). **Orange is the commit
colour** and appears at most once per screen — check-in, complete handover, dispatch.
Type is Poppins throughout. Everything is sized for a valet standing outdoors: body text
never below 13px (14px+ for anything read at arm's length), tap targets 44–56px, ink on
white for all primary reading.

Dark mode is retained as a secondary theme (Profile → Appearance) using the same tokens
with the dark ramp below; light is the default.

---

## 2. Colour tokens

### Brand + surfaces (light, default)

| Token | Hex | Use |
|---|---|---|
| `brandBlue` | `#1478FF` | Primary actions, selected states, links, focused field borders, active tab |
| `brandBlueDeep` | `#0B5FD6` | Pressed/hover of `brandBlue`, text on light-blue tints, gradient end |
| `blueTint` | `#E8F2FF` | Icon tiles, secondary button fill, active tab pill, IND chip |
| `blueTintSoft` | `#F7FAFE` | Inset field fill, dashed photo tiles, inner rows |
| `skyField` | `#CFE4FF` | Top of screen gradient (fades to `#E8F2FF` → `#F4F8FE`) |
| `appBackground` | `#EFF5FE` | List screens (Queue, Vehicles) |
| `surface` | `#FFFFFF` | Cards, sheets, top bar, tab bar |
| `hairline` | `#DCE5F2` | Field borders, unselected chips |
| `hairlineSoft` | `#E6EDF7` / `#F0F4FA` | Bar dividers / in-card row dividers |
| `ctaOrange` | `#FF6B36` | The one committing action per screen, unread badge |
| `ink` | `#0F172A` | Headings, plate numbers, values |
| `inkBody` | `#4A5565` | Body copy, field labels |
| `inkMuted` | `#6C7280` | Secondary/meta text |
| `inkFaint` | `#94A3B8` | Timestamps, placeholders, tertiary meta |
| `tabInactive` | `#8A94A6` | Unselected tab label/icon |

### Status ramp (replaces the dark theme's accent set 1:1)

| Ticket status | Dot / text | Pill background |
|---|---|---|
| `checked_in` | `#0B5FD6` | `#EAF2FE` |
| `parked` | `#1478FF` | `#EAF2FE` |
| `requested` | `#E8890C` | `#FDF3E3` |
| `in_transit` | `#FF6B36` | `#FFEDE4` |
| `arrived` | `#12A150` (text `#0C7A3D`) | `#E4F7EC` |
| `completed` | `#12A150` (text `#0C7A3D`) | `#E4F7EC` |
| `voided` | `#E23D3D` | `#FDECEC` |
| success / danger / warning (generic) | `#12A150` / `#E23D3D` / `#E8890C` | as above |

Purple is retired — it was a hold-over accent with no basis in the brand. Anything
purple today (dialog secondary buttons, vehicle-type selection, IND chip, "Active"
summary cell, avatar) becomes blue.

### Dark ramp (secondary theme)

| Token | Hex |
|---|---|
| `darkBackground` | `#0A1220` |
| `darkSurface` | `#121C2D` |
| `darkSurfaceRaised` | `#16223A` |
| `darkHairline` | `#22314C` |
| `darkInk` | `#F3F7FD` |
| `darkInkMuted` | `#9BA9BF` |
| brand blue on dark | `#4B9BFF` (tint `rgba(75,155,255,0.16)`) |
| CTA orange on dark | `#FF7A47` |

---

## 3. Type scale (Poppins)

| Role | Size / weight | Notes |
|---|---|---|
| Screen title | 24px / 700 | "Live Queue", "Vehicles", "Profile" |
| Greeting | 24px / 700, 1.2 | two lines, name on line 2 |
| Plate number | 21px / 700 (24px in a focused card) | letter-spacing 0.04em when in a field |
| KPI value | 26px / 700 | 30px only when a tile stands alone |
| Card title | 15px / 600 | |
| Dialog title | 20px / 700 | |
| Body | 13–14px / 400–500 | 14px for anything actionable |
| Label above field | 13px / 500, `inkBody` | |
| Meta / timestamp | 12px / 500, `inkFaint` | |
| Status pill | 11px / 700, 0.06em, uppercase | |
| Tab label | 12px / 500 (600 active) | |

Minimum on-screen size is 10px and only for the 4-up summary cell captions; never for
anything a valet must act on.

---

## 4. Shape, elevation, spacing

- Radii: **12** small controls/inner rows · **14** fields, buttons, photo tiles ·
  **18** list cards · **20–22** primary cards · **24** dialog sheets · **999** pills.
- Elevation is layered and low-contrast (two shadows, never one heavy blur):
  card `0 1px 2px rgba(16,42,80,0.05), 0 10px 26px rgba(16,42,80,0.07)`;
  raised card `0 1px 2px rgba(16,42,80,0.06), 0 14px 32px rgba(16,42,80,0.09)`;
  dialog/modal `0 2px 6px rgba(11,42,90,0.10), 0 26px 60px rgba(11,42,90,0.24)`.
- Coloured glows stay subtle: orange CTA `0 6px 14px rgba(255,107,54,0.22)`,
  blue CTA `0 6px 14px rgba(20,120,255,0.22)`, selected segment
  `0 3px 8px rgba(20,120,255,0.28)`. Never stack a glow on a card shadow.
- **No borders on cards in light mode** — the shadow does the separating. Borders are for
  fields, chips and dashed photo slots only.
- Screen padding 16px. Vertical rhythm: 8–10px between cards, 12–14px inside a card.
- Scrim behind dialogs: `rgba(11,50,110,0.42)`; dialog inset 16px from the screen edge.

---

## 9. Premium pass (v2 tokens — current target)

Reference: `Valet App Revamp.dc.html` Turn 4, ids `4a`…`4g`. This supersedes §2–5 for the
app where the two disagree; §7b's web shell inherits the same scale and shadows.

**Type** — Inter (400/500/600/700). Display 26px/700 at `-0.02em`; section titles 15px/600;
body 13–14px/400–500; plate numbers 18–22px/700 at `-0.02em`; labels 11–13px/500.

**Grid** — strict 8pt: screen padding 20, card padding 14–18, gaps 12–16, dock inset 16.

**Colour** — `primary #2563EB` (gradient `135deg #3B82F6 → #2563EB`), `accent #FF6A3D`
(gradient `135deg #FF7A4D → #FF6A3D`), success `#16A34A`, warning `#F59E0B`,
danger `#EF4444`, canvas `linear-gradient(180deg,#F7F9FC,#EEF4FF)`, surface `#FFFFFF`,
text `#0F172A`, secondary `#64748B`, tertiary `#94A3B8`, field fill `#F8FAFD`,
field border `#E7EDF6`, tints `#EFF5FF` / `#FFF1EB` / `#EBFAF0` / `#FEF0F0`.

**Radii** — 30 frame, 26–28 cards & sheets, 22–24 secondary cards, 18 buttons,
16 fields, 14 icon tiles, 999 chips & dock capsules.

**Elevation** — cards `0 1px 2px rgba(15,23,42,0.04), 0 16px 40px rgba(15,23,42,0.07)`;
raised `0 20px 46px rgba(15,23,42,0.10)`; dock `0 10px 30px rgba(15,23,42,0.12)`;
bottom sheet `0 -12px 50px rgba(15,23,42,0.22)`; CTA glows
`0 12px 26px rgba(37,99,235,0.30)` / `rgba(255,106,61,0.28)`. Borders are
`1px solid rgba(15,23,42,0.04)` — no grey dividers; grouped lists use `#F4F7FC` hairlines.

**Buttons** — 56px tall, radius 18, weight 600 at 16px. Primary = gradient + glow;
accent (commit) = orange gradient; secondary = `#F3F6FC` with `#475569` label;
destructive = white with `#FBD5D5` border and `#EF4444` label. Press: scale 0.98,
opacity 0.96, 250ms `cubic-bezier(0.2,0,0,1)`; cards lift `translateY(-2px)` + shadow
step on press.

**Fields** — 56px, radius 16, `#F8FAFD` fill, `#E7EDF6` border; focus = `1.5px #2563EB`
+ `0 0 0 4px rgba(37,99,235,0.10)` halo. OTP = four 62px boxes with the same focus halo.

**Chips** — 38–40px pills; selected = blue gradient + glow, white label; unselected =
white, `rgba(15,23,42,0.06)` border, soft shadow. Status chips keep the tint + dot
pattern at 11px/600, `0.06em`.

**Dock** — floating capsule, inset 16, height 76, radius 26,
`rgba(255,255,255,0.78)` + `backdrop-filter: blur(20px)`, 1px white border. Selected tab:
46×32 blue capsule behind a white 22px icon, label in `#2563EB`; spring transition
(stiffness ~380, damping ~30) on the capsule.

**Vehicle cards** — thumbnail 72–76px radius 18–20; plate 22/700; model line then
slot/photo metadata; status chip top-left, timestamp + overflow top-right; CTA anchored
full-width at the bottom of the card.

**Login** — hero photo 340px under a top-to-canvas scrim, logo on a frosted tile, a 64px
gradient shield badge overlapping a 28px-radius white card (Welcome back, 56px fields,
Remember me + Forgot password, gradient Sign in with arrow), version line at the bottom.

**Profile** — blue gradient header (230px, 34px bottom radii) carrying the brand tile and
edit action; then Apple-Settings groups: identity card, Appearance segmented pill,
grouped rows (shift status / notifications / version), destructive Sign out.

**Sheets** — check-in and handover are bottom sheets (32px top radii, grab handle,
icon tile + title + close, 56px footer buttons); mark-parked, dispatch, edit and void
keep their fields and appear as the same sheet with a row-picker body.

**Motion** — 250–300ms, `cubic-bezier(0.2,0,0,1)`; status changes cross-fade the chip;
list items stagger 30ms; nothing animates on scroll.

## 4b. Iconography

One family, everywhere (app + web): **outline/stroke icons on a 24×24 grid**,
`fill: none`, `stroke: currentColor`, `stroke-width: 1.8`, round caps and joins,
rendered at 17–22px. Colour comes from the parent (`currentColor`), so an icon inherits
its tile's accent. Icons are geometric — circles, rounded rects and simple paths; no
filled Material glyphs (the old app's look), **no emoji anywhere in the UI** (the 🚗/🏍
vehicle-type tiles, 👋 greeting, ☀/🌙 theme toggle and ✦ AI-Insights marks are all gone),
and no multi-colour or illustrative icons.

Set in use: `grid` (dashboard), `list` (queue), `car`, `bike`, `suv`, `van`, `user`,
`users`, `bell`, `search`, `camera`, `phone`, `eye`, `key`, `park` (P-in-a-square),
`rupee`, `hash`, `timer`, `check`, `check-square`, `x-circle`, `report`, `message`,
`gear`, `edit`, `trash`, `sun`, `moon`, `sparkles`, `arrow-right`, `plus`,
`dots-vertical` / `dots-horizontal` (overflow menus, filled dots r 1.35).
In Compose, use `androidx.compose.material.icons.outlined.*` (not `filled.*`) at 20–22.dp
with `tint` set from the token, or ship these paths as vector drawables so app and web
match exactly.

## 5. Components

**Top bar** (`ValetNavGraph.BrandTitle`) — white bar (or transparent over the gradient on
Home/Profile) 56px tall. Left: the **full InstaParkAi lockup** on a white pill
(`radius 999`, `padding 7/14`, shadow `0 6px 16px rgba(20,120,255,0.18)`), logo height
28–30px. Right: bell in a 40px `#F1F6FD` circle, blue glyph, unread count in an orange
badge. The old "P InstaPark Valet" text lockup is replaced everywhere.
→ ship the site logo as `res/drawable-nodpi/img_logo_lockup_light.(webp|png)`.

**Bottom tab bar** — white, 1px `hairlineSoft` top border, 4 tabs. Active: icon in a
`blueTint` pill (`radius 14`, `padding 5/20`), icon + 12px/600 label in `brandBlueDeep`.
Inactive: `tabInactive`. Row height ≥ 64px including labels.

**Card** (replaces `GlassCard`) — white, radius 20, padding 14, card shadow, no border,
no accent glow wash. The accent now shows only in the status pill and any accent text.

**StatDashlet** — white card radius 18, padding 12; 36px `radius 11` icon tile in the
metric's tint (`blueTint` / `#FFEDE4` / `#E4F7EC` / `#EAF2FE`); value 26/700 `ink`;
label 13/500 `inkMuted`.

**StatusPill** — dot 7px + label 11/700 uppercase, pill background from the status ramp,
padding 5/11.

**Filter chip** — height 36, radius 999. Selected: `brandBlue` fill, white label.
Unselected: white fill, `hairline` border, `inkBody` label.

**Segmented control** (My Status IN/BREAK/OUT) — track `#EEF4FC` radius 14 padding 5;
selected segment `brandBlue` fill, white 14/600 label, shadow
`0 4px 12px rgba(20,120,255,0.35)`; unselected label `inkBody`. Keep the spring slide +
haptic tick from v0.3.0.

**Text field** — height 52, radius 14, 1px `hairline`. Focused/filled: 1.5px `brandBlue`
border + `blueTintSoft` fill. Value 15–16/500–600 `ink`, placeholder `inkFaint`.
Leading icon `#8A94A6`. `IND` chip: `blueTint` fill, `brandBlueDeep` 11/700 label.

**Vehicle-type tile** — flex row of 4 (wraps), radius 14, padding 11/0, icon + 11px
label. Selected: `blueTint` fill, 1.5px `brandBlue` border, `brandBlueDeep` 600 label.
Unselected: `blueTintSoft` fill, `hairline` border, `inkMuted` 500 label.

**Photo capture tile** — 1.5px dashed `#C9D9EF` on `blueTintSoft`, radius 14, blue
camera glyph, 11/500 `inkBody` caption. Filled state: the photo, radius 14, with a small
white circular ✕ top-right.

**Dialog** (replaces `PremiumDialog`) — white sheet radius 24, padding 18, raised shadow.
Header: 46px `radius 14` icon tile in the dialog's tint (blue default, green for
handover, orange for dispatch, red for void), title 20/700, subtitle 13/500 `inkMuted`,
close ✕ in a 34px `#F1F6FD` circle. Footer: secondary = white with 1.5px `hairline`
border and `inkBody` label; primary = `ctaOrange` for commits (check in, complete
handover, dispatch), `brandBlue` for neutral confirms (confirm parked, save),
`#E23D3D` for void. Both 48–50px tall, radius 14, weight 600.

**Vehicle imagery** — keep the four existing PNGs, radius 13–16, no accent border ring
(the ring was a dark-mode device).

**Queue ticket card** — status pill + time-ago + kebab on row 1; 72px image + plate 21/700
and two meta lines on row 2; full-width 50px action on row 3. Action colour: `ctaOrange`
for "Complete handover"; `blueTint`/`brandBlueDeep` for "Guest requested", "Mark as
parked", "Mark arrived"; role-gated waiting states stay as 13/500 `inkMuted` text.

---

## 6. Per-screen notes

**Login (`2a`)** — sky gradient, logo pill top-left, "Valet sign-in" 30/700 + one line of
help, white card with the two fields and a full-width orange "Sign in" (54px). Errors:
red 12/500 line under the field, no dialog.

**Home (`1a`)** — gradient header with logo pill + bell; greeting; site name + "Valet
enabled" green pill; **My Status** card (operators only); 2×2 KPI tiles (Active Vehicles,
Arrived, Completed Today, Avg Turnaround); Queue card = header + "View all →" + the next
vehicle row + orange "+ Check-in" and blue "Find"; capacity as a slim labelled meter bar
(the donut is retired — it cost 100px for one number).

**Live Queue (`2b`)** — white top bar; title + live dot + count; orange pill "+ Check-in"
(46px); filter chips; ticket cards; "Today's summary" 4-cell strip in status tints.
Admin-only auto-allocate row keeps its position above the chips as a white card with the
switch in `brandBlue`.

**Vehicles (`2c`)** — title + record count; two stat cards (Completed / Revenue) with
tinted icon tiles; same chip row; compact 64px-image cards with the status pill on the
right and fare/operator meta beneath. Pagination row: text 13/500 + two 44px outlined
blue buttons.

**Profile (`2d`)** — gradient top; identity card with a blue gradient avatar;
**Appearance** row with a light/dark segmented pill (light default); a grouped list
(shift status, notifications, app version); outlined red "Sign out" (52px).

**Dialogs (`2e`, `2f`, `2g`)** — check-in, complete handover, mark as parked, dispatch
operator, edit details, void ticket, ticket photos. Handover shows the OTP as four 58px
boxes with an inline red error line, fare with a ₹ prefix, a green "Payment collected"
switch and the optional handover photo as a dashed row. Mark-as-parked replaces the
dropdown with tappable 44px slot chips. Dispatch replaces the dropdown with operator rows
carrying daily-status pills.

---

## 7. Paste-ready Compose tokens

```kotlin
// ui/theme/Color.kt — 2026 brand revamp (light-first)
package ai.instapark.valet.ui.theme

import androidx.compose.ui.graphics.Color

val BrandBlue = Color(0xFF1478FF)
val BrandBlueDeep = Color(0xFF0B5FD6)
val BlueTint = Color(0xFFE8F2FF)
val BlueTintSoft = Color(0xFFF7FAFE)
val SkyField = Color(0xFFCFE4FF)
val SkyFieldMid = Color(0xFFE8F2FF)
val SkyFieldEnd = Color(0xFFF4F8FE)
val CtaOrange = Color(0xFFFF6B36)

val LightBackground = Color(0xFFEFF5FE)
val LightSurface = Color(0xFFFFFFFF)
val LightHairline = Color(0xFFDCE5F2)
val LightHairlineSoft = Color(0xFFE6EDF7)
val Ink = Color(0xFF0F172A)
val InkBody = Color(0xFF4A5565)
val InkMuted = Color(0xFF6C7280)
val InkFaint = Color(0xFF94A3B8)
val TabInactive = Color(0xFF8A94A6)

val StatusParked = Color(0xFF1478FF)
val StatusCheckedIn = Color(0xFF0B5FD6)
val StatusRequested = Color(0xFFE8890C)
val StatusInTransit = Color(0xFFFF6B36)
val StatusOk = Color(0xFF12A150)
val StatusOkText = Color(0xFF0C7A3D)
val StatusDanger = Color(0xFFE23D3D)

val TintBlue = Color(0xFFEAF2FE)
val TintGreen = Color(0xFFE4F7EC)
val TintAmber = Color(0xFFFDF3E3)
val TintOrange = Color(0xFFFFEDE4)
val TintRed = Color(0xFFFDECEC)

// Dark (secondary)
val DarkBackground = Color(0xFF0A1220)
val DarkSurface = Color(0xFF121C2D)
val DarkSurfaceRaised = Color(0xFF16223A)
val DarkHairline = Color(0xFF22314C)
val DarkInk = Color(0xFFF3F7FD)
val DarkInkMuted = Color(0xFF9BA9BF)
val DarkBrandBlue = Color(0xFF4B9BFF)
val DarkCtaOrange = Color(0xFFFF7A47)
```

```kotlin
// ui/theme/Theme.kt — schemes (ValetColors keeps its shape; purple/successGlow drop out,
// replaced by tint slots so pills and icon tiles stop computing alpha at runtime)
private val LightColorScheme = lightColorScheme(
    primary = BrandBlue,          onPrimary = LightSurface,
    secondary = CtaOrange,        onSecondary = LightSurface,
    background = LightBackground, onBackground = Ink,
    surface = LightSurface,       onSurface = Ink,
    surfaceVariant = BlueTintSoft, onSurfaceVariant = InkMuted,
    outline = LightHairline,      error = StatusDanger,
)
// InstaParkValetTheme(darkTheme = false) is now the default; ThemeStore's stored
// default flips from true to false (existing installs keep whatever they chose).
```

```kotlin
// Type.kt — Poppins, bundled as res/font/poppins_{regular,medium,semibold,bold}.ttf
private val Poppins = FontFamily(
    Font(R.font.poppins_regular, FontWeight.Normal),
    Font(R.font.poppins_medium, FontWeight.Medium),
    Font(R.font.poppins_semibold, FontWeight.SemiBold),
    Font(R.font.poppins_bold, FontWeight.Bold),
)
val Typography = Typography().let { d ->
    d.copy(
        headlineSmall = d.headlineSmall.copy(fontFamily = Poppins, fontWeight = FontWeight.Bold, fontSize = 24.sp),
        titleLarge = d.titleLarge.copy(fontFamily = Poppins, fontWeight = FontWeight.Bold, fontSize = 20.sp),
        titleMedium = d.titleMedium.copy(fontFamily = Poppins, fontWeight = FontWeight.SemiBold, fontSize = 15.sp),
        bodyMedium = d.bodyMedium.copy(fontFamily = Poppins, fontSize = 14.sp),
        bodySmall = d.bodySmall.copy(fontFamily = Poppins, fontSize = 13.sp),
        labelMedium = d.labelMedium.copy(fontFamily = Poppins, fontWeight = FontWeight.Medium, fontSize = 13.sp),
        labelSmall = d.labelSmall.copy(fontFamily = Poppins, fontWeight = FontWeight.Medium, fontSize = 12.sp),
    )
}
```

### Web (parking-admin dashboard) CSS variables

```css
:root {
  --brand-blue: #1478FF;  --brand-blue-deep: #0B5FD6;
  --blue-tint: #E8F2FF;   --blue-tint-soft: #F7FAFE;
  --sky-field: #CFE4FF;   --app-bg: #EFF5FE;   --surface: #FFFFFF;
  --hairline: #DCE5F2;    --hairline-soft: #E6EDF7;
  --cta-orange: #FF6B36;
  --ink: #0F172A; --ink-body: #4A5565; --ink-muted: #6C7280; --ink-faint: #94A3B8;
  --ok: #12A150; --ok-text: #0C7A3D; --warn: #E8890C; --danger: #E23D3D;
  --radius-control: 14px; --radius-card: 20px; --radius-sheet: 24px;
  --shadow-card: 0 8px 20px rgba(20,80,160,0.08);
  --shadow-sheet: 0 24px 50px rgba(11,50,110,0.28);
  --font: "Poppins", system-ui, sans-serif;
}
```

---

## 7b. Parking-admin web dashboard

Design reference: `Admin Web Revamp.dc.html` — 1440×900 frames, ids `3a`…`3h`
(Dashboard, Live Queue, Check-in modal, Vehicles, Valet Operators, Reports,
Communication, Settings). Same tokens as §2–4; use the CSS variables above.

**Shell** — canvas `--app-bg`. Sidebar 248px, `--surface`, 1px `--hairline-soft` right
border, 18/14 padding: logo lockup (34px) at top, nav items 44px tall radius 12
(active = `--blue-tint` fill + `--brand-blue-deep` 14/600 label + blue icon; inactive
`--ink-muted` 14/500), then a spacer and the account card (`--blue-tint-soft`, radius 14,
gradient avatar, name 14/600 + role 11/500).

**Top bar** — 68px, `--surface`, bottom hairline: search pill (42px, radius 999,
`#F4F8FE` fill, hairline border, `--ink-faint` placeholder), spacer, "✦ AI Insights"
pill (`--blue-tint` / `--brand-blue-deep` — it is a secondary affordance, not the CTA),
bell in a 42px `#F4F8FE` circle with an orange count badge, 42px gradient avatar.
The old dark bar's blue filled "AI Insights" button and orange-everything treatment go.

**Page header** — h1 26/700 `--ink` + a 14/500 `--ink-body` context line (site, date,
shift count). Right side: neutral filter/period buttons (44px, white, hairline border)
and **one** orange primary per page: "+ Check-in vehicle" (Dashboard, Live Queue),
"+ Add operator" (Operators), "Send broadcast" (Communication). Reports' "Download PDF"
and Settings' "Save changes" are blue — they are safe, repeatable actions.

**Cards** — `--surface`, radius 18–20, `--shadow-card`, no border, padding 18–20.
KPI card: 40px tinted icon tile + delta 12/600 on the same row, value 32/700, label 13/500.

**Tables** — inside a radius-20 card. Header row `--blue-tint-soft` background, labels
12/600 uppercase `--ink-faint`. Body rows 12–14px vertical padding, 1px `#F0F4FA`
divider, vehicle thumbnail 44–48px radius 11–12, plate 15–16/700, meta 12/500
`--ink-muted`. Status = the §2 pill. Row action = 38px radius 11 button: `--blue-tint` /
`--brand-blue-deep` for reversible steps, `--cta-orange` filled for the committing step
(complete handover, dispatch), plus a 34px `⋯` overflow tile in `#F4F8FE`.
Footer: page count 13/500 + Previous (outlined) / Next (blue filled) at 40px.

**Modals** — 620px wide, radius 24, padding 26, `--shadow-sheet` on a
`rgba(11,50,110,0.42)` scrim; header/footer exactly as the app dialogs (§5), fields laid
out two-up. Photo slots are five dashed tiles in one row.

**Charts** — bars only, `--brand-blue` for the primary series and `#C9DEFB` for the
secondary; 6px top radius; axis labels 11/500 `--ink-faint`; legend swatches 10px radius 3.
Occupancy donut: `conic-gradient(var(--brand-blue) 0 <deg>, var(--hairline-soft) <deg> 360deg)`
with a white inner disc — keep it on the web (there is room here; the phone uses a meter).

**Communication** — left: template list (40px tinted glyph tile, name 15/600, body copy
13/400 `--ink-muted`, channel label 12/500, 46px green/grey switch). Right: broadcast
composer (audience chips, 120px textarea, orange send) above a recent-activity feed with
7px status dots.

**Settings** — 210px secondary nav column (42px items, active = `--blue-tint`), then
grouped cards: toggle rows (label 15/600 + help 13/400, 52px switch — green on, hairline
off), a 3-up field grid (48px inputs radius 12), and a danger-zone card whose only
control is an outlined red button.

## 8. Implementation order (for Claude Code)

1. `Color.kt` + `Theme.kt` + `Type.kt` (Poppins fonts added to `res/font/`), light default
   in `ThemeStore`.
2. Ship `img_logo_lockup_light` and swap `BrandTitle` to the pill lockup; restyle the
   top bar and `NavigationBar` per §5.
3. `GlassCard` → borderless white card; delete the accent-glow wash and the
   `Color.White.copy(alpha=0.05f)` top highlight (both are dark-mode devices).
4. `StatusPill`/`statusAccent` → status ramp with explicit pill backgrounds;
   `StatDashlet`, `AnimatedSegmented`, `VehicleTypeSelector`, `PhotoCaptureField`,
   filter chips.
5. `PremiumDialog` chrome + the seven dialogs (§5, §6); mark-parked and dispatch pickers
   move from dropdowns to tappable rows.
6. Screens: Home, Queue, Vehicles, Profile, Login.
7. Purple must not appear in a grep of `ui/` when done.

No behaviour, API, role-gating or copy changes are implied by this revamp except where
§6 explicitly says so (slot/operator pickers, capacity meter, OTP boxes).
