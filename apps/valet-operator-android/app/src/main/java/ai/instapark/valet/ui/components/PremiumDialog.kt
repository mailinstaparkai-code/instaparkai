package ai.instapark.valet.ui.components

import ai.instapark.valet.ui.theme.ValetTheme
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Close
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

/**
 * design.md §9 "Sheets" -- a bottom-sheet shell (32px top radii, grab handle, icon
 * tile + title + close, scrollable body, 56px footer row). All 7 queue dialogs build
 * on this instead of a centered dialog.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PremiumDialog(
    icon: ImageVector,
    title: String,
    subtitle: String? = null,
    onDismissRequest: () -> Unit,
    accent: Color = ValetTheme.colors.primary,
    footer: @Composable RowScope.() -> Unit,
    content: @Composable ColumnScope.() -> Unit,
) {
    val colors = ValetTheme.colors
    ModalBottomSheet(
        onDismissRequest = onDismissRequest,
        sheetState = rememberModalBottomSheetState(),
        shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
        containerColor = colors.surface,
        dragHandle = {
            Box(
                modifier = Modifier
                    .padding(top = 10.dp, bottom = 4.dp)
                    .size(width = 40.dp, height = 4.dp)
                    .clip(RoundedCornerShape(50))
                    .background(colors.hairlineSoft),
            )
        },
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(20.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                Box(
                    modifier = Modifier
                        .size(46.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(accent.copy(alpha = 0.14f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(icon, contentDescription = null, tint = accent, modifier = Modifier.size(22.dp))
                }
                Column(modifier = Modifier.padding(start = 14.dp).weight(1f)) {
                    Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    if (subtitle != null) {
                        Text(
                            subtitle,
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.inkSecondary,
                            modifier = Modifier.padding(top = 2.dp),
                        )
                    }
                }
                IconButton(onClick = onDismissRequest, modifier = Modifier.size(34.dp)) {
                    Box(
                        modifier = Modifier
                            .size(34.dp)
                            .clip(CircleShape)
                            .background(colors.tintBlue),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(Icons.Outlined.Close, contentDescription = "Close", tint = colors.inkSecondary, modifier = Modifier.size(16.dp))
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

/** design.md §9 "secondary" button -- white with a hairline border and inkBody label. */
@Composable
fun DialogSecondaryButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val colors = ValetTheme.colors
    OutlinedButton(
        onClick = onClick,
        shape = RoundedCornerShape(14.dp),
        border = androidx.compose.foundation.BorderStroke(1.5.dp, colors.fieldBorder),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = colors.inkSecondary),
        modifier = modifier,
    ) { Text(text, fontWeight = FontWeight.SemiBold) }
}

/** design.md §9 "primary"/"accent" dialog button -- filled, defaults to the orange commit CTA. */
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
        colors = ButtonDefaults.buttonColors(containerColor = containerColor ?: colors.accent, contentColor = Color.White),
        modifier = modifier,
    ) {
        if (icon != null) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(18.dp))
        }
        Text(text, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(start = if (icon != null) 6.dp else 0.dp))
    }
}
