package ai.instapark.valet.ui.reports

import ai.instapark.valet.data.remote.ApiException
import ai.instapark.valet.data.remote.dto.VehicleTransactionsResponse
import ai.instapark.valet.data.repository.ReportsRepository
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch

sealed interface ReportsUiState {
    data object Loading : ReportsUiState
    data class Success(val response: VehicleTransactionsResponse) : ReportsUiState
    data class Error(val message: String) : ReportsUiState
}

class ReportsViewModel(private val repository: ReportsRepository) : ViewModel() {
    var uiState by mutableStateOf<ReportsUiState>(ReportsUiState.Loading)
        private set
    var page by mutableStateOf(1)
        private set

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            uiState = ReportsUiState.Loading
            repository.vehicleTransactions(page = page)
                .onSuccess { uiState = ReportsUiState.Success(it) }
                .onFailure { uiState = ReportsUiState.Error((it as? ApiException)?.message ?: "Something went wrong.") }
        }
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

class ReportsViewModelFactory(private val repository: ReportsRepository) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T = ReportsViewModel(repository) as T
}
