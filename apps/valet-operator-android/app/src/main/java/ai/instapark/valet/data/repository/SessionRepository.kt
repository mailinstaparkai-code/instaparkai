package ai.instapark.valet.data.repository

import ai.instapark.valet.data.local.TokenStore
import ai.instapark.valet.data.remote.ParkingAdminApi
import ai.instapark.valet.data.remote.SessionTokenHolder
import ai.instapark.valet.data.remote.dto.AccessibleSite
import ai.instapark.valet.data.remote.dto.LoginRequest
import ai.instapark.valet.data.remote.dto.SwitchSiteRequest
import ai.instapark.valet.data.remote.toApiException
import com.google.gson.Gson

data class Session(
    val username: String,
    val role: String,
    val assignedSiteId: String,
    val fullName: String?,
    val currentSiteId: String = assignedSiteId,
    val accessibleSites: List<AccessibleSite> = emptyList(),
)

class SessionRepository(
    private val api: ParkingAdminApi,
    private val tokenStore: TokenStore,
    private val tokenHolder: SessionTokenHolder,
    private val gson: Gson,
) {
    /** Loads a persisted token (if any) and validates it against the API. Call once at app start. */
    suspend fun restoreSession(): Session? {
        val token = tokenStore.currentToken() ?: return null
        tokenHolder.token = token
        return try {
            val me = api.me()
            val currentSiteId = me.currentSiteId ?: me.assignedSiteId
            tokenStore.setCurrentSiteId(currentSiteId)
            Session(me.username, me.role, me.assignedSiteId, me.fullName, currentSiteId, me.accessibleSites)
        } catch (t: Throwable) {
            tokenHolder.token = null
            tokenStore.clear()
            null
        }
    }

    // On-demand refresh (not the cold-start restoreSession path) -- used by the
    // site switcher to get the current accessibleSites/siteName list.
    suspend fun fetchSession(): Result<Session> = try {
        val me = api.me()
        val currentSiteId = me.currentSiteId ?: me.assignedSiteId
        tokenStore.setCurrentSiteId(currentSiteId)
        Result.success(Session(me.username, me.role, me.assignedSiteId, me.fullName, currentSiteId, me.accessibleSites))
    } catch (t: Throwable) {
        Result.failure(t.toApiException(gson))
    }

    suspend fun login(username: String, password: String): Result<Session> = try {
        val response = api.login(LoginRequest(username, password))
        tokenHolder.token = response.token
        tokenStore.saveSession(
            token = response.token,
            role = response.account.role,
            assignedSiteId = response.account.assignedSiteId,
            fullName = response.account.fullName,
            username = response.account.username,
        )
        Result.success(
            Session(
                username = response.account.username,
                role = response.account.role,
                assignedSiteId = response.account.assignedSiteId,
                fullName = response.account.fullName,
                currentSiteId = response.account.assignedSiteId,
            )
        )
    } catch (t: Throwable) {
        Result.failure(t.toApiException(gson))
    }

    // parking_admin-only (valet_operator stays pinned to its single site --
    // the site switcher UI is never shown for that role). Persists the new
    // selection to TokenStore so it survives a cold start before the next
    // me() round trip lands.
    suspend fun switchSite(siteId: String): Result<Unit> = try {
        api.switchSite(SwitchSiteRequest(siteId))
        tokenStore.setCurrentSiteId(siteId)
        Result.success(Unit)
    } catch (t: Throwable) {
        Result.failure(t.toApiException(gson))
    }

    suspend fun logout() {
        try {
            api.logout()
        } catch (_: Throwable) {
            // Best-effort -- clear local state regardless of whether the server call succeeded.
        }
        tokenHolder.token = null
        tokenStore.clear()
    }
}
