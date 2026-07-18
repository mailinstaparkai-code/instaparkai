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

    init {
        viewModelScope.launch {
            greetingName = tokenStore.fullNameFlow.first() ?: tokenStore.usernameFlow.first()
        }
        load()
    }

    fun load() {
        viewModelScope.launch {
            uiState = DashboardUiState.Loading
            repository.getSummary()
                .onSuccess { uiState = DashboardUiState.Success(it) }
                .onFailure { uiState = DashboardUiState.Error((it as? ApiException)?.message ?: "Something went wrong.") }
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
