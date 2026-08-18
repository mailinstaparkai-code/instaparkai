package ai.instapark.valet.ui.dashboard

import ai.instapark.valet.BuildConfig
import ai.instapark.valet.data.local.TokenStore
import ai.instapark.valet.data.local.UpdateStore
import ai.instapark.valet.data.remote.ApiException
import ai.instapark.valet.data.remote.dto.AppVersionResponse
import ai.instapark.valet.data.remote.dto.DashboardResponse
import ai.instapark.valet.data.remote.dto.QueueTicket
import ai.instapark.valet.data.repository.DashboardRepository
import ai.instapark.valet.data.repository.QueueRepository
import ai.instapark.valet.data.repository.UpdateRepository
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

sealed interface DashboardUiState {
    data object Loading : DashboardUiState
    data class Success(val summary: DashboardResponse) : DashboardUiState
    data class Error(val message: String) : DashboardUiState
}

class DashboardViewModel(
    private val repository: DashboardRepository,
    private val tokenStore: TokenStore,
    private val queueRepository: QueueRepository,
    private val updateRepository: UpdateRepository,
    private val updateStore: UpdateStore,
) : ViewModel() {
    var uiState by mutableStateOf<DashboardUiState>(DashboardUiState.Loading)
        private set
    var greetingName by mutableStateOf<String?>(null)
        private set
    var role by mutableStateOf<String?>(null)
        private set
    // "Next up" card on Home -- the first not-yet-completed ticket from the same
    // /queue endpoint QueueScreen already uses. Best-effort: a failure here doesn't
    // block the dashboard summary from showing.
    var nextTicket by mutableStateOf<QueueTicket?>(null)
        private set

    // My Status card state (operators only). Seeded from the dashboard response,
    // then owned client-side across toggles.
    var myStatus by mutableStateOf<String?>(null)
        private set
    var statusPending by mutableStateOf(false)
        private set
    var statusError by mutableStateOf<String?>(null)
        private set
    // One-shot signal the Composable observes to fire a haptic tick -- only on a
    // successful change, not on tap, so a rejected/leave-blocked attempt stays silent.
    var statusHapticSignal by mutableStateOf(0)
        private set

    // Non-null only when a newer build than this install exists AND the user hasn't
    // already dismissed that exact version -- a soft, dismissible nudge (this app has
    // no Play Store distribution to force updates through).
    var updateAvailable by mutableStateOf<AppVersionResponse?>(null)
        private set

    init {
        viewModelScope.launch {
            greetingName = tokenStore.fullNameFlow.first() ?: tokenStore.usernameFlow.first()
            role = tokenStore.roleFlow.first()
        }
        load()
        checkForUpdate()
    }

    private fun checkForUpdate() {
        viewModelScope.launch {
            val latest = updateRepository.checkForUpdate().getOrNull() ?: return@launch
            val latestVersionCode = latest.latestVersionCode ?: return@launch
            if (latestVersionCode <= BuildConfig.VERSION_CODE) return@launch
            val dismissed = updateStore.dismissedVersionCode.first()
            if (latestVersionCode == dismissed) return@launch
            updateAvailable = latest
        }
    }

    fun dismissUpdate() {
        val versionCode = updateAvailable?.latestVersionCode ?: return
        updateAvailable = null
        viewModelScope.launch { updateStore.dismiss(versionCode) }
    }

    fun load() {
        viewModelScope.launch {
            uiState = DashboardUiState.Loading
            // Fired concurrently (both start immediately on the async call) to keep
            // this to one round-trip's worth of wall-clock time, not two sequential.
            val summaryDeferred = async { repository.getSummary() }
            val queueDeferred = async { queueRepository.list() }

            summaryDeferred.await()
                .onSuccess {
                    uiState = DashboardUiState.Success(it)
                    myStatus = it.myDailyStatus?.status
                }
                .onFailure { uiState = DashboardUiState.Error((it as? ApiException)?.message ?: "Something went wrong.") }

            queueDeferred.await()
                .onSuccess { response ->
                    nextTicket = response.tickets.firstOrNull { it.status !in setOf("completed", "voided") }
                }
        }
    }

    fun setStatus(status: String) {
        if (statusPending || myStatus == status) return
        viewModelScope.launch {
            statusPending = true
            statusError = null
            repository.setMyStatus(status)
                .onSuccess {
                    myStatus = it.status
                    statusHapticSignal += 1
                }
                .onFailure { statusError = (it as? ApiException)?.message ?: "Couldn't update status." }
            statusPending = false
        }
    }
}

class DashboardViewModelFactory(
    private val repository: DashboardRepository,
    private val tokenStore: TokenStore,
    private val queueRepository: QueueRepository,
    private val updateRepository: UpdateRepository,
    private val updateStore: UpdateStore,
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T =
        DashboardViewModel(repository, tokenStore, queueRepository, updateRepository, updateStore) as T
}
