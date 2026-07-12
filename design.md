# InstaPark AI — Design System

Version 1.0 · Brand personality: **Apple × Tesla × Stripe × VisionOS × Linear**

Source of truth for the Super Admin portal (web), and the future valet operator apps
(Android native, dweb, mweb). Derived from `InstaPark_AI_Design_System_Brief.docx` and
the provided reference screenshots (mobile valet app + web dashboard, light & dark).

---

## 1. Design Philosophy

InstaPark AI should feel like premium infrastructure software wearing a consumer-grade
finish — the operational density of a Stripe dashboard, the calm confidence of Linear,
and the spatial glass of visionOS. It is never cluttered, never loud, and never slow.

**Principles**
- **Less is more** — every extra border, shadow, or label costs attention. Cut before adding.
- **White space first** — density comes from a tight spacing *rhythm*, not from cramming.
- **Soft glass layers** — panels float above a blurred background, not flat cards on a flat page.
- **Depth through blur**, not depth through heavy drop shadows.
- **Floating cards** — content lives in rounded, elevated surfaces, not in seams and dividers.
- **Intelligent motion** — animation always explains a state change; it's never decoration.
- **Zero visual noise** — one accent color doing the talking; neutrals do the rest.
- **Rounded geometry** — soft corners everywhere (see radius scale, §2.4).
- **Instant readability** — a Super Admin glancing at the dashboard for 2 seconds must know
  if everything is fine.
- **Delight in micro-interactions** — small, physics-based feedback on every interactive element.

---

## 2. Design Tokens

All tokens are defined as raw values first (portable to Tailwind CSS variables *and* a
Kotlin/Compose theme), then mapped to semantic names. Never hardcode a raw hex in a
component — always reference the semantic token.

### 2.1 Color — Brand

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--brand-orange` | `#FF5A1F` | `#FF6A2C` | Primary accent — CTAs, active nav, focus rings, key data |
| `--brand-orange-strong` | `#E8460C` | `#FF4500` | Gradient end / pressed state |
| `--brand-orange-soft` | `#FF8F3D` | `#FF8F3D` | Gradient start (hero cards, ticket headers) |
| `--brand-blue` | `#2F6FE4` | `#5B8DFF` | Secondary brand mark accent ("Ai" wordmark), links, EV indicator |

> These are estimated from the logo and reference screenshots. If an official brand
> guideline exists with exact hex values, swap them in here — every other token in this
> document derives from these four.

Brand gradient (hero cards, valet ticket header, monthly pass card):
```css
--gradient-brand: linear-gradient(135deg, var(--brand-orange-soft) 0%, var(--brand-orange-strong) 100%);
--gradient-pass: linear-gradient(135deg, #EC4899 0%, var(--brand-orange-strong) 100%);
```

### 2.2 Color — Semantic Status

Used for occupancy, payments, exceptions — never convey these with color alone; always
pair with an icon or label (WCAG `color-not-only`).

| Token | Hex | Meaning |
|---|---|---|
| `--status-success` | `#22C55E` | Available, Online, Paid, Healthy |
| `--status-danger` | `#EF4444` | Occupied, Error, Offline |
| `--status-warning` | `#F59E0B` | Reserved, VIP, Low-confidence, Pending |
| `--status-info` | `#3B82F6` | EV slot, informational |
| `--status-disabled` | `#A855F7` | Disabled/accessible slot |

### 2.3 Color — Surfaces & Text

**Light theme**
```css
--bg-base: #F4F6F9;        /* frost white */
--bg-elevated: #FFFFFF;
--surface-glass: rgba(255, 255, 255, 0.65);
--border-glass: rgba(15, 23, 42, 0.08);
--text-primary: #0F172A;
--text-secondary: #5B6472;
--text-tertiary: #94A0AF;
```

**Dark theme**
```css
--bg-base: #090B10;
--bg-elevated: #10131A;
--surface-glass: rgba(255, 255, 255, 0.06);
--border-glass: rgba(255, 255, 255, 0.10);
--text-primary: #F5F6F8;
--text-secondary: #9AA3B2;
--text-tertiary: #667085;
```

Design light and dark together, never derive one by inverting the other — verify
contrast independently in each mode (`color-dark-mode`, `color-accessible-pairs`).

### 2.4 Radius, Elevation & Glass

