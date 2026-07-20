package ai.instapark.valet.ui.components

import ai.instapark.valet.ui.theme.ValetTheme
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.MutableTransitionState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties

/**
 * The chrome from `Check in popup.png`: icon-badge header (icon + title + subtitle
 * + close X), a scrollable content slot, and an outlined-secondary / glow-primary
 * footer row. All 7 queue dialogs build on this instead of a plain AlertDialog.
 */
@Composable
fun PremiumDialog(
    icon: ImageVector,
    title: String,
    subtitle: String? = null,
    onDismissRequest: () -> Unit,
    accent: Color = ValetTheme.colors.purple,
    footer: @Composable RowScope.() -> Unit,
    content: @Composable ColumnScope.() -> Unit,
) {
    Dialog(
        onDismissRequest = onDismissRequest,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        val colors = ValetTheme.colors
        val visibleState = remember { MutableTransitionState(false) }
        LaunchedEffect(Unit) { visibleState.targetState = true }

        Box(
            modifier = Modifier.fillMaxSize().padding(20.dp),
            contentAlignment = Alignment.Center,
        ) {
            AnimatedVisibility(
                visibleState = visibleState,
                enter = fadeIn(tween(200)) + scaleIn(tween(220), initialScale = 0.92f),
                exit = fadeOut(tween(150)) + scaleOut(tween(150), targetScale = 0.94f),
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(24.dp))
                        .background(colors.cardBackground)
                        .border(1.dp, colors.cardBorder, RoundedCornerShape(24.dp))
                        .padding(20.dp),
                ) {
                    Row(verticalAlignment = Alignment.Top) {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(CircleShape)
                                .background(accent.copy(alpha = 0.20f)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(icon, contentDescription = null, tint = accent, modifier = Modifier.size(24.dp))
                        }
                        Column(modifier = Modifier.padding(start = 14.dp).weight(1f)) {
                            Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                            if (subtitle != null) {
                                Text(
                                    subtitle,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = colors.textSecondary,
                                    modifier = Modifier.padding(top = 2.dp),
                                )
                            }
                        }
                        IconButton(onClick = onDismissRequest, modifier = Modifier.size(36.dp)) {
                            Box(
                                modifier = Modifier
                                    .size(32.dp)
                                    .clip(CircleShape)
                                    .background(colors.backgroundDeep),
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(Icons.Default.Close, contentDescription = "Close", modifier = Modifier.size(16.dp))
                            }
                        }
                    }
                    Column(
                        modifier = Modifier
                            .padding(top = 16.dp)
                            .heightIn(max = 440.dp)
                            .verticalScroll(rememberScrollState()),
                        content = content,
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(top = 18.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        content = footer,
                    )
                }
            }
        }
    }
}

/** Outlined secondary dialog button (Cancel), matching the reference's purple outline. */
@Composable
fun DialogSecondaryButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val colors = ValetTheme.colors
    OutlinedButton(
        onClick = onClick,
        shape = RoundedCornerShape(14.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, colors.purple),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = colors.purple),
        modifier = modifier,
    ) { Text(text, fontWeight = FontWeight.SemiBold) }
}

/** Glowing primary dialog button, matching the reference's orange "Check in" CTA. */
@Composable
fun DialogPrimaryButton(
    text: String,
    onClick: () -> Unit,
    enabled: Boolean = true,
    icon: ImageVector? = null,
    containerColor: Color? = null,
    modifier: Modifier = Modifier,
) {
    val colors = ValetTheme.colors
    androidx.compose.material3.Button(
        onClick = onClick,
        enabled = enabled,
        shape = RoundedCornerShape(14.dp),
        colors = ButtonDefaults.buttonColors(containerColor = containerColor ?: colors.orange, contentColor = Color.White),
        modifier = modifier,
    ) {
        if (icon != null) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(18.dp))
        }
        Text(text, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(start = if (icon != null) 6.dp else 0.dp))
    }
}
