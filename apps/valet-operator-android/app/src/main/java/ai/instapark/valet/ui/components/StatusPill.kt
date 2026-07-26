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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** design.md §2 -- the ticket-status ramp, shared by Queue and Vehicles cards (mirrors web's STATUS_COLOR). */
@Composable
fun statusAccent(status: String): Color {
    val colors = ValetTheme.colors
    return when (status) {
        "checked_in" -> colors.statusCheckedIn
        "parked" -> colors.statusParked
        "requested" -> colors.statusRequested
        "in_transit" -> colors.statusInTransit
        "arrived", "completed" -> colors.statusDone
        "voided" -> colors.statusVoided
        else -> colors.inkSecondary
    }
}

@Composable
private fun statusAccentBg(status: String): Color {
    val colors = ValetTheme.colors
    return when (status) {
        "checked_in" -> colors.statusCheckedInBg
        "parked" -> colors.statusParkedBg
        "requested" -> colors.statusRequestedBg
        "in_transit" -> colors.statusInTransitBg
        "arrived", "completed" -> colors.statusDoneBg
        "voided" -> colors.statusVoidedBg
        else -> colors.hairlineSoft
    }
}

/**
 * design.md §5 "StatusPill" -- dot + 11/700 uppercase label, tinted pill background
 * from the status ramp (not an alpha wash of the accent).
 */
@Composable
fun StatusPill(status: String, label: String, modifier: Modifier = Modifier) {
    val accent = statusAccent(status)
    val bg = statusAccentBg(status)
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(50))
            .background(bg)
            .padding(horizontal = 11.dp, vertical = 5.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        androidx.compose.foundation.layout.Box(
            modifier = Modifier
                .size(7.dp)
                .clip(CircleShape)
                .background(accent)
        )
        Text(
            label.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            letterSpacing = 0.06.sp,
            color = accent,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(start = 6.dp),
        )
    }
}
