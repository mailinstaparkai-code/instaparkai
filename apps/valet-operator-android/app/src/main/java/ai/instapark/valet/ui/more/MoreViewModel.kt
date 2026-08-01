package ai.instapark.valet.ui.more

import ai.instapark.valet.data.local.TokenStore
import ai.instapark.valet.data.remote.dto.AccessibleSite
import ai.instapark.valet.data.repository.SessionRepository
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class MoreViewModel(
    private val sessionRepository: SessionRepository,
    private val tokenStore: TokenStore,
) : ViewModel() {
    var accessibleSites by mutableStateOf<List<AccessibleSite>>(emptyList())
        private set
    var currentSiteId by mutableStateOf<String?>(null)
        private set
    var siteSwitcherOpen by mutableStateOf(false)
        private set
    var switchPending by mutableStateOf(false)
        private set

    init {
        viewModelScope.launch {
            currentSiteId = tokenStore.currentSiteIdFlow.first()
            sessionRepository.fetchSession().onSuccess {
                accessibleSites = it.accessibleSites
                currentSiteId = it.currentSiteId
            }
        }
    }

    fun openSiteSwitcher() {
        if (accessibleSites.size > 1) siteSwitcherOpen = true
    }

    fun closeSiteSwitcher() {
        siteSwitcherOpen = false
    }

    fun switchSite(siteId: String) {
        if (siteId == currentSiteId || switchPending) return
        viewModelScope.launch {
            switchPending = true
            sessionRepository.switchSite(siteId).onSuccess {
                currentSiteId = siteId
                siteSwitcherOpen = false
            }
            switchPending = false
        }
    }
}

class MoreViewModelFactory(
    private val sessionRepository: SessionRepository,
    private val tokenStore: TokenStore,
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T = MoreViewModel(sessionRepository, tokenStore) as T
}
