package ai.instapark.valet

import ai.instapark.valet.ui.appContainer
import ai.instapark.valet.ui.navigation.ValetNavGraph
import ai.instapark.valet.ui.theme.InstaParkValetTheme
import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.collectAsState
import androidx.core.content.ContextCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val container = appContainer()
            val darkTheme by container.themeStore.darkThemeFlow.collectAsState(initial = true)

            // Runtime notification permission (required API 33+) so FCM push notifications
            // for vehicle_dispatched actually show up in the system tray.
            val notificationPermissionLauncher =
                rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {}
            LaunchedEffect(Unit) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                    ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.POST_NOTIFICATIONS) !=
                    PackageManager.PERMISSION_GRANTED
                ) {
                    notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                }
            }

            InstaParkValetTheme(darkTheme = darkTheme) {
                ValetNavGraph()
            }
        }
    }
}
