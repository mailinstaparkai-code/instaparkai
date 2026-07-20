package ai.instapark.valet.util

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator

/** Short, distinct vibration patterns shared across the app's haptic touchpoints. */
object Haptics {
    /** A quick confirmation tick -- status toggle, any "this just succeeded" moment. */
    fun tick(context: Context) = vibrate(context, 40)

    /** The longer buzz used for an incoming notification (unchanged from NotificationsBell). */
    fun notify(context: Context) = vibrate(context, 200)

    private fun vibrate(context: Context, durationMs: Long) {
        @Suppress("DEPRECATION")
        val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator ?: return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createOneShot(durationMs, VibrationEffect.DEFAULT_AMPLITUDE))
        }
    }
}
