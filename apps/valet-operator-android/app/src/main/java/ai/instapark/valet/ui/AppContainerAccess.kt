package ai.instapark.valet.ui

import ai.instapark.valet.AppContainer
import ai.instapark.valet.InstaParkValetApp
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

@Composable
fun appContainer(): AppContainer {
    val app = LocalContext.current.applicationContext as InstaParkValetApp
    return app.container
}
