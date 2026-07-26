package ai.instapark.valet.ui.components

import ai.instapark.valet.ui.theme.ValetTheme
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

/**
 * design.md §6 -- "Mark-as-parked replaces the dropdown with tappable 44px slot chips.
 * Dispatch replaces the dropdown with operator rows." A single tappable-row picker
 * covers both cases (no native Spinner/DropdownMenu for these two flows).
 */
@Composable
fun TappableRowPicker(
    label: String,
    options: List<Pair<String, String>>,
    selected: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = ValetTheme.colors
    Column(modifier = modifier.fillMaxWidth()) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = colors.inkSecondary)
        Spacer(Modifier.height(8.dp))
        if (options.isEmpty()) {
            Text(
                "None available",
                style = MaterialTheme.typography.bodySmall,
                color = colors.inkTertiary,
                modifier = Modifier.padding(vertical = 12.dp),
            )
        }
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            options.forEach { (value, optLabel) ->
                val active = value == selected
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(if (active) colors.tintBlue else colors.fieldFill)
                        .border(
                            width = if (active) 1.5.dp else 1.dp,
                            color = if (active) colors.primary else colors.fieldBorder,
                            shape = RoundedCornerShape(14.dp),
                        )
                        .clickable { onSelect(value) }
                        .padding(horizontal = 14.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        optLabel,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = if (active) FontWeight.SemiBold else FontWeight.Medium,
                        color = if (active) colors.primary else colors.ink,
                    )
                    if (active) {
                        Icon(
                            Icons.Outlined.CheckCircle,
                            contentDescription = null,
                            tint = colors.primary,
                            modifier = Modifier.size(20.dp),
                        )
                    }
                }
            }
        }
    }
}
