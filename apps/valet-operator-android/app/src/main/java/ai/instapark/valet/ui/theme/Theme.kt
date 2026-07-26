package ai.instapark.valet.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

/**
 * Extra brand tokens Material3's ColorScheme has no slot for -- canvas gradient, card
 * hairlines, tints, the ticket-status ramp. Read via [ValetTheme.colors]. Values are
 * design.md §9 "Premium pass" (light) + §2's dark ramp (secondary theme) -- don't
 * eyeball-tune, the design mockups (`Valet App Revamp.dc.html`, ids 4a-4g) are the
 * pixel-accurate reference.
 */
data class ValetColors(
    val canvasTop: Color,
    val canvasBottom: Color,
    val surface: Color,
    val surfaceRaised: Color,
    val cardHairline: Color,
    val hairlineSoft: Color,
    val ink: Color,
    val inkSecondary: Color,
    val inkTertiary: Color,
    val fieldFill: Color,
    val fieldBorder: Color,
    val primary: Color,
    val primaryLight: Color,
    val accent: Color,
    val accentLight: Color,
    val success: Color,
    val warning: Color,
    val danger: Color,
    val tintBlue: Color,
    val tintOrange: Color,
    val tintGreen: Color,
    val tintRed: Color,
    val statusCheckedIn: Color,
    val statusCheckedInBg: Color,
    val statusParked: Color,
    val statusParkedBg: Color,
    val statusRequested: Color,
    val statusRequestedBg: Color,
    val statusInTransit: Color,
    val statusInTransitBg: Color,
    val statusDone: Color,
    val statusDoneText: Color,
    val statusDoneBg: Color,
    val statusVoided: Color,
    val statusVoidedBg: Color,
    val isDark: Boolean,
)

private val LightValetColors = ValetColors(
    canvasTop = CanvasTop,
    canvasBottom = CanvasBottom,
    surface = Surface,
    surfaceRaised = Surface,
    cardHairline = CardHairline,
    hairlineSoft = GroupedHairline,
    ink = Ink,
    inkSecondary = InkSecondary,
    inkTertiary = InkTertiary,
    fieldFill = FieldFill,
    fieldBorder = FieldBorder,
    primary = PrimaryBlue,
    primaryLight = PrimaryBlueLight,
    accent = AccentOrange,
    accentLight = AccentOrangeLight,
    success = SuccessGreen,
    warning = WarningAmber,
    danger = DangerRed,
    tintBlue = TintBlue,
    tintOrange = TintOrange,
    tintGreen = TintGreen,
    tintRed = TintRed,
    statusCheckedIn = StatusCheckedIn,
    statusCheckedInBg = StatusCheckedInBg,
    statusParked = StatusParked,
    statusParkedBg = StatusParkedBg,
    statusRequested = StatusRequested,
    statusRequestedBg = StatusRequestedBg,
    statusInTransit = StatusInTransit,
    statusInTransitBg = StatusInTransitBg,
    statusDone = StatusDone,
    statusDoneText = StatusDoneText,
    statusDoneBg = StatusDoneBg,
    statusVoided = StatusVoided,
    statusVoidedBg = StatusVoidedBg,
    isDark = false,
)

private val DarkValetColors = LightValetColors.copy(
    canvasTop = DarkBackground,
    canvasBottom = DarkBackground,
    surface = DarkSurface,
    surfaceRaised = DarkSurfaceRaised,
    cardHairline = DarkHairline,
    hairlineSoft = DarkHairline,
    ink = DarkInk,
    inkSecondary = DarkInkMuted,
    inkTertiary = DarkInkMuted,
    fieldFill = DarkSurfaceRaised,
    fieldBorder = DarkHairline,
    primary = DarkBrandBlue,
    primaryLight = DarkBrandBlue,
    accent = DarkCtaOrange,
    accentLight = DarkCtaOrange,
    tintBlue = DarkBrandBlueTint,
    isDark = true,
)

private val LocalValetColors = staticCompositionLocalOf { LightValetColors }

object ValetTheme {
    val colors: ValetColors
        @Composable get() = LocalValetColors.current
}

private val LightColorScheme = lightColorScheme(
    primary = PrimaryBlue,
    onPrimary = Surface,
    secondary = AccentOrange,
    onSecondary = Surface,
    background = CanvasBottom,
    onBackground = Ink,
    surface = Surface,
    onSurface = Ink,
    surfaceVariant = FieldFill,
    onSurfaceVariant = InkSecondary,
    outline = FieldBorder,
    error = DangerRed,
)

private val DarkColorScheme = darkColorScheme(
    primary = DarkBrandBlue,
    onPrimary = DarkInk,
    secondary = DarkCtaOrange,
    onSecondary = DarkInk,
    background = DarkBackground,
    onBackground = DarkInk,
    surface = DarkSurface,
    onSurface = DarkInk,
    surfaceVariant = DarkSurfaceRaised,
    onSurfaceVariant = DarkInkMuted,
    outline = DarkHairline,
    error = DangerRed,
)

@Composable
fun InstaParkValetTheme(
    darkTheme: Boolean = false,
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val valetColors = if (darkTheme) DarkValetColors else LightValetColors
    CompositionLocalProvider(LocalValetColors provides valetColors) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = Typography,
            content = content,
        )
    }
}
