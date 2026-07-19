package ai.instapark.valet.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.themeDataStore: DataStore<Preferences> by preferencesDataStore(name = "valet_prefs")

/**
 * In-app light/dark preference (the moon/sun pill from the revamp references).
 * Dark is the brand's primary look and the default; the choice survives restarts
 * and is deliberately independent of the system setting.
 */
class ThemeStore(private val context: Context) {
    private object Keys {
        val DARK = stringPreferencesKey("dark_theme")
    }

    val darkThemeFlow: Flow<Boolean> =
        context.themeDataStore.data.map { it[Keys.DARK]?.toBoolean() ?: true }

    suspend fun setDarkTheme(dark: Boolean) {
        context.themeDataStore.edit { it[Keys.DARK] = dark.toString() }
    }
}
