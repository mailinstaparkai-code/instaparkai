package ai.instapark.valet.ui.components

import ai.instapark.valet.ui.theme.Ink
import ai.instapark.valet.ui.theme.ValetTheme
import ai.instapark.valet.ui.theme.ValetTokens
import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * design.md §9/§5 "Card" -- borderless white card on a soft two-layer ambient shadow,
 * no accent glow wash (that was a dark-mode device). [raised] steps up the shadow for
 * cards that should read as elevated above their neighbours (§9 "raised" elevation).
 * [tint], when supplied, blends onto the card's surface (opaque pastel, not a see-through
 * overlay) and pairs with a matching hairline [tint]-tinted border -- used by StatDashlet
 * for the per-metric tinted cards from the reference dashboard mockup.
 */
@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    cornerRadius: Dp = ValetTokens.radiusCard,
    contentPadding: Dp = ValetTokens.cardPaddingLarge,
    raised: Boolean = false,
    tint: Color? = null,
    content: @Composable BoxScope.() -> Unit,
) {
    val colors = ValetTheme.colors
    val shape = RoundedCornerShape(cornerRadius)
    val shadowColor = Ink.copy(alpha = if (colors.isDark) 0f else 0.08f)
    val background = tint?.copy(alpha = 0.10f)?.compositeOver(colors.surface) ?: colors.surface
    Box(
        modifier = modifier
            .shadow(
                elevation = if (raised) 20.dp else 16.dp,
                shape = shape,
                ambientColor = shadowColor,
                spotColor = shadowColor,
            )
            .clip(shape)
            .background(background)
            .then(
                if (tint != null) {
                    Modifier.border(BorderStroke(1.dp, tint.copy(alpha = 0.22f)), shape)
                } else {
                    Modifier
                }
            )
            .padding(contentPadding),
        content = content,
    )
}
