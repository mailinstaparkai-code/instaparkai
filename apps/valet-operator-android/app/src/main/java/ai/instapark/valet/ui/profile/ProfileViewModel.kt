package ai.instapark.valet.ui.profile

import ai.instapark.valet.data.local.TokenStore
import ai.instapark.valet.data.repository.SessionRepository
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class ProfileViewModel(
    private val sessionRepository: SessionRepository,
    private val tokenStore: TokenStore,
) : ViewModel() {
    var username by mutableStateOf<String?>(null)
        private set
    var fullName by mutableStateOf<String?>(null)
        private set
    var role by mutableStateOf<String?>(null)
        private set

    init {
        viewModelScope.launch {
            username = tokenStore.usernameFlow.first()
            fullName = tokenStore.fullNameFlow.first()
            role = tokenStore.roleFlow.first()
        }
    }

    fun signOut(onDone: () -> Unit) {
        viewModelScope.launch {
            sessionRepository.logout()
            onDone()
        }
    }
}

class ProfileViewModelFactory(
    private val sessionRepository: SessionRepository,
    private val tokenStore: TokenStore,
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T = ProfileViewModel(sessionRepository, tokenStore) as T
}
