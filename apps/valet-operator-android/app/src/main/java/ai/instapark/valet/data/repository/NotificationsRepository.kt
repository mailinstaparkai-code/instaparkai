package ai.instapark.valet.data.repository

import ai.instapark.valet.data.remote.ParkingAdminApi
import ai.instapark.valet.data.remote.dto.NotificationItem
import ai.instapark.valet.data.remote.toApiException
import com.google.gson.Gson

class NotificationsRepository(
    private val api: ParkingAdminApi,
    private val gson: Gson,
) {
    suspend fun list(): Result<List<NotificationItem>> = try {
        Result.success(api.notifications().notifications)
    } catch (t: Throwable) {
        Result.failure(t.toApiException(gson))
    }

    suspend fun markAllRead(): Result<Unit> = try {
        Result.success(api.markNotificationsRead())
    } catch (t: Throwable) {
        Result.failure(t.toApiException(gson))
    }
}
