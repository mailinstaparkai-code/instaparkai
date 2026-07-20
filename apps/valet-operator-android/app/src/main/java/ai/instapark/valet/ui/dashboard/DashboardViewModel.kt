package ai.instapark.valet.ui.dashboard

import ai.instapark.valet.data.local.TokenStore
import ai.instapark.valet.data.remote.ApiException
import ai.instapark.valet.data.remote.dto.DashboardResponse
import ai.instapark.valet.data.repository.DashboardRepository
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
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
) : ViewModel() {
    var uiState by mutableStateOf<DashboardUiState>(DashboardUiState.Loading)
        private set
    var greetingName by mutableStateOf<String?>(null)
        private set
    var role by mutableStateOf<String?>(null)
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

    init {
        viewModelScope.launch {
            greetingName = tokenStore.fullNameFlow.first() ?: tokenStore.usernameFlow.first()
            role = tokenStore.roleFlow.first()
        }
        load()
    }

    fun load() {
        viewModelScope.launch {
            uiState = DashboardUiState.Loading
            repository.getSummary()
                .onSuccess {
                    uiState = DashboardUiState.Success(it)
                    myStatus = it.myDailyStatus?.status
                }
                .onFailure { uiState = DashboardUiState.Error((it as? ApiException)?.message ?: "Something went wrong.") }
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
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T = DashboardViewModel(repository, tokenStore) as T
}
