package ai.instapark.valet.ui.update

import ai.instapark.valet.BuildConfig
import ai.instapark.valet.R
import ai.instapark.valet.data.local.UpdateStore
import ai.instapark.valet.data.remote.dto.AppVersionResponse
import ai.instapark.valet.data.repository.UpdateRepository
import ai.instapark.valet.ui.components.GlassCard
import ai.instapark.valet.ui.theme.ValetTheme
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Download
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import android.content.Intent
import android.net.Uri
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

private const val CHECK_INTERVAL_MS = 15 * 60_000L // coarser than NotificationsBell's
// 20s -- a version check doesn't need near-real-time cadence, and still checks
// immediately on every foreground-resume via repeatOnLifecycle(STARTED).

/**
 * Lifted out of DashboardViewModel (which only checked once, Dashboard-only) so the
 * check is periodic and the banner can render app-wide, mirroring how
 * NotificationsViewModel/NotificationsBell are Activity-scoped and single-instance
 * across every tab.
 */
class UpdateViewModel(
    private val updateRepository: UpdateRepository,
    private val updateStore: UpdateStore,
) : ViewModel() {
    var updateAvailable by mutableStateOf<AppVersionResponse?>(null)
        private set

    suspend fun pollWhileActive() {
        while (true) {
            checkForUpdate()
            delay(CHECK_INTERVAL_MS)
        }
    }

    private suspend fun checkForUpdate() {
        val latest = updateRepository.checkForUpdate().getOrNull()
        val latestVersionCode = latest?.latestVersionCode
        if (latest == null || latestVersionCode == null || latestVersionCode <= BuildConfig.VERSION_CODE) {
            updateAvailable = null
            return
        }
        val dismissed = updateStore.dismissedVersionCode.first()
        updateAvailable = if (latestVersionCode == dismissed) null else latest
    }

    fun dismissUpdate() {
        val versionCode = updateAvailable?.latestVersionCode ?: return
        updateAvailable = null
        viewModelScope.launch { updateStore.dismiss(versionCode) }
    }
}

class UpdateViewModelFactory(
    private val updateRepository: UpdateRepository,
    private val updateStore: UpdateStore,
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T =
        UpdateViewModel(updateRepository, updateStore) as T
}

/** Soft, dismissible nudge -- this app has no Play Store distribution to push updates
 * through, so this is the only way an existing install learns a newer build exists. */
@Composable
fun UpdateBanner(update: AppVersionResponse, onDismiss: () -> Unit) {
    val colors = ValetTheme.colors
    val context = LocalContext.current

    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(colors.tintBlue),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Outlined.Download, contentDescription = null, tint = colors.primary, modifier = Modifier.size(20.dp))
            }
            Column(modifier = Modifier.padding(start = 12.dp).weight(1f)) {
                Text(
                    "Update available",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    "Version ${update.latestVersionName} is ready to install",
                    style = MaterialTheme.typography.labelSmall,
                    color = colors.inkSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Row(
                modifier = Modifier
                    .padding(start = 8.dp)
                    .clip(RoundedCornerShape(50))
                    .background(colors.primary)
                    .clickable {
                        val apkUrl = update.apkUrl ?: return@clickable
                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(apkUrl)))
                    }
                    .padding(horizontal = 14.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Download", color = Color.White, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
            }
            IconButton(onClick = onDismiss, modifier = Modifier.size(32.dp)) {
                Icon(Icons.Outlined.Close, contentDescription = "Dismiss", tint = colors.inkTertiary, modifier = Modifier.size(16.dp))
            }
        }
    }
}
