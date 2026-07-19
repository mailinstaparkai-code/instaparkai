package ai.instapark.valet.ui.components

import ai.instapark.valet.ui.theme.ValetTheme
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

/** The moon/sun theme switch pill from the Vehicles reference (top-right). */
@Composable
fun ThemeTogglePill(
    darkTheme: Boolean,
    onToggle: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = ValetTheme.colors
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(50))
            .background(colors.cardBackground),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        listOf(true to Icons.Filled.DarkMode, false to Icons.Filled.LightMode).forEach { (dark, icon) ->
            val active = darkTheme == dark
            val bg by animateColorAsState(
                targetValue = if (active) colors.purple.copy(alpha = 0.35f) else Color.Transparent,
                animationSpec = tween(250),
                label = "themePill",
            )
            Box(
                modifier = Modifier
                    .padding(4.dp)
                    .clip(RoundedCornerShape(50))
                    .background(bg)
                    .clickable(enabled = !active) { onToggle(dark) }
                    .padding(horizontal = 14.dp, vertical = 8.dp),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    icon,
                    contentDescription = if (dark) "Dark theme" else "Light theme",
                    tint = if (active) colors.textSecondary.copy(alpha = 1f) else colors.textSecondary.copy(alpha = 0.5f),
                    modifier = Modifier.size(18.dp),
                )
            }
        }
    }
}
