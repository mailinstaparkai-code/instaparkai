package ai.instapark.valet

import ai.instapark.valet.ui.navigation.ValetNavGraph
import ai.instapark.valet.ui.theme.InstaParkValetTheme
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            InstaParkValetTheme {
                ValetNavGraph()
            }
        }
    }
}
