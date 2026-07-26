package ai.instapark.valet.ui.theme

import androidx.compose.ui.graphics.Color

// 2026 sky-blue brand revamp -- design.md §9 "Premium pass" (current target for the
// app) + §2's status ramp and dark ramp (not redefined by §9, kept as the shared base).
// Use EXACT values from design.md; don't eyeball-tune them.

// Brand (light, primary theme)
val PrimaryBlue = Color(0xFF2563EB)
val PrimaryBlueLight = Color(0xFF3B82F6) // gradient start, 135deg -> PrimaryBlue
val AccentOrange = Color(0xFFFF6A3D)
val AccentOrangeLight = Color(0xFFFF7A4D) // gradient start, 135deg -> AccentOrange
val SuccessGreen = Color(0xFF16A34A)
val WarningAmber = Color(0xFFF59E0B)
val DangerRed = Color(0xFFEF4444)

val CanvasTop = Color(0xFFF7F9FC)
val CanvasBottom = Color(0xFFEEF4FF)
val Surface = Color(0xFFFFFFFF)
val Ink = Color(0xFF0F172A)
val InkSecondary = Color(0xFF64748B)
val InkTertiary = Color(0xFF94A3B8)
val FieldFill = Color(0xFFF8FAFD)
val FieldBorder = Color(0xFFE7EDF6)
val CardHairline = Color(0x0A0F172A) // rgba(15,23,42,0.04)
val ChipHairline = Color(0x0F0F172A) // rgba(15,23,42,0.06)
val GroupedHairline = Color(0xFFF4F7FC)

val PhotoDashedBorder = Color(0xFFC9D9EF)
val TintBlue = Color(0xFFEFF5FF)
val TintOrange = Color(0xFFFFF1EB)
val TintGreen = Color(0xFFEBFAF0)
val TintRed = Color(0xFFFEF0F0)

// Ticket status ramp (design.md §2 -- not redefined by §9's Premium pass, so this is
// the shared base for both app and web)
val StatusCheckedIn = Color(0xFF0B5FD6)
val StatusParked = Color(0xFF1478FF)
val StatusRequested = Color(0xFFE8890C)
val StatusInTransit = Color(0xFFFF6B36)
val StatusDone = Color(0xFF12A150) // arrived + completed
val StatusDoneText = Color(0xFF0C7A3D)
val StatusVoided = Color(0xFFE23D3D)

val StatusCheckedInBg = Color(0xFFEAF2FE)
val StatusParkedBg = Color(0xFFEAF2FE)
val StatusRequestedBg = Color(0xFFFDF3E3)
val StatusInTransitBg = Color(0xFFFFEDE4)
val StatusDoneBg = Color(0xFFE4F7EC)
val StatusVoidedBg = Color(0xFFFDECEC)

// Dark ramp (secondary theme, design.md §2)
val DarkBackground = Color(0xFF0A1220)
val DarkSurface = Color(0xFF121C2D)
val DarkSurfaceRaised = Color(0xFF16223A)
val DarkHairline = Color(0xFF22314C)
val DarkInk = Color(0xFFF3F7FD)
val DarkInkMuted = Color(0xFF9BA9BF)
val DarkBrandBlue = Color(0xFF4B9BFF)
val DarkBrandBlueTint = Color(0x294B9BFF) // rgba(75,155,255,0.16)
val DarkCtaOrange = Color(0xFFFF7A47)
