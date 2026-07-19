package ai.instapark.valet.ui.queue

import ai.instapark.valet.data.remote.ApiException
import ai.instapark.valet.data.remote.dto.QueueResponse
import ai.instapark.valet.data.remote.dto.TicketPhoto
import ai.instapark.valet.data.repository.CheckInPhotos
import ai.instapark.valet.data.repository.QueueRepository
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import java.io.File
import kotlinx.coroutines.launch

sealed interface QueueUiState {
    data object Loading : QueueUiState
    data class Success(val response: QueueResponse) : QueueUiState
    data class Error(val message: String) : QueueUiState
}

class QueueViewModel(private val repository: QueueRepository) : ViewModel() {
    var uiState by mutableStateOf<QueueUiState>(QueueUiState.Loading)
        private set
    var statusFilter by mutableStateOf<String?>(null)
        private set
    var mutationPending by mutableStateOf(false)
        private set

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            uiState = QueueUiState.Loading
            repository.list(status = statusFilter)
                .onSuccess { uiState = QueueUiState.Success(it) }
                .onFailure { uiState = QueueUiState.Error(it.friendlyMessage()) }
        }
    }

    fun applyStatusFilter(status: String?) {
        if (statusFilter == status) return
        statusFilter = status
        load()
    }

    private fun refreshSilently() {
        viewModelScope.launch {
            repository.list(status = statusFilter).onSuccess { uiState = QueueUiState.Success(it) }
        }
    }

    private fun <T> perform(action: suspend () -> Result<T>, onDone: (String?) -> Unit) {
        viewModelScope.launch {
            mutationPending = true
            val result = action()
            mutationPending = false
            result.onSuccess {
                refreshSilently()
                onDone(null)
            }.onFailure {
                onDone(it.friendlyMessage())
            }
        }
    }

    fun checkIn(
        vehicleNumber: String,
        vehicleType: String,
        mobileNumber: String,
        photos: CheckInPhotos,
        onDone: (String?) -> Unit,
    ) = perform({ repository.checkIn(vehicleNumber, vehicleType, mobileNumber, photos) }, onDone)

    fun markParked(id: String, slotId: String, onDone: (String?) -> Unit) =
        perform({ repository.markParked(id, slotId) }, onDone)

    fun requestVehicle(id: String, onDone: (String?) -> Unit) =
        perform({ repository.requestVehicle(id) }, onDone)

    fun dispatch(id: String, operatorId: String, onDone: (String?) -> Unit) =
        perform({ repository.dispatch(id, operatorId) }, onDone)

    fun markArrived(id: String, onDone: (String?) -> Unit) =
        perform({ repository.markArrived(id) }, onDone)

    fun completeHandover(
        id: String,
        otp: String,
        fareAmount: String?,
        paymentCollected: Boolean,
        handoverPhoto: File?,
        onDone: (String?) -> Unit,
    ) = perform(
        { repository.completeHandover(id, otp, fareAmount, paymentCollected, handoverPhoto) },
        onDone
    )

    fun updateTicket(id: String, vehicleNumber: String, mobileNumber: String, onDone: (String?) -> Unit) =
        perform({ repository.updateTicket(id, vehicleNumber, mobileNumber) }, onDone)

    fun voidTicket(id: String, reason: String?, onDone: (String?) -> Unit) =
        perform({ repository.voidTicket(id, reason) }, onDone)

    fun setAutoAllocate(enabled: Boolean) = perform({ repository.setAutoAllocate(enabled) }, {})

    fun loadPhotos(id: String, onResult: (List<TicketPhoto>?, String?) -> Unit) {
        viewModelScope.launch {
            repository.photos(id)
                .onSuccess { onResult(it.photos, null) }
                .onFailure { onResult(null, it.friendlyMessage()) }
        }
    }
}

private fun Throwable.friendlyMessage(): String = (this as? ApiException)?.message ?: "Something went wrong."

class QueueViewModelFactory(private val repository: QueueRepository) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T = QueueViewModel(repository) as T
}
