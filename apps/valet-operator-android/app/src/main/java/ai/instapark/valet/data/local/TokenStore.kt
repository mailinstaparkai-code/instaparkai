package ai.instapark.valet.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "valet_session")

/**
 * Persists the session across app restarts. The token itself is also mirrored into
 * [ai.instapark.valet.data.remote.SessionTokenHolder] for synchronous access from
 * the OkHttp interceptor -- this store is the durable copy, that one is the fast copy.
 */
class TokenStore(private val context: Context) {
    private object Keys {
        val TOKEN = stringPreferencesKey("token")
        val ROLE = stringPreferencesKey("role")
        val ASSIGNED_SITE_ID = stringPreferencesKey("assigned_site_id")
        val CURRENT_SITE_ID = stringPreferencesKey("current_site_id")
        val FULL_NAME = stringPreferencesKey("full_name")
        val USERNAME = stringPreferencesKey("username")
    }

    val roleFlow: Flow<String?> = context.dataStore.data.map { it[Keys.ROLE] }
    val fullNameFlow: Flow<String?> = context.dataStore.data.map { it[Keys.FULL_NAME] }
    val usernameFlow: Flow<String?> = context.dataStore.data.map { it[Keys.USERNAME] }
    val currentSiteIdFlow: Flow<String?> = context.dataStore.data.map { it[Keys.CURRENT_SITE_ID] }

    suspend fun currentToken(): String? = context.dataStore.data.first()[Keys.TOKEN]

    suspend fun saveSession(
        token: String,
        role: String,
        assignedSiteId: String,
        fullName: String?,
        username: String,
        currentSiteId: String? = null,
    ) {
        context.dataStore.edit { prefs ->
            prefs[Keys.TOKEN] = token
            prefs[Keys.ROLE] = role
            prefs[Keys.ASSIGNED_SITE_ID] = assignedSiteId
            prefs[Keys.USERNAME] = username
            if (fullName != null) prefs[Keys.FULL_NAME] = fullName else prefs.remove(Keys.FULL_NAME)
            val resolvedCurrentSite = currentSiteId ?: assignedSiteId
            prefs[Keys.CURRENT_SITE_ID] = resolvedCurrentSite
        }
    }

    suspend fun setCurrentSiteId(siteId: String) {
        context.dataStore.edit { prefs -> prefs[Keys.CURRENT_SITE_ID] = siteId }
    }

    suspend fun clear() {
        context.dataStore.edit { it.clear() }
    }
}
