package ai.instapark.valet.ui.login

import ai.instapark.valet.data.remote.ApiException
import ai.instapark.valet.data.repository.PushTokenRepository
import ai.instapark.valet.data.repository.SessionRepository
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.launch

class LoginViewModel(
    private val sessionRepository: SessionRepository,
    private val pushTokenRepository: PushTokenRepository,
) : ViewModel() {
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
                .onSuccess {
                    onSuccess()
                    registerPushToken()
                }
                .onFailure { errorMessage = (it as? ApiException)?.message ?: "Something went wrong." }
            isLoading = false
        }
    }

    // Fire-and-forget -- a failed FCM token fetch/registration shouldn't block login.
    private fun registerPushToken() {
        FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
            viewModelScope.launch { pushTokenRepository.register(token) }
        }
    }
}

class LoginViewModelFactory(
    private val sessionRepository: SessionRepository,
    private val pushTokenRepository: PushTokenRepository,
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T =
        LoginViewModel(sessionRepository, pushTokenRepository) as T
}
