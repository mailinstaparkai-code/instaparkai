package ai.instapark.valet.ui.components

import ai.instapark.valet.ui.theme.ValetTheme
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

data class SegmentOption(
    val value: String,
    val label: String,
    val icon: ImageVector,
)

/**
 * The My Status IN | BREAK | OUT control from the Operator Home reference: each
 * segment is an icon + label; the selected one gets a green-bordered rounded pill
 * with a radial success glow, animated over 300ms (the spec's "soft pulse" select).
 */
@Composable
fun AnimatedSegmented(
    options: List<SegmentOption>,
    selected: String?,
    enabled: Boolean = true,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = ValetTheme.colors
    Row(modifier = modifier.fillMaxWidth()) {
        options.forEach { option ->
            val active = selected == option.value
            val glowAlpha by animateFloatAsState(
                targetValue = if (active) 0.30f else 0f,
                animationSpec = tween(300),
                label = "glow",
            )
            val borderColor by animateColorAsState(
                targetValue = if (active) colors.successGlow else Color.Transparent,
                animationSpec = tween(300),
                label = "border",
            )
            val contentColor by animateColorAsState(
                targetValue = if (active) MaterialTheme.colorScheme.onBackground else colors.textSecondary,
                animationSpec = tween(300),
                label = "content",
            )
            val shape = RoundedCornerShape(14.dp)
            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 4.dp)
                    .clip(shape)
                    .border(1.dp, borderColor, shape)
                    .drawBehind {
                        if (glowAlpha > 0f) {
                            drawRect(
                                brush = Brush.radialGradient(
                                    colors = listOf(
                                        colors.successGlow.copy(alpha = glowAlpha),
                                        Color.Transparent,
                                    ),
                                    radius = size.maxDimension * 0.8f,
                                )
                            )
                        }
                    }
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                        enabled = enabled && !active,
                    ) { onSelect(option.value) }
                    .padding(vertical = 12.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Icon(
                    option.icon,
                    contentDescription = null,
                    tint = if (active) colors.successGlow else contentColor,
                    modifier = Modifier.size(22.dp),
                )
                Text(
                    option.label,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = if (active) FontWeight.Bold else FontWeight.Medium,
                    color = contentColor,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
        }
    }
}
