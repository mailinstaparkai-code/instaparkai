package ai.instapark.valet.ui.login

import ai.instapark.valet.data.remote.ApiException
import ai.instapark.valet.data.repository.SessionRepository
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch

class LoginViewModel(private val sessionRepository: SessionRepository) : ViewModel() {
    var username by mutableStateOf("")
        private set
    var password by mutableStateOf("")
        private set
    var isLoading by mutableStateOf(false)
        private set
    var errorMessage by mutableStateOf<String?>(null)
        private set

    fun onUsernameChange(value: String) {
        username = value
    }

    fun onPasswordChange(value: String) {
        password = value
    }

    fun login(onSuccess: () -> Unit) {
        if (username.isBlank() || password.isBlank()) {
            errorMessage = "Enter your username and password."
            return
        }
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            sessionRepository.login(username.trim(), password)
                .onSuccess { onSuccess() }
                .onFailure { errorMessage = (it as? ApiException)?.message ?: "Something went wrong." }
            isLoading = false
        }
    }
}

class LoginViewModelFactory(private val sessionRepository: SessionRepository) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T = LoginViewModel(sessionRepository) as T
}
