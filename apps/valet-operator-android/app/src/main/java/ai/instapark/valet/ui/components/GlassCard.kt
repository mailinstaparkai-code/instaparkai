package ai.instapark.valet.ui.components

import ai.instapark.valet.ui.theme.ValetTheme
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * The revamp's floating 3D card: rounded 20dp, 1dp hairline border, subtle
 * top-highlight gradient, and an optional accent glow washed across the surface
 * (the reference cards each carry their dashlet's accent at low opacity).
 */
@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    accent: Color? = null,
    cornerRadius: Dp = 20.dp,
    contentPadding: Dp = 16.dp,
    content: @Composable BoxScope.() -> Unit,
) {
    val colors = ValetTheme.colors
    val shape = RoundedCornerShape(cornerRadius)
    Box(
        modifier = modifier
            .clip(shape)
            .background(colors.cardBackground)
            .border(1.dp, colors.cardBorder, shape)
            .drawBehind {
                // Inner top light -- the faint edge highlight from the spec
                drawRect(
                    brush = Brush.verticalGradient(
                        colors = listOf(Color.White.copy(alpha = 0.05f), Color.Transparent),
                        endY = size.height * 0.35f,
                    )
                )
                if (accent != null) {
                    // Soft accent glow bleeding from the top-left corner
                    drawRect(
                        brush = Brush.radialGradient(
                            colors = listOf(accent.copy(alpha = 0.14f), Color.Transparent),
                            center = Offset(size.width * 0.2f, 0f),
                            radius = size.maxDimension * 0.75f,
                        )
                    )
                }
            }
            .padding(contentPadding),
        content = content,
    )
}
