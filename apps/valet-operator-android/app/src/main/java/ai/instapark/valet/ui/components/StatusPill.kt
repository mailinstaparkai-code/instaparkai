package ai.instapark.valet.ui.components

import ai.instapark.valet.ui.theme.ValetTheme
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

/** Ticket-status colors shared by Queue and Vehicles cards (mirrors the web's STATUS_COLOR). */
@Composable
fun statusAccent(status: String): Color {
    val colors = ValetTheme.colors
    return when (status) {
        "checked_in" -> colors.blue
        "parked" -> colors.info
        "requested" -> colors.warning
        "in_transit" -> colors.orange
        "arrived" -> colors.green
        "completed" -> colors.green
        "voided" -> colors.danger
        else -> colors.textSecondary
    }
}

/** Rounded dot+text status chip with a tinted background, per the reference cards. */
@Composable
fun StatusPill(label: String, accent: Color, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(50))
            .background(accent.copy(alpha = 0.15f))
            .padding(horizontal = 10.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        androidx.compose.foundation.layout.Box(
            modifier = Modifier
                .size(6.dp)
                .clip(CircleShape)
                .background(accent)
        )
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Medium,
            color = accent,
            modifier = Modifier.padding(start = 6.dp),
        )
    }
}