```css
--radius-sm: 8px;      /* chips, inputs */
--radius-md: 14px;     /* buttons, small cards */
--radius-lg: 24px;     /* panels, dashboard cards, sheets — the brief's "24px" glass radius */
--radius-full: 9999px; /* pills, avatars, badges */

--glass-blur: 32px;         /* 30–40px range from brief */
--glass-opacity: 0.10;      /* 8–12% range from brief */
--glass-border-width: 1px;

--elevation-1: 0 1px 3px rgba(0,0,0,0.06);
--elevation-2: 0 8px 24px rgba(0,0,0,0.10);
--elevation-3: 0 20px 48px rgba(0,0,0,0.16);
```

**Glass surface recipe** (a "floating card"):
```css
.glass-card {
  background: var(--surface-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: var(--glass-border-width) solid var(--border-glass);
  border-radius: var(--radius-lg);
  box-shadow: var(--elevation-2);
}
```

**Glass accessibility rule**: blur indicates a floating/dismissable layer (modals,
sheets, the exception panel) — never apply it purely for decoration on primary reading
surfaces. Text sitting on a glass surface must still hit 4.5:1 contrast; if a card holds
dense data (a table, a KPI number), raise `--surface-glass` opacity to 0.85+ in light /
0.7+ in dark rather than trusting blur to carry legibility.

### 2.5 Typography

```css
--font-display: "SF Pro Display", "Inter", -apple-system, system-ui, sans-serif; /* headings, hero */
--font-body: "Inter", -apple-system, system-ui, sans-serif;                       /* UI text, labels, body */
--font-numeric: "Inter Tight", "Inter", sans-serif;                               /* KPI numbers, tables, prices */
```

`font-numeric` always uses `font-variant-numeric: tabular-nums` and weight 700 for KPI
figures, so numbers don't jitter as digits change.

| Style | Size | Weight | Line-height | Use |
|---|---|---|---|---|
| Hero | 36px | 700 | 1.15 | Dashboard greeting, marketing hero |
| Section | 22px | 600 | 1.25 | Panel/card group titles |
| Card Title | 16px | 600 | 1.4 | Card headers, table headers |
| Body | 14px | 400 | 1.6 | Default UI text |
| Caption | 12px | 500 | 1.4 | Timestamps, helper text, badges |
| KPI Number | 28–32px | 700 (`font-numeric`) | 1.1 | Dashboard stat values |

Minimum body text is 14px in dense dashboard UI (acceptable for data-dense enterprise
tools) but never below 12px, and never for primary content on mobile (mobile body text
stays at 16px minimum to avoid iOS auto-zoom, per `readable-font-size`).

### 2.6 Spacing

8pt grid throughout. Dashboard density is intentionally tight (Density 8/10); marketing
or onboarding surfaces should use the wider end of the scale.

```
--space-1: 4px   --space-2: 8px   --space-3: 12px   --space-4: 16px
--space-5: 20px  --space-6: 24px  --space-8: 32px   --space-10: 40px
--space-12: 48px --space-16: 64px
```

- Dashboard card padding: `--space-5` (20px)
- Section gaps: `--space-6` to `--space-8`
- Table cell padding: `--space-3` vertical / `--space-4` horizontal
- Mobile screen padding: `--space-4` (16px)

---

## 3. Motion Guidelines

Motion is a first-class design element, not decoration — every animation expresses a
cause/effect relationship (`motion-meaning`).

| Interaction | Duration | Easing |
|---|---|---|
| Hover | 120–180ms | `ease-out` |
| Button press | 100ms | `ease-out`, scale 0.97→1.0 |
| Card enter/reorder | 250–300ms | spring (stiffness 300, damping 30) |
| Drawer | 300ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Modal | 320ms | spring (stiffness 260, damping 26), scale+fade from trigger |
| Page transition | 350–450ms | `cubic-bezier(0.16, 1, 0.3, 1)` |

Rules:
- Animate `transform`/`opacity` only — never `width`/`height`/`top`/`left` (`transform-performance`).
- Exit animations run at ~65% of the enter duration (`exit-faster-than-enter`).
- List/grid items stagger 30–50ms apart on entrance; never all-at-once (`stagger-sequence`).
- Every animation must respect `prefers-reduced-motion` — ship the reduced-motion path,
  don't bolt it on later. Mirror the brief's own accessibility toggle (Smooth Animations
  default ON / Reduce Motion / Speed Slow-Normal-Fast) as an in-app Settings control.
- Modals/sheets animate outward from their trigger element for spatial continuity, not
  a generic center-fade.

