package ai.instapark.valet.ui.notifications

import ai.instapark.valet.data.remote.dto.NotificationItem
import ai.instapark.valet.ui.appContainer
import ai.instapark.valet.ui.theme.ValetTheme
import ai.instapark.valet.util.Haptics
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.LocalParking
import androidx.compose.material.icons.outlined.NotificationsNone
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Timer
import androidx.compose.material.icons.outlined.VpnKey
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.DpOffset
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.repeatOnLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter

private val KIND_LABEL = mapOf(
    "vehicle_checked_in" to "Checked in",
    "vehicle_parked" to "Parked",
    "vehicle_requested" to "Pickup requested",
    "vehicle_dispatched" to "Dispatched",
    "vehicle_arrived" to "Arrived",
    "handover_complete" to "Handover complete",
    "vehicle_voided" to "Voided",
)

@Composable
private fun kindIcon(kind: String): Pair<ImageVector, Color> {
    val colors = ValetTheme.colors
    return when (kind) {
        "vehicle_checked_in" -> Icons.Outlined.Check to colors.success
        "vehicle_parked" -> Icons.Outlined.LocalParking to colors.primary
        "vehicle_requested" -> Icons.Outlined.Timer to colors.warning
        "vehicle_dispatched" -> Icons.AutoMirrored.Outlined.ArrowForward to colors.primary
        "vehicle_arrived" -> Icons.Outlined.CheckCircle to colors.success
        "handover_complete" -> Icons.Outlined.VpnKey to colors.success
        "vehicle_voided" -> Icons.Outlined.Close to colors.danger
        else -> Icons.Outlined.Notifications to colors.inkSecondary
    }
}

@Composable
fun NotificationsBell() {
    val container = appContainer()
    val viewModel: NotificationsViewModel = viewModel(
        factory = NotificationsViewModelFactory(container.notificationsRepository)
    )
    val colors = ValetTheme.colors
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    var open by remember { mutableStateOf(false) }

    LaunchedEffect(viewModel, lifecycleOwner) {
        lifecycleOwner.lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) {
            viewModel.pollWhileActive()
        }
    }
    LaunchedEffect(viewModel.vibrateSignal) {
        if (viewModel.vibrateSignal > 0) Haptics.notify(context)
    }

    Box {
        IconButton(onClick = {
            open = true
            viewModel.onBellOpened()
        }) {
            BadgedBox(badge = {
                if (viewModel.unreadCount > 0) {
                    Badge { Text(if (viewModel.unreadCount > 9) "9+" else viewModel.unreadCount.toString()) }
                }
            }) {
                Icon(Icons.Outlined.Notifications, contentDescription = "Notifications")
            }
        }
        DropdownMenu(
            expanded = open,
            onDismissRequest = { open = false },
            offset = DpOffset(x = (-8).dp, y = 4.dp),
            shape = RoundedCornerShape(20.dp),
            containerColor = colors.surface,
            shadowElevation = 12.dp,
        ) {
            Column(modifier = Modifier.width(320.dp)) {
                Text(
                    "Notifications",
                    fontWeight = FontWeight.SemiBold,
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                )
                HorizontalDivider(color = colors.hairlineSoft)
                Column(
                    modifier = Modifier
                        .heightIn(max = 380.dp)
                        .verticalScroll(rememberScrollState()),
                ) {
                    if (viewModel.notifications.isEmpty()) {
                        Column(
                            modifier = Modifier.fillMaxWidth().padding(32.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Icon(
                                Icons.Outlined.NotificationsNone,
                                contentDescription = null,
                                tint = colors.inkTertiary,
                                modifier = Modifier.size(28.dp),
                            )
                            Text(
                                "No notifications yet.",
                                modifier = Modifier.padding(top = 8.dp),
                                color = colors.inkSecondary,
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                    } else {
                        viewModel.notifications.forEachIndexed { index, item ->
                            NotificationRow(item)
                            if (index != viewModel.notifications.lastIndex) {
                                HorizontalDivider(color = colors.hairlineSoft)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun NotificationRow(item: NotificationItem) {
    val colors = ValetTheme.colors
    val (icon, accent) = kindIcon(item.kind)
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp, horizontal = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Box(
            modifier = Modifier
                .size(32.dp)
                .clip(CircleShape)
                .background(accent.copy(alpha = 0.14f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = accent, modifier = Modifier.size(16.dp))
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(
                item.message,
                fontWeight = if (item.readAt == null) FontWeight.SemiBold else FontWeight.Normal,
                style = MaterialTheme.typography.bodyMedium,
                color = colors.ink,
            )
            Text(
                "${KIND_LABEL[item.kind] ?: item.kind} · ${formatTime(item.createdAt)}",
                style = MaterialTheme.typography.bodySmall,
                color = colors.inkSecondary,
                modifier = Modifier.padding(top = 2.dp),
            )
        }
    }
}

private fun formatTime(iso: String): String = try {
    OffsetDateTime.parse(iso).format(DateTimeFormatter.ofPattern("hh:mm a"))
} catch (e: Exception) {
    iso
}
