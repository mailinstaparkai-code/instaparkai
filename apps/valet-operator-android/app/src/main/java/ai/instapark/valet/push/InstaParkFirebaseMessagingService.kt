package ai.instapark.valet.push

import ai.instapark.valet.MainActivity
import ai.instapark.valet.R
import ai.instapark.valet.util.Haptics
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

private data class NotificationSpec(val channelId: String, val channelName: String, val defaultTitle: String, val defaultBody: String)

// data.type differentiates payloads sent through the same FCM pipeline -- absent/
// unrecognized falls back to today's vehicle_dispatched behavior, so existing pushes
// (which never set this field) are unaffected.
private val SPECS = mapOf(
    "app_update" to NotificationSpec("app_updates", "App updates", "Update available", "A new version is ready to install"),
)
private val DEFAULT_SPEC = NotificationSpec("vehicle_dispatched", "Vehicle pickups", "Vehicle assigned", "A vehicle is ready for pickup")

class InstaParkFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        val container = (application as ai.instapark.valet.InstaParkValetApp).container
        CoroutineScope(Dispatchers.IO).launch {
            container.pushTokenRepository.register(token)
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        val spec = SPECS[message.data["type"]] ?: DEFAULT_SPEC
        val title = message.notification?.title ?: spec.defaultTitle
        val body = message.notification?.body ?: spec.defaultBody
        showNotification(spec.channelId, spec.channelName, title, body)
        Haptics.notify(applicationContext)
    }

    private fun showNotification(channelId: String, channelName: String, title: String, body: String) {
        val manager = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(channelId, channelName, NotificationManager.IMPORTANCE_HIGH)
            manager.createNotificationChannel(channel)
        }

        // Tapping opens the app -- no deep link into a download flow. Once the
        // app-wide UpdateBanner ships, opening the app already surfaces its own
        // Download button; a second tap-to-download path would just duplicate it.
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()

        NotificationManagerCompat.from(this).notify(System.currentTimeMillis().toInt(), notification)
    }
}