**Named micro-interactions** (from the brief — implement these specifically):
- Hover lift (translateY(-2px) + shadow increase)
- Glass reflection movement (subtle gradient sheen shift on hover, glass cards only)
- Animated KPI counters (count up on mount/data change, ~600ms ease-out)
- Animated charts (line/area draw-in on mount, respecting reduced motion)
- Sidebar spring animation (collapse/expand)
- Search morphing (Cmd+K search expands from the top-bar search field, not a separate overlay)
- Live occupancy transitions (slot color crossfades on state change, ~300ms)

---

## 4. Responsive Layouts

Breakpoints: `375 / 768 / 1024 / 1440` px.

- **Super Admin (web)**: desktop-first (primary usage is a desk monitor), but must
  degrade gracefully to a 1024px laptop and remain usable (not necessarily optimized)
  down to tablet. Sidebar collapses to icon-only under 1280px, to an overlay drawer
  under 1024px.
- **Valet app (Android + mweb/dweb)**: mobile-first. Bottom tab bar (5 items max, per
  the reference screens: Home / Tickets / Scan / Earnings / Profile), single-column
  layouts, 16px screen padding, `min-h-dvh` not `100vh`.
- No horizontal scroll anywhere. Tables on narrow viewports switch to a card-per-row
  layout rather than scrolling horizontally.

---

## 5. Dashboard UI (Super Admin — Web)

Layout, top to bottom / left to right, matching the reference screenshots:

- **Top bar**: wordmark, global search (`⌘K`, morphs into command palette), AI Copilot
  entry point, notifications bell (badge count), theme toggle, user menu.
- **Left sidebar** (persistent ≥1280px, collapsible/drawer below): Dashboard, Live
  Occupancy, Parking Spaces, Camera Monitoring, ANPR Console, Entry & Exit Control, Pass
  Management, Visitors, Payments, Analytics & BI, Users & Roles, Devices, Reports, Audit
  Logs, Settings, Support. Active item: orange left rail + soft orange background tint.
- **Main content**:
  - Greeting row ("Good Morning, {name}" + system-status line + location/date filters)
  - KPI card row (6 cards: Total Slots, Occupied, Available, Revenue Today, Vehicles
    Today, Avg Stay Duration) — each with an icon badge, big `font-numeric` value, and a
    small trend sparkline + % delta vs. yesterday.
  - Live Occupancy Map — floor-plan grid, slots colored by `--status-*` tokens, zone/level selector.
  - Revenue Overview chart (line/area, range selector).
  - AI Insights panel (short list of AI-generated callouts with severity icons).
  - Camera Monitoring grid (2×2 live feed tiles, status pill per feed).
  - Recent Transactions table (sortable, status badges).
  - Exception Alerts list (feeds the Exception Resolution panel on click).
