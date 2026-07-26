package ai.instapark.valet.ui.components

import ai.instapark.valet.ui.theme.ValetTheme
import ai.instapark.valet.util.ImageCompressor
import android.content.pm.PackageManager
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CameraAlt
import androidx.compose.material.icons.outlined.Check
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
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
 *
 * Rendered as a square, dashed-border tile per `Check in popup.png` -- a captured
 * photo swaps the camera icon for a check and the border/label to the success color.
 */
@Composable
fun PhotoCaptureField(
    label: String,
    file: File?,
    onFileChange: (File?) -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val colors = ValetTheme.colors
    val scope = rememberCoroutineScope()
    var pendingUri by remember { mutableStateOf<Uri?>(null) }
    var compressing by remember { mutableStateOf(false) }
    val captured = file != null

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

    val tint = if (captured) colors.success else ai.instapark.valet.ui.theme.PrimaryBlue
    Column(
        modifier = modifier
            .fillMaxWidth()
            .aspectRatio(1f)
            .clip(RoundedCornerShape(14.dp))
            .dashedBorder(if (captured) colors.success else ai.instapark.valet.ui.theme.PhotoDashedBorder)
            .background(colors.tintBlue)
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
            .padding(8.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(
            if (captured) Icons.Outlined.Check else Icons.Outlined.CameraAlt,
            contentDescription = null,
            tint = tint,
            modifier = Modifier.padding(bottom = 6.dp),
        )
        Text(
            text = if (compressing) "…" else label,
            style = MaterialTheme.typography.labelSmall,
            color = colors.inkSecondary,
            textAlign = TextAlign.Center,
        )
    }
}

/** A dashed rounded-rect outline -- shadcn/Compose have no built-in for this. */
private fun Modifier.dashedBorder(color: Color, cornerRadius: Dp = 14.dp): Modifier =
    this.then(
        Modifier.drawWithContent {
            drawContent()
            drawRoundRect(
                color = color,
                cornerRadius = CornerRadius(cornerRadius.toPx(), cornerRadius.toPx()),
                style = Stroke(
                    width = 1.5.dp.toPx(),
                    pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 8f), 0f),
                ),
            )
        }
    )

private fun launchCamera(context: android.content.Context, onReady: (Uri) -> Unit) {
    val dir = File(context.cacheDir, "captured_photos").apply { mkdirs() }
    val file = File(dir, "capture-${System.currentTimeMillis()}.jpg")
    val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
    onReady(uri)
}
