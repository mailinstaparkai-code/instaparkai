package ai.instapark.valet.ui.theme

import androidx.compose.ui.unit.dp

/**
 * design.md §9 -- 8pt grid, radii, spacing. Reference these instead of inline literals.
 */
object ValetTokens {
    // Grid
    val screenPadding = 20.dp
    val cardPaddingSmall = 14.dp
    val cardPaddingLarge = 18.dp
    val gapSmall = 12.dp
    val gapLarge = 16.dp
    val dockInset = 16.dp

    // Radii
    val radiusFrame = 30.dp
    val radiusCard = 26.dp
    val radiusCardSecondary = 22.dp
    val radiusButton = 18.dp
    val radiusField = 16.dp
    val radiusIconTile = 14.dp
    val radiusPill = 999.dp

    // Component heights
    val buttonHeight = 56.dp
    val fieldHeight = 56.dp
    val otpBoxSize = 62.dp
    val chipHeight = 40.dp
    val dockHeight = 76.dp

    // Motion
    const val motionDurationMs = 280
    const val pressScale = 0.98f
    const val springStiffness = 380f
    const val springDamping = 30f
}
