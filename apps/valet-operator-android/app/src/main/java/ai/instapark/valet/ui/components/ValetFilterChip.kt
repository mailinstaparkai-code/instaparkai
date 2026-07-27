package ai.instapark.valet.ui.components

import ai.instapark.valet.ui.theme.ValetTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

/**
 * A pill that visibly reads as a tab: filled + elevated when selected, outlined when not.
 * Shared across Queue and Vehicles filter rows so both stay visually in sync (Vehicles used
 * to fall back to a bare, unstyled Material3 FilterChip -- fixed here rather than duplicating
 * this styling a second time).
 */
@Composable
fun ValetFilterChip(selected: Boolean, label: String, onClick: () -> Unit) {
    val colors = ValetTheme.colors
    FilterChip(
        selected = selected,
        onClick = onClick,
        label = { Text(label, fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium) },
        shape = RoundedCornerShape(50),
        colors = FilterChipDefaults.filterChipColors(
            containerColor = colors.surface,
            labelColor = colors.inkSecondary,
            selectedContainerColor = colors.primary,
            selectedLabelColor = Color.White,
        ),
        border = FilterChipDefaults.filterChipBorder(
            enabled = true,
            selected = selected,
            borderColor = colors.fieldBorder,
            selectedBorderColor = colors.primary,
            borderWidth = 1.dp,
            selectedBorderWidth = 0.dp,
        ),
        elevation = FilterChipDefaults.filterChipElevation(
            elevation = 0.dp,
            pressedElevation = 2.dp,
        ),
    )
}
