package ai.instapark.valet.ui.configuration

import ai.instapark.valet.data.remote.ApiException
import ai.instapark.valet.data.remote.dto.CreateTariffRuleRequest
import ai.instapark.valet.data.remote.dto.GuestRequestsResponse
import ai.instapark.valet.data.remote.dto.TariffRuleItem
import ai.instapark.valet.data.remote.dto.VehicleTypeItem
import ai.instapark.valet.data.remote.dto.ZoneItem
import ai.instapark.valet.data.repository.ConfigurationRepository
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch

enum class ConfigTab(val label: String) {
    ZONES("Zones"),
    VEHICLE_TYPES("Vehicles"),
    TARIFFS("Fares"),
    GUEST_REQUESTS("Requests"),
}

sealed interface ConfigLoadState {
    data object Loading : ConfigLoadState
    data object Success : ConfigLoadState
    data class Error(val message: String) : ConfigLoadState
}

class ConfigurationViewModel(private val repository: ConfigurationRepository) : ViewModel() {
    var selectedTab by mutableStateOf(ConfigTab.ZONES)
        private set
    var loadState by mutableStateOf<ConfigLoadState>(ConfigLoadState.Loading)
        private set

    var zones by mutableStateOf<List<ZoneItem>>(emptyList())
        private set
    var vehicleTypes by mutableStateOf<List<VehicleTypeItem>>(emptyList())
        private set
    var tariffRules by mutableStateOf<List<TariffRuleItem>>(emptyList())
        private set
    var guestRequests by mutableStateOf<GuestRequestsResponse?>(null)
        private set

    private val loadedTabs = mutableSetOf<ConfigTab>()

    init {
        selectTab(ConfigTab.ZONES)
    }

    fun selectTab(tab: ConfigTab) {
        selectedTab = tab
        if (tab in loadedTabs) return
        loadTab(tab)
    }

    private fun loadTab(tab: ConfigTab) {
        viewModelScope.launch {
            loadState = ConfigLoadState.Loading
            val result = when (tab) {
                ConfigTab.ZONES -> repository.zones().onSuccess { zones = it.zones }
                ConfigTab.VEHICLE_TYPES -> repository.vehicleTypes().onSuccess { vehicleTypes = it.vehicleTypes }
                ConfigTab.TARIFFS -> repository.tariffRules().onSuccess { tariffRules = it.tariffRules }
                ConfigTab.GUEST_REQUESTS -> repository.guestRequests().onSuccess { guestRequests = it }
            }
            result
                .onSuccess {
                    loadedTabs += tab
                    loadState = ConfigLoadState.Success
                }
                .onFailure { loadState = ConfigLoadState.Error((it as? ApiException)?.message ?: "Something went wrong.") }
        }
    }

    fun refreshCurrentTab() {
        loadedTabs -= selectedTab
        loadTab(selectedTab)
    }

    fun createZone(name: String) {
        viewModelScope.launch { repository.createZone(name).onSuccess { refreshCurrentTab() } }
    }

    fun deleteZone(id: String) {
        viewModelScope.launch { repository.deleteZone(id).onSuccess { refreshCurrentTab() } }
    }

    fun createSlot(zoneId: String, slotNumber: String, isEv: Boolean, isDisabledSlot: Boolean) {
        viewModelScope.launch {
            repository.createSlot(zoneId, slotNumber, isEv, isDisabledSlot).onSuccess { refreshCurrentTab() }
        }
    }

    fun deleteSlot(id: String) {
        viewModelScope.launch { repository.deleteSlot(id).onSuccess { refreshCurrentTab() } }
    }

    fun createVehicleType(name: String) {
        viewModelScope.launch { repository.createVehicleType(name).onSuccess { refreshCurrentTab() } }
    }

    fun deleteVehicleType(id: String) {
        viewModelScope.launch { repository.deleteVehicleType(id).onSuccess { refreshCurrentTab() } }
    }

    fun createTariffRule(request: CreateTariffRuleRequest) {
        viewModelScope.launch { repository.createTariffRule(request).onSuccess { refreshCurrentTab() } }
    }

    fun deleteTariffRule(id: String) {
        viewModelScope.launch { repository.deleteTariffRule(id).onSuccess { refreshCurrentTab() } }
    }

    fun setGuestRequestMode(mode: String) {
        viewModelScope.launch { repository.setGuestRequestMode(mode).onSuccess { refreshCurrentTab() } }
    }

    fun generateQrCodes(count: Int) {
        viewModelScope.launch { repository.generateQrCodes(count).onSuccess { refreshCurrentTab() } }
    }
}

class ConfigurationViewModelFactory(private val repository: ConfigurationRepository) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T = ConfigurationViewModel(repository) as T
}
