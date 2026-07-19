package ai.instapark.valet.util

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import androidx.exifinterface.media.ExifInterface
import java.io.File
import java.io.FileOutputStream
import kotlin.math.min

/**
 * Downscales + re-encodes a captured photo before upload, mirroring
 * apps/super-admin/src/lib/image-compress.ts (maxDimension=1280, JPEG quality 0.7)
 * so a full-resolution camera photo doesn't blow past the API's request-body limit.
 */
object ImageCompressor {
    private const val MAX_DIMENSION = 1280
    private const val QUALITY = 70

    fun compress(context: Context, sourceUri: Uri, outFile: File): File? {
        val resolver = context.contentResolver

        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        resolver.openInputStream(sourceUri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
        val (srcWidth, srcHeight) = bounds.outWidth to bounds.outHeight
        if (srcWidth <= 0 || srcHeight <= 0) return null

        val sampleSize = calculateInSampleSize(srcWidth, srcHeight, MAX_DIMENSION)
        val decodeOptions = BitmapFactory.Options().apply { inSampleSize = sampleSize }
        val decoded = resolver.openInputStream(sourceUri)?.use {
            BitmapFactory.decodeStream(it, null, decodeOptions)
        } ?: return null

        val rotated = applyExifRotation(context, sourceUri, decoded)

        val scale = min(1f, MAX_DIMENSION.toFloat() / maxOf(rotated.width, rotated.height))
        val targetWidth = (rotated.width * scale).toInt().coerceAtLeast(1)
        val targetHeight = (rotated.height * scale).toInt().coerceAtLeast(1)
        val scaled = if (scale < 1f) {
            Bitmap.createScaledBitmap(rotated, targetWidth, targetHeight, true)
        } else {
            rotated
        }

        FileOutputStream(outFile).use { out ->
            scaled.compress(Bitmap.CompressFormat.JPEG, QUALITY, out)
        }
        if (scaled !== decoded) scaled.recycle()
        decoded.recycle()

        return outFile
    }

    private fun calculateInSampleSize(width: Int, height: Int, maxDimension: Int): Int {
        var sampleSize = 1
        while (width / (sampleSize * 2) >= maxDimension && height / (sampleSize * 2) >= maxDimension) {
            sampleSize *= 2
        }
        return sampleSize
    }

    private fun applyExifRotation(context: Context, uri: Uri, bitmap: Bitmap): Bitmap {
        val orientation = context.contentResolver.openInputStream(uri)?.use {
            ExifInterface(it).getAttributeInt(
                ExifInterface.TAG_ORIENTATION,
                ExifInterface.ORIENTATION_NORMAL
            )
        } ?: ExifInterface.ORIENTATION_NORMAL

        val degrees = when (orientation) {
            ExifInterface.ORIENTATION_ROTATE_90 -> 90f
            ExifInterface.ORIENTATION_ROTATE_180 -> 180f
            ExifInterface.ORIENTATION_ROTATE_270 -> 270f
            else -> 0f
        }
        if (degrees == 0f) return bitmap

        val matrix = Matrix().apply { postRotate(degrees) }
        val rotated = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
        if (rotated !== bitmap) bitmap.recycle()
        return rotated
    }
}
