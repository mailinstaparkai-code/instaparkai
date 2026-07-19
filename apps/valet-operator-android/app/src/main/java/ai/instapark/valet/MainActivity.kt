package ai.instapark.valet

import ai.instapark.valet.ui.appContainer
import ai.instapark.valet.ui.navigation.ValetNavGraph
import ai.instapark.valet.ui.theme.InstaParkValetTheme
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.compose.runtime.collectAsState
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val container = appContainer()
            val darkTheme by container.themeStore.darkThemeFlow.collectAsState(initial = true)
            InstaParkValetTheme(darkTheme = darkTheme) {
                ValetNavGraph()
            }
        }
    }
}