- **Right-hand contextual panel** (opens on demand, doesn't permanently occupy layout width):
  - **Exception Resolution Panel** — detected plate + confidence bar, correctable plate
    field, primary "Open Barrier" action, secondary actions (Retry OCR, Issue Pass,
    Blacklist, Call Security) as a dark pill button row.
  - **Create Parking Space** form (quick-create, matches Step 3 §3 hierarchical model).
  - **Monthly Pass Card** — brand gradient card with plate, validity, embedded QR.
  - **Payment Summary** mini-receipt.

This right panel pattern (contextual, not tab-based) is the Exception Resolution Matrix
from the PRD — keep it a slide-in glass sheet over the dashboard, not a route change.

---

## 6. Mobile Valet UI (Android + mweb/dweb)

Screens (from reference): **Home, Scan Vehicle, Vehicle Details, New Valet Parking
(4-step: Vehicle → Customer → Parking → Confirm), Parking Ticket (QR), Find Vehicle,
History, Earnings, Notifications, Profile.**

- **Bottom nav** (5 items): Home, Tickets, Scan (center, elevated/circular, brand
  gradient fill — the primary action), Earnings, Profile.
- **Home**: greeting header, Online/Offline status pill, "Today's Overview" brand
  gradient hero card (cars parked / returned / earnings / rating), Quick Actions grid
  (New Valet, Scan Ticket, Vehicles, Find Vehicle), Parking Summary stat row, Recent
  Activity list.
- **Scan Vehicle**: full-bleed dark camera viewport, large monospaced plate readout,
  manual-entry fallback link — camera-first, typing is the fallback, not the default.
- **New Valet Parking**: 4-step numbered progress indicator (Vehicle → Customer →
  Parking → Confirm), one primary CTA per step, back always available.
- **Parking Ticket**: brand gradient header card, large QR code, ticket ID in
  `font-numeric`, Share + Done actions.
- **Find Vehicle**: search + zone filter chips, mini occupancy map, result card with
  "Navigate to Vehicle" CTA.
- **History**: filter chips (All / Parked / Picked Up), status-colored list rows.
- **Earnings**: period tabs (Day/Week/Month/Year), animated area chart, breakdown by
  payment method (Cash/UPI/Tips), Total Transactions + Avg per Car stats.
- **Profile / Notifications**: standard list-menu pattern, status pill on avatar.

Mobile-specific rules: 44×44pt minimum touch targets, safe-area padding for the bottom
nav and any fixed CTA bar, haptic feedback on scan success / barrier actions / ticket
confirm, native camera + QR permissions requested contextually (not on first launch).

---

## 7. Component Library

Build these once as the shared primitive set (shadcn/ui on web, a matching Compose
component set on Android with the same tokens):

**Core**: Button (primary/secondary/tertiary/danger — see button spec below), Card
(flat + glass variants), Input, Select/Dropdown, Table (sortable, with card-view
fallback on mobile), Chart (line/area/bar — see §10 Charts guidance), Tag/Chip, Badge
(status-colored), Toast (auto-dismiss 3–5s, `aria-live="polite"`), Drawer, Modal/Sheet,
Empty State, Skeleton Loader, AI Chat components (message bubble, streaming text,
suggested-prompt chips).

**Buttons**
| Variant | Style |
|---|---|
| Primary | Brand gradient fill, white text, `--radius-md`, elevation-1 |
| Secondary | Solid dark/neutral fill (matches the "Issue Pass / Blacklist" pill row) |
| Tertiary | Text-only, brand-orange label |
| Danger | `--status-danger` fill, used for destructive/security actions (Call Security, Blacklist confirm) |

One primary CTA per screen/panel; everything else is visually subordinate
(`primary-action`).

> **Contrast caveat**: white text on `--brand-orange` measures ~3:1, below the 4.5:1 AA
> threshold for normal text (it only clears WCAG's "large text" exception at ≥14pt
> bold/18pt regular). Fine for hero CTAs, ticket headers, and large gradient cards where
> labels are big/bold — but small or dense primary buttons (inline table actions,
> compact toolbar buttons) should use the **secondary** (solid dark/neutral) variant
> instead of an orange fill, not a shrunken primary button.

**Status Badges**: filled pill, 12px caption text, icon + label — never color alone.
Maps 1:1 to `--status-*` tokens (Available/Occupied/Reserved/EV/Disabled/VIP/Paid/Inside).

**Skeleton loaders** replace spinners for any load >300ms; charts show a shimmer
placeholder, never a blank axis frame.

---

## 8. Light / Dark Themes

Both are first-class, designed together (not one derived by inversion). See §2.3 for
tokens. Summary:

- **Light** = frost white base, near-opaque glass, dark text — bright and airy, still
  glassy but legible for long dashboard sessions.
- **Dark** = near-black base (`#090B10`/`#10131A`), low-opacity glass with a visible hairline
  border so cards read as distinct layers, brand orange stays vibrant (bumped slightly
  lighter than the light-mode value for contrast on dark).

Theme toggle lives in the top bar (web) and Profile/Settings (mobile), and should follow
system preference by default with manual override persisted per user.

---

## 9. Iconography

- **Icon set**: [Lucide](https://lucide.dev) — consistent stroke-based icon family,
  matches the Linear/Stripe reference aesthetic. No emoji as functional icons, ever.
- **Stroke width**: 1.5px, consistent across the whole product.
- **Sizes** (tokens, not arbitrary values): `--icon-sm: 16px`, `--icon-md: 20px`,
  `--icon-lg: 24px`.
- One icon style (outline) per hierarchy level — don't mix filled and outline icons at
  the same nav/card level.
- Icon-only buttons always carry an `aria-label` / Compose `contentDescription`.

---

## 10. Micro-interactions

Covered in §3; additionally:
- Charts follow the standard chart guidance: legend always visible, tooltip on
  hover/tap, axis labels with units, colorblind-safe palette supplemented by direct
  labeling (not color alone), CSV export on data-heavy analytics views.
- Press feedback on every tappable element within 80–150ms (ripple on Android via
  Compose ripple indication, opacity/scale on web).
- Search (`⌘K`) morphs in place rather than opening a disconnected overlay, to preserve
  spatial continuity.

---

## 11. Accessibility

Non-negotiable baseline (WCAG AA):
- Text contrast ≥ 4.5:1 (body) / ≥ 3:1 (large text/icons), verified **independently in
  light and dark**, and specifically re-checked wherever text sits on a glass surface
  (§2.4 glass accessibility rule).
- Every interactive element ≥ 44×44pt touch target, 8px+ spacing between adjacent targets.
- Visible focus states on all interactive elements (2–4px ring using `--brand-orange`),
  never removed.
- Full keyboard navigation on web; tab order matches visual order.
- `prefers-reduced-motion` disables/reduces all non-essential motion; the in-app Motion
  setting (§3) offers the same control explicitly.
- Status is never color-only — pair every status color with an icon and/or text label.
- Screen reader support: descriptive labels on all icon-only controls and images;
  logical reading order; toasts use `aria-live="polite"` and never steal focus.
- Modal/sheet scrims are strong enough to isolate foreground content (40–60% black),
  and always offer a visible close affordance plus Escape/back support.
- Dynamic type / system text scaling supported on mobile; layouts must not truncate or
  break as text scales up.

---

## 12. Developer Handoff

- **Tokens live in one place**: web reads them as CSS variables (mapped into
  `tailwind.config`/`globals.css` in `apps/super-admin`); Android mirrors the same
  values in a `Theme.kt` / Compose `ColorScheme` + `Typography` object so both platforms
  stay in sync when a token changes here.
- **Never hardcode a raw hex or px value in a component.** Reference the semantic token
  (`--brand-orange`, `--radius-lg`, `--space-4`, etc.). If a needed value doesn't exist
  yet, add it here first, then consume it.
- **Naming convention**: `--{category}-{role}-{variant?}`, e.g. `--status-success`,
  `--surface-glass`, `--radius-lg`. Component variants follow shadcn's
  `variant`/`size` prop convention on web, and a matching `variant`/`size` enum on
  Compose components.
- Component states (hover/pressed/focused/disabled) must be defined for **both** themes
  before a component is considered done — don't ship a component validated in light mode only.

## 13. Structure for Future Design Files (Figma or otherwise)

No Figma file exists yet; if/when one is created, mirror this structure so design and
code stay traceable to the same source:

```
Pages: 0-Foundations (tokens, type, color, icons) · 1-Components · 2-Dashboard (Web)
       · 3-Valet App (Mobile) · 4-Patterns (empty/error/loading states)
Frames named: [Platform]/[Screen]/[State]  e.g. "Web/Dashboard/Default", "Android/Home/Loading"
```

Until then, this document plus the running `apps/super-admin` implementation *is* the
source of truth.

## 14. Implementation Notes by Stack

> Note: the original brief mentions React Native for the mobile app. Per the confirmed
> architecture decision for this project, the valet app is **native Android (Kotlin +
> Jetpack Compose)**, with a separate React web app covering dweb/mweb — not React
> Native. Notes below reflect that.

**Web (Next.js + Tailwind CSS + shadcn/ui + Framer Motion)** — Super Admin now, valet
dweb/mweb later:
- Map §2 tokens into `tailwind.config` `theme.extend` (colors, borderRadius, spacing) and
  `globals.css` `:root` / `.dark` CSS variables — shadcn's theming model already expects
  this pattern.
- Glass cards: Tailwind utility combo `bg-white/65 dark:bg-white/[0.06] backdrop-blur-2xl
  border border-black/[0.08] dark:border-white/10 rounded-3xl shadow-lg`.
- Framer Motion `layout` + `AnimatePresence` for the right-hand contextual panel (slide
  from the trigger, not a generic route/modal), spring configs per §3.
- Charts: Recharts or Visx, styled to token palette, legend + tooltip + CSV export built in.

**Android (Kotlin + Jetpack Compose)** — valet operator app:
- Mirror tokens in a `Theme.kt`: `lightColorScheme()` / `darkColorScheme()` built from
  §2.3, `Typography` built from §2.5 (map `SF Pro Display` → Android's system font or a
  bundled Inter/Manrope variable font, since SF Pro isn't licensed for Android).
- Glass surfaces: `Modifier.blur()` (Android 12+) with a graceful non-blur fallback
  (elevated solid surface + border) on older APIs — glassmorphism on Android needs a
  tested fallback path, unlike web `backdrop-filter`.
- Bottom nav via `NavigationBar` (Material 3), 5 items max, center Scan action as an
  elevated `FloatingActionButton`-style item matching brand gradient.
- Motion via Compose `animateFloatAsState` / `Animatable` with spring specs matching §3;
  respect `Settings.Global.ANIMATOR_DURATION_SCALE` / a custom in-app override for the
  brief's "Reduce Motion" control.
- Camera/QR via CameraX + ML Kit (plate OCR, QR scan/generate for tickets).
