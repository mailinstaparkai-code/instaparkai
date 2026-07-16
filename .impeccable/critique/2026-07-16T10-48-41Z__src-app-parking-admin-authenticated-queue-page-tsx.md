---
target: Parking Admin dashboard/queue
total_score: 23
p0_count: 1
p1_count: 2
timestamp: 2026-07-16T10-48-41Z
slug: src-app-parking-admin-authenticated-queue-page-tsx
---
Method: dual-agent (A: design-review sub-agent, browser-verified · B: detector sub-agent, CLI-verified; live DOM overlay confirmation unavailable — see Anti-Patterns Verdict)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Pending states exist ("Saving…", "Dispatching…", 20s notification poll) but no loading skeleton on first dialog open |
| 2 | Match Between System / Real World | 3 | "Checked in" status badge renders in the `--status-disabled` (purple) token, which design.md reserves for "Disabled/accessible slot" — an active ticket visually reads as inactive |
| 3 | User Control and Freedom | 2 | Escape closes `Dialog`s but not the notifications bell, user menu, or filter popovers — verified live |
| 4 | Consistency and Standards | 3 | Dialog pattern genuinely consistent app-wide; docked by the status-color mismatch and unstyled native file inputs |
| 5 | Error Prevention | 1 | Handover dialog displays the guest's real OTP directly above the field asking staff to enter it — the verification step can't fail even when unperformed |
| 6 | Recognition Rather Than Recall | 3 | Slot/operator pickers show all valid options inline; fare pre-filled via `computeFare()` |
| 7 | Flexibility and Efficiency of Use | 2 | No bulk actions, no keyboard shortcuts, `⌘K` box appears non-functional; every status transition needs a full modal round-trip |
| 8 | Aesthetic and Minimalist Design | 3 | Restrained, tight rhythm, one accent color doing the talking |
| 9 | Error Recovery | 3 | Wrong-OTP test produced a clear inline error without losing dialog state (fare, checkbox) — verified live |
| 10 | Help and Documentation | 0 | No inline help or "why is this disabled" affordance anywhere |
| **Total** | | **23/40** | **Acceptable — significant improvements needed before users are happy** |

## Anti-Patterns Verdict

