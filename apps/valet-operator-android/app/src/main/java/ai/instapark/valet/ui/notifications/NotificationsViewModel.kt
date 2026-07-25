package ai.instapark.valet.ui.notifications

import ai.instapark.valet.data.remote.dto.NotificationItem
import ai.instapark.valet.data.repository.NotificationsRepository
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private const val POLL_MS = 20_000L

/**
 * Mirrors notifications-bell.tsx: 20s polling, opening the bell marks everything read,
 * and a "vibrate signal" increments only when unread count rises tick-over-tick (never
 * on first load) -- the Composable observes it once via LaunchedEffect to buzz.
 */
class NotificationsViewModel(private val repository: NotificationsRepository) : ViewModel() {
    var notifications by mutableStateOf<List<NotificationItem>>(emptyList())
        private set
    var unreadCount by mutableStateOf(0)
        private set
    var vibrateSignal by mutableStateOf(0)
        private set

    private var lastUnreadCount: Int? = null

    // Driven by the composable via repeatOnLifecycle(STARTED) so polling pauses
    // while the app is backgrounded (nothing renders while backgrounded, so this
    // changes nothing the user sees) and resumes -- with an immediate refresh --
    // the moment the app is foregrounded again, same as today.
    suspend fun pollWhileActive() {
        while (true) {
            refresh()
            delay(POLL_MS)
        }
    }

    private suspend fun refresh() {
        repository.list().onSuccess { list ->
            notifications = list
            val newUnread = list.count { it.readAt == null }
            unreadCount = newUnread
            val previous = lastUnreadCount
            if (previous != null && newUnread > previous) {
                vibrateSignal += 1
            }
            lastUnreadCount = newUnread
        }
    }

    fun onBellOpened() {
        if (unreadCount == 0) return
        viewModelScope.launch {
            repository.markAllRead().onSuccess { refresh() }
        }
    }
}

class NotificationsViewModelFactory(
    private val repository: NotificationsRepository,
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T = NotificationsViewModel(repository) as T
}
