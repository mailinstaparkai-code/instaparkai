package ai.instapark.valet.ui.search

import ai.instapark.valet.data.local.RecentSearchEntry
import ai.instapark.valet.data.local.SearchStore
import ai.instapark.valet.data.repository.QueueRepository
import ai.instapark.valet.data.repository.VehiclesRepository
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

data class SearchResult(
    val plate: String,
    val meta: String,
    val status: String,
    val vehicleType: String,
)

class SearchViewModel(
    private val queueRepository: QueueRepository,
    private val vehiclesRepository: VehiclesRepository,
    private val searchStore: SearchStore,
) : ViewModel() {
    var query by mutableStateOf("")
        private set
    var results by mutableStateOf<List<SearchResult>>(emptyList())
        private set
    var recentSearches by mutableStateOf<List<RecentSearchEntry>>(emptyList())
        private set
    private var pool: List<SearchResult> = emptyList()

    init {
        viewModelScope.launch {
            recentSearches = searchStore.recentSearchesFlow.first()
        }
        loadPool()
    }

    private fun loadPool() {
        viewModelScope.launch {
            val queueDeferred = async { queueRepository.list() }
            val vehiclesDeferred = async { vehiclesRepository.list() }
            val queueItems = queueDeferred.await().getOrNull()?.tickets.orEmpty().map {
                SearchResult(
                    plate = it.vehicleNumber,
                    meta = listOfNotNull(it.vehicleType, it.slotNumber?.let { s -> "Slot $s" }, it.mobileNumber).joinToString(" · "),
                    status = it.status,
                    vehicleType = it.vehicleType,
                )
            }
            val vehicleItems = vehiclesDeferred.await().getOrNull()?.tickets.orEmpty().map {
                SearchResult(
                    plate = it.vehicleNumber,
                    meta = listOfNotNull(it.vehicleType, it.slotNumber?.let { s -> "Slot $s" }, it.mobileNumber).joinToString(" · "),
                    status = it.status,
                    vehicleType = it.vehicleType,
                )
            }
            pool = (queueItems + vehicleItems).distinctBy { it.plate }
            applyFilter()
        }
    }

    fun onQueryChange(value: String) {
        query = value
        applyFilter()
    }

    private fun applyFilter() {
        val q = query.trim()
        results = if (q.isEmpty()) {
            emptyList()
        } else {
            pool.filter { it.plate.contains(q, ignoreCase = true) || it.meta.contains(q, ignoreCase = true) }.take(8)
        }
    }

    fun commitSearch(query: String = this.query) {
        if (query.isBlank()) return
        viewModelScope.launch { searchStore.addRecent(query, kind = "Vehicle") }
    }

    fun clearRecents() {
        viewModelScope.launch {
            searchStore.clear()
            recentSearches = emptyList()
        }
    }
}

class SearchViewModelFactory(
    private val queueRepository: QueueRepository,
    private val vehiclesRepository: VehiclesRepository,
    private val searchStore: SearchStore,
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T =
        SearchViewModel(queueRepository, vehiclesRepository, searchStore) as T
}
