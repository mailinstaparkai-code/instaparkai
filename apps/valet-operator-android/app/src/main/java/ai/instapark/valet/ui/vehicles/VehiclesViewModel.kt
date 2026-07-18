package ai.instapark.valet.ui.vehicles

import ai.instapark.valet.data.remote.ApiException
import ai.instapark.valet.data.remote.dto.VehiclesResponse
import ai.instapark.valet.data.repository.VehiclesRepository
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch

sealed interface VehiclesUiState {
    data object Loading : VehiclesUiState
    data class Success(val response: VehiclesResponse) : VehiclesUiState
    data class Error(val message: String) : VehiclesUiState
}

class VehiclesViewModel(private val repository: VehiclesRepository) : ViewModel() {
    var uiState by mutableStateOf<VehiclesUiState>(VehiclesUiState.Loading)
        private set
    var page by mutableStateOf(1)
        private set
    var statusFilter by mutableStateOf<String?>(null)
        private set

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            uiState = VehiclesUiState.Loading
            repository.list(status = statusFilter, page = page)
                .onSuccess { uiState = VehiclesUiState.Success(it) }
                .onFailure { uiState = VehiclesUiState.Error((it as? ApiException)?.message ?: "Something went wrong.") }
        }
    }

    fun applyStatusFilter(status: String?) {
        if (statusFilter == status) return
        statusFilter = status
        page = 1
        load()
    }

    fun nextPage() {
        page += 1
        load()
    }

    fun prevPage() {
        if (page > 1) {
            page -= 1
            load()
        }
    }
}

class VehiclesViewModelFactory(private val repository: VehiclesRepository) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T = VehiclesViewModel(repository) as T
}
