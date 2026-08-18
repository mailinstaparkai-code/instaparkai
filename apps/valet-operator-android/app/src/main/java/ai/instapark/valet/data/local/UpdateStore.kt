package ai.instapark.valet.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.updateDataStore: DataStore<Preferences> by preferencesDataStore(name = "update_prefs")

/**
 * Kept separate from [TokenStore] (rather than a field on it) so a dismissal survives
 * logout/login -- TokenStore.clear() wipes session state on sign-out, and re-nagging
 * the user about a version they already dismissed the same day would be annoying.
 */
class UpdateStore(private val context: Context) {
    private object Keys {
        val DISMISSED_VERSION_CODE = intPreferencesKey("dismissed_version_code")
    }

    val dismissedVersionCode: Flow<Int?> = context.updateDataStore.data.map { it[Keys.DISMISSED_VERSION_CODE] }

    suspend fun dismiss(versionCode: Int) {
        context.updateDataStore.edit { prefs -> prefs[Keys.DISMISSED_VERSION_CODE] = versionCode }
    }
}
