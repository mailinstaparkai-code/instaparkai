package ai.instapark.valet.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.searchDataStore: DataStore<Preferences> by preferencesDataStore(name = "valet_search_prefs")

data class RecentSearchEntry(val query: String, val kind: String)

/**
 * HANDOFF 28-Jul §10, screens 5c/6c -- recent-searches history for the new global
 * search feature. Client-local persistence only (no new backend table): keeps this a
 * genuinely working feature without adding new server-side surface area.
 */
class SearchStore(private val context: Context, private val gson: Gson = Gson()) {
    private object Keys {
        val RECENTS = stringPreferencesKey("recent_searches")
    }
    private val listType = object : TypeToken<List<RecentSearchEntry>>() {}.type

    private fun parse(json: String?): List<RecentSearchEntry> =
        json?.let { runCatching { gson.fromJson<List<RecentSearchEntry>>(it, listType) }.getOrNull() } ?: emptyList()

    val recentSearchesFlow: Flow<List<RecentSearchEntry>> =
        context.searchDataStore.data.map { parse(it[Keys.RECENTS]) }

    suspend fun addRecent(query: String, kind: String) {
        if (query.isBlank()) return
        context.searchDataStore.edit { prefs ->
            val updated = (listOf(RecentSearchEntry(query, kind)) +
                parse(prefs[Keys.RECENTS]).filterNot { it.query.equals(query, ignoreCase = true) }).take(8)
            prefs[Keys.RECENTS] = gson.toJson(updated)
        }
    }

    suspend fun clear() {
        context.searchDataStore.edit { it.remove(Keys.RECENTS) }
    }
}
