package ai.instapark.valet.ui.notifications

import ai.instapark.valet.data.remote.dto.NotificationItem
import ai.instapark.valet.ui.appContainer
import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.DropdownMenu
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
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
fun NotificationsBell() {
    val container = appContainer()
    val viewModel: NotificationsViewModel = viewModel(
        factory = NotificationsViewModelFactory(container.notificationsRepository)
    )
    val context = LocalContext.current
    var open by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { viewModel.startPolling() }
    LaunchedEffect(viewModel.vibrateSignal) {
        if (viewModel.vibrateSignal > 0) vibrate(context)
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
                Icon(Icons.Default.Notifications, contentDescription = "Notifications")
            }
        }
        DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
            Column(
                modifier = Modifier
                    .width(320.dp)
                    .heightIn(max = 400.dp)
                    .verticalScroll(rememberScrollState())
                    .padding(8.dp)
            ) {
                if (viewModel.notifications.isEmpty()) {
                    Text(
                        "No notifications yet.",
                        modifier = Modifier.padding(16.dp),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                } else {
                    viewModel.notifications.forEach { item -> NotificationRow(item) }
                }
            }
        }
    }
}

@Composable
private fun NotificationRow(item: NotificationItem) {
    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp, horizontal = 12.dp)) {
        Text(
            item.message,
            fontWeight = if (item.readAt == null) FontWeight.Bold else FontWeight.Normal,
            style = MaterialTheme.typography.bodyMedium,
        )
        Text(
            "${KIND_LABEL[item.kind] ?: item.kind} · ${formatTime(item.createdAt)}",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

private fun formatTime(iso: String): String = try {
    OffsetDateTime.parse(iso).format(DateTimeFormatter.ofPattern("hh:mm a"))
} catch (e: Exception) {
    iso
}

private fun vibrate(context: Context) {
    @Suppress("DEPRECATION")
    val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator ?: return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        vibrator.vibrate(VibrationEffect.createOneShot(200, VibrationEffect.DEFAULT_AMPLITUDE))
    }
}
