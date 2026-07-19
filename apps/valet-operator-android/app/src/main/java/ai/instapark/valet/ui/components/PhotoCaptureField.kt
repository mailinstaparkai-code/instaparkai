package ai.instapark.valet.ui.components

import ai.instapark.valet.util.ImageCompressor
import android.content.pm.PackageManager
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

/**
 * Native-camera capture + client-side compression before upload, mirroring
 * apps/super-admin/.../components/photo-input.tsx (capture="environment" + compressImageFile).
 * Launches the device's stock camera app rather than embedding a CameraX preview --
 * simpler and more reliable across the emulator/device fleet for a first cut.
 */
@Composable
fun PhotoCaptureField(
    label: String,
    file: File?,
    onFileChange: (File?) -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var pendingUri by remember { mutableStateOf<Uri?>(null) }
    var compressing by remember { mutableStateOf(false) }

    val cameraLauncher = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { success ->
        val uri = pendingUri
        if (success && uri != null) {
            compressing = true
            scope.launch {
                val outFile = File(context.cacheDir, "upload-${System.currentTimeMillis()}.jpg")
                val compressed = withContext(Dispatchers.IO) {
                    ImageCompressor.compress(context, uri, outFile)
                }
                compressing = false
                onFileChange(compressed)
            }
        }
    }

    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) launchCamera(context) { uri -> pendingUri = uri; cameraLauncher.launch(uri) }
    }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(40.dp)
            .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(8.dp))
            .clickable {
                val hasPermission = ContextCompat.checkSelfPermission(
                    context,
                    android.Manifest.permission.CAMERA
                ) == PackageManager.PERMISSION_GRANTED
                if (hasPermission) {
                    launchCamera(context) { uri -> pendingUri = uri; cameraLauncher.launch(uri) }
                } else {
                    permissionLauncher.launch(android.Manifest.permission.CAMERA)
                }
            }
            .padding(horizontal = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            Icons.Default.CameraAlt,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.height(18.dp),
        )
        Text(
            text = when {
                compressing -> "Compressing…"
                file != null -> "$label captured"
                else -> label
            },
            modifier = Modifier.padding(start = 8.dp),
            style = MaterialTheme.typography.bodySmall,
            color = if (file != null) StatusSuccessColor else MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

private val StatusSuccessColor = Color(0xFF22C55E)

private fun launchCamera(context: android.content.Context, onReady: (Uri) -> Unit) {
    val dir = File(context.cacheDir, "captured_photos").apply { mkdirs() }
    val file = File(dir, "capture-${System.currentTimeMillis()}.jpg")
    val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
    onReady(uri)
}
