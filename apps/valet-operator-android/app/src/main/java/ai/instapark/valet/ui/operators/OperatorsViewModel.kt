package ai.instapark.valet.ui.operators

import ai.instapark.valet.data.remote.ApiException
import ai.instapark.valet.data.remote.dto.OperatorItem
import ai.instapark.valet.data.repository.OperatorFormInput
import ai.instapark.valet.data.repository.OperatorsRepository
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch

sealed interface OperatorsUiState {
    data object Loading : OperatorsUiState
    data class Success(val operators: List<OperatorItem>) : OperatorsUiState
    data class Error(val message: String) : OperatorsUiState
}

class OperatorsViewModel(private val repository: OperatorsRepository) : ViewModel() {
    var uiState by mutableStateOf<OperatorsUiState>(OperatorsUiState.Loading)
        private set
    var createDialogOpen by mutableStateOf(false)
        private set
    var actionPending by mutableStateOf(false)
        private set
    var actionError by mutableStateOf<String?>(null)
        private set

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            uiState = OperatorsUiState.Loading
            repository.list()
                .onSuccess { uiState = OperatorsUiState.Success(it.operators) }
                .onFailure { uiState = OperatorsUiState.Error((it as? ApiException)?.message ?: "Something went wrong.") }
        }
    }

    fun openCreateDialog() {
        actionError = null
        createDialogOpen = true
    }

    fun closeCreateDialog() {
        createDialogOpen = false
    }

    fun createOperator(input: OperatorFormInput) {
        if (actionPending) return
        viewModelScope.launch {
            actionPending = true
            actionError = null
            repository.create(input)
                .onSuccess {
                    createDialogOpen = false
                    load()
                }
                .onFailure { actionError = (it as? ApiException)?.message ?: "Couldn't create operator." }
            actionPending = false
        }
    }

    fun setActive(id: String, isActive: Boolean) {
        viewModelScope.launch {
            repository.setActive(id, isActive).onSuccess { load() }
        }
    }

    fun deleteOperator(id: String) {
        viewModelScope.launch {
            repository.delete(id).onSuccess { load() }
        }
    }
}

class OperatorsViewModelFactory(private val repository: OperatorsRepository) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T = OperatorsViewModel(repository) as T
}
