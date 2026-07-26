package ai.instapark.valet.ui.components

import ai.instapark.valet.ui.theme.ValetTheme
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
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
 * design.md §5 "Segmented control" -- a blue-glow pill slides and spring-bounces to
 * the selected segment (rather than just fading a border), so the toggle reads as
 * physically tactile.
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
    val selectedIndex = options.indexOfFirst { it.value == selected }.coerceAtLeast(0)
    val hasSelection = selected != null

    BoxWithConstraints(modifier = modifier.fillMaxWidth()) {
        val segmentWidth = maxWidth / options.size
        val indicatorOffset by animateDpAsState(
            targetValue = segmentWidth * selectedIndex,
            animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessLow),
            label = "indicatorOffset",
        )
        val indicatorScale by animateFloatAsState(
            targetValue = if (hasSelection) 1f else 0f,
            animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMedium),
            label = "indicatorScale",
        )

        // Sliding glow pill, behind the row of icon/label content.
        if (hasSelection) {
            Box(
                modifier = Modifier
                    .offset(x = indicatorOffset)
                    .padding(horizontal = 4.dp)
                    .size(width = segmentWidth - 8.dp, height = 56.dp * indicatorScale.coerceIn(0f, 1f))
                    .clip(RoundedCornerShape(14.dp))
                    .border(1.dp, colors.primary, RoundedCornerShape(14.dp))
                    .drawBehind {
                        drawRect(
                            brush = Brush.radialGradient(
                                colors = listOf(colors.primary.copy(alpha = 0.30f), Color.Transparent),
                                radius = size.maxDimension * 0.8f,
                            )
                        )
                    }
            )
        }

        Row(modifier = Modifier.fillMaxWidth()) {
            options.forEach { option ->
                val active = selected == option.value
                val contentColor by animateColorAsState(
                    targetValue = if (active) colors.primary else colors.inkSecondary,
                    animationSpec = tween(200),
                    label = "content",
                )
                Column(
                    modifier = Modifier
                        .weight(1f)
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
                        tint = contentColor,
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
}
