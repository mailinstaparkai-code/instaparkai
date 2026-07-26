package ai.instapark.valet.ui.components

import ai.instapark.valet.data.remote.dto.FilterOption
import ai.instapark.valet.ui.theme.ValetTheme
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.DirectionsCar
import androidx.compose.material.icons.outlined.LocalShipping
import androidx.compose.material.icons.outlined.MoreHoriz
import androidx.compose.material.icons.outlined.TwoWheeler
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

private fun iconFor(vehicleTypeValue: String): ImageVector {
    val t = vehicleTypeValue.lowercase()
    return when {
        "bike" in t || "motor" in t || "scoot" in t || "2" in t -> Icons.Outlined.TwoWheeler
        "truck" in t || "van" in t -> Icons.Outlined.LocalShipping
        "car" in t || "sedan" in t || "4" in t -> Icons.Outlined.DirectionsCar
        else -> Icons.Outlined.MoreHoriz
    }
}

/**
 * The 4-across icon-tile vehicle-type picker from `Check in popup.png` -- driven
 * by the site's actual configurable `vehicleTypeOptions` (not hardcoded to 4),
 * wrapping onto a second row if a site has more than 4 types.
 */
@Composable
fun VehicleTypeSelector(
    options: List<FilterOption>,
    selected: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = ValetTheme.colors
    val rows = options.chunked(4)
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        rows.forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                row.forEach { option ->
                    val active = option.value == selected
                    val bg by animateColorAsState(
                        targetValue = if (active) colors.tintBlue else colors.fieldFill,
                        animationSpec = tween(200),
                        label = "vehicleTypeBg",
                    )
                    val border by animateColorAsState(
                        targetValue = if (active) colors.primary else colors.fieldBorder,
                        animationSpec = tween(200),
                        label = "vehicleTypeBorder",
                    )
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(14.dp))
                            .background(bg)
                            .border(1.dp, border, RoundedCornerShape(14.dp))
                            .clickable { onSelect(option.value) }
                            .padding(vertical = 12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Icon(
                            iconFor(option.value),
                            contentDescription = null,
                            tint = if (active) colors.primary else colors.inkSecondary,
                            modifier = Modifier.padding(bottom = 6.dp),
                        )
                        Text(
                            option.label,
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = if (active) FontWeight.Bold else FontWeight.Medium,
                            color = if (active) colors.primary else colors.inkSecondary,
                        )
                    }
                }
            }
        }
    }
}
