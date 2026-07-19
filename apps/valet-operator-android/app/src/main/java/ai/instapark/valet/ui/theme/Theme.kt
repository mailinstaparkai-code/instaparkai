package ai.instapark.valet.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

/**
 * Extra brand tokens Material3's ColorScheme has no slot for -- card borders, the
 * per-accent dashlet colors, glow tints. Read via [ValetTheme.colors].
 */
data class ValetColors(
    val cardBorder: Color,
    val cardBackground: Color,
    val backgroundDeep: Color,
    val textSecondary: Color,
    val orange: Color,
    val blue: Color,
    val green: Color,
    val purple: Color,
    val successGlow: Color,
    val danger: Color,
    val warning: Color,
    val info: Color,
    val isDark: Boolean,
)

private val DarkValetColors = ValetColors(
    cardBorder = DarkBorder,
    cardBackground = DarkCard,
    backgroundDeep = DarkBackgroundDeep,
    textSecondary = DarkTextSecondary,
    orange = BrandOrange,
    blue = AccentBlue,
    green = AccentGreen,
    purple = AccentPurple,
    successGlow = SuccessGlow,
    danger = StatusDanger,
    warning = StatusWarning,
    info = StatusInfo,
    isDark = true,
)

private val LightValetColors = DarkValetColors.copy(
    cardBorder = LightBorder,
    cardBackground = LightCard,
    backgroundDeep = LightMuted,
    textSecondary = LightTextSecondary,
    isDark = false,
)

private val LocalValetColors = staticCompositionLocalOf { DarkValetColors }

object ValetTheme {
    val colors: ValetColors
        @Composable get() = LocalValetColors.current
}

private val DarkColorScheme = darkColorScheme(
    primary = BrandOrange,
    onPrimary = DarkTextPrimary,
    secondary = AccentBlue,
    onSecondary = DarkTextPrimary,
    background = DarkBackground,
    onBackground = DarkTextPrimary,
    surface = DarkCard,
    onSurface = DarkTextPrimary,
    surfaceVariant = DarkCardRaised,
    onSurfaceVariant = DarkTextSecondary,
    outline = DarkBorder,
    error = StatusDanger,
)

private val LightColorScheme = lightColorScheme(
    primary = BrandOrange,
    onPrimary = LightCard,
    secondary = AccentBlue,
    onSecondary = LightCard,
    background = LightBackground,
    onBackground = LightTextPrimary,
    surface = LightCard,
    onSurface = LightTextPrimary,
    surfaceVariant = LightMuted,
    onSurfaceVariant = LightTextSecondary,
    outline = LightBorder,
    error = StatusDanger,
)

@Composable
fun InstaParkValetTheme(
    darkTheme: Boolean = true,
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