**LLM assessment (Assessment A, browser-verified across light/dark, 1280px/1024px/375px)**: Does not read as generic AI slop — no gradient text, no hero-metric template, no identical card grids, copy is terse and operational rather than marketing-voiced, and the `glass-card` KPI/table surfaces correctly stay near-opaque rather than decoratively blurred (matching design.md's own §2.4 accessibility caveat). The one place it looks unfinished rather than "AI-made" is the native, unstyled `<input type="file">` controls, and a genuine text-overflow bug where "No file chosen" truncates to "No ...sen" in the check-in dialog's narrow grid.

**Deterministic scan (Assessment B)**: `detect.mjs` run against the queue directory + `queue-filters.tsx`, `multi-select.tsx`, `app-shell.tsx`, `notifications-bell.tsx` returned exit code 2, one finding:

| Rule | File | Line | Snippet |
|---|---|---|---|
| `side-tab` (side-stripe accent border) | `app-shell.tsx` | 82 | `border-l-2` |

Manually verified against source: this is the sidebar's active-nav-item indicator (`border-l-2`, `border-brand-orange` when active / `border-transparent` otherwise) — a real, live match for the rule, not a scanner artifact. **Context that matters**: design.md §5 explicitly specifies this as intentional — "Active item: orange left rail + soft orange background tint" — so this isn't an accidental AI tell, it's a documented design decision, and left-rail active-indicators are an established pattern in this category (Linear, VS Code, GitHub). Flagging it here as a "confirm this is deliberate, not default-reached-for" item rather than a defect — but worth knowing your own design system is triggering your own slop detector, which is a useful signal either way.

**Visual overlays**: not available for this run. The live-DOM overlay pass requires the dev server to be up at injection time; it went down between the design-review and detector sub-agent runs (environment flakiness, not a browser-automation limitation — Assessment A's live interaction testing succeeded fully on the same page shortly before). No user-visible `[Human]`-tab overlay was produced. This doesn't weaken the findings above — Assessment A's live interaction testing (full ticket lifecycle, both themes, three viewport widths) is a stronger evidence source than the automated overlay would have added on top of it — but it's an honest gap worth naming rather than silently omitting.

## Overall Impression

This is a real, working product screen with genuine craft in a few high-stakes spots (the handover error-recovery UX, the auto-allocate toggle cutting real clicks) sitting alongside gaps that undercut the product's own stated design philosophy. The biggest opportunity: the page's single most safety-critical interaction — releasing a vehicle back to a guest — currently has a verification control that can't fail, because the value being verified is shown right next to the field verifying it. Fixing that one dialog does more for trust in this product than any visual polish would.

## What's Working

1. **Handover error recovery** (`handover-button.tsx`) — verified live: a wrong OTP produces a clear inline error, keeps the dialog open, and preserves the entered fare and payment-checkbox state rather than resetting the form. Exactly the kind of small correctness that prevents a stressed operator from re-entering data twice.
2. **Notifications bell** (`notifications-bell.tsx`) — the "vibrate only on a genuine increment, not on first load" logic (lines 23–31) is a restrained, purposeful micro-interaction, and the panel itself is a clean chronological audit trail (verified: full ticket journey in order with human-readable timestamps).
3. **Auto-allocate toggle** — one well-labeled switch measurably cuts clicks per ticket by skipping the manual operator-picker dialog entirely. The one spot the product actively optimizes for the high-volume case instead of gating every step behind a manual step.

## Priority Issues

**[P0] The OTP is displayed next to its own verification field**
- **Why it matters**: `handover-button.tsx` (lines 52–55) shows the guest's actual OTP directly above the input asking staff to enter it to confirm a match — verified live. This is the highest-stakes moment in the whole flow (releasing a vehicle to whoever's standing there), and the control currently can't fail: nothing stops an operator from typing the visible number without ever asking the guest.
- **Fix**: stop rendering the correct OTP in the confirming (admin-side) dialog. Surface it only via the guest's own tracking link/SMS; let the input's pass/fail be the only signal on the admin side.
- **Suggested command**: `/impeccable harden` (this is a real-world error-prevention/security gap, not a cosmetic one)

**[P1] The design system's own responsive spec is violated on this exact page**
- **Why it matters**: design.md §4 states tables switch to card-per-row under a narrow viewport rather than horizontal scroll, and the sidebar collapses to icon-only/drawer at 1024px. Verified live at 375px: the 8-column table crushes into the same `<table>` with words breaking mid-syllable ("L1-\n01", "Checked\nin"). At 1024px the 256px text sidebar stays permanently docked. This is the page staff use all shift, and it's the one page the design system explicitly specs to degrade gracefully — it doesn't.
- **Fix**: build the card-per-row fallback already described in design.md; wire the sidebar's existing drawer logic (already coded in `app-shell.tsx`) to the `lg` (1024px) breakpoint for its persistent variant.
- **Suggested command**: `/impeccable adapt`

**[P1] Semantic status-color misuse on the primary status badge**
- **Why it matters**: `page.tsx` line 40 maps `checked_in` → `bg-status-disabled/15 text-status-disabled` (purple). design.md §2.2 reserves that token specifically for "Disabled/accessible slot." A freshly checked-in, fully active vehicle reads at-a-glance as disabled — the opposite of its meaning, undermining design.md's own stated philosophy ("a Super Admin glancing at the dashboard for 2 seconds must know if everything is fine").
- **Fix**: give `checked_in` its own semantic color (e.g. `--status-info`/blue, distinct from both `requested`/warning and `disabled`/purple) rather than borrowing the disabled token.
- **Suggested command**: `/impeccable colorize`

**[P2] No edit or void path for a mis-entered ticket**
- **Why it matters**: once checked in, there's no visible way to correct a mistyped plate/mobile number or void a ticket. For an action performed hundreds of times a shift, typos are inevitable — the only path found was "live with it."
- **Fix**: add an edit affordance on the vehicle-number/mobile cells, or a kebab menu per row with "Edit details" / "Void ticket."
- **Suggested command**: `/impeccable harden`

**[P2] Native file input styling breaks the design system and truncates**
- **Why it matters**: verified visually — "No file chosen" renders as "No ...sen" in the check-in dialog's two-column photo grid (`page.tsx` lines 198–204), and the unstyled browser-native "Choose file" button clashes with every other styled control in the app.
- **Fix**: wrap in a custom-styled trigger matching every other button in the app; truncate filenames with a trailing ellipsis, or drop the "no file" text in favor of an icon-only empty state.
- **Suggested command**: `/impeccable polish`

## Persona Red Flags

**Riley (stress-tester, high-volume shift staff)**: Riley's loop is check-in → park → dispatch → handover, on repeat all day. Two failures hit Riley specifically: the visible-OTP issue (P0) means Riley can blow through handovers without ever actually asking the guest to confirm — exactly the failure mode that shows up under end-of-shift fatigue. And the missing void/edit path (P2) means one fat-fingered plate (no format validation beyond `required` on `vehicle_number`, confirmed) becomes permanent queue noise Riley has to mentally route around for the rest of the shift.

**Sam (accessibility-dependent)**: Escape-key dismissal is inconsistent — works on `Dialog`, fails on the notifications bell, user menu, and filter popovers (verified live), directly contradicting design.md §11's "full keyboard navigation... tab order matches visual order." The purple "Checked in" badge (P1 above) compounds this for a low-vision user relying partly on color memory, since the color itself is semantically wrong, not just hard to see.

**Jordan (first-timer / new hire mid-shift)**: Total absence of contextual help (Heuristic 10 scored 0) means a new Parking Admin has no in-product way to learn why "Mark as parked" is disabled or what "auto-allocate" does beyond its label — everything has to be explained by a colleague, not the interface.

## Minor Observations

- The `⌘K` search box in the top bar (`app-shell.tsx` lines 106–112) renders as a static placeholder with no wired-up command palette found during testing — the persistent `⌘K` badge sets an expectation the product doesn't currently meet.
- The "AI Copilot" pill appears on this dense operational screen with no discoverable way to invoke it during testing — worth confirming it isn't just decorative chrome, which design.md itself warns against ("intelligent motion... never decoration," §1).
- Focus ring correctly lingers on the "Complete handover" trigger after its dialog closes — a small, real accessibility win, verified in screenshot.
- The KPI row's `grid-cols-2 sm:grid-cols-5` response is a sensible, working mobile fallback — in clear contrast to the table below it, which isn't.
- `app-shell.tsx:82`'s side-rail border is a documented, intentional design.md pattern (§5) that the automated slop detector still flags — worth a quick "yes, keep it" confirmation rather than a fix, but noted for the record.

## Questions to Consider

- If the OTP is visible to the person who's supposed to be checking it, what is this control actually protecting against — has it quietly become theater nobody's revisited since it shipped?
- design.md's card-per-row mobile-table spec and 1024px sidebar-collapse spec are both explicit and both unmet on the page they were clearly written for. Is design.md still the living source of truth it claims to be, or has implementation drifted past it without either side being updated?
- Auto-allocate is the default and skips the operator-picker dialog entirely — if manual dispatch is rare, is the extra confirm-dialog friction on the common (auto) path worth it just to guard against a wrong click on the uncommon (manual) path?
