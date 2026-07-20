package ai.instapark.valet.data.repository

import ai.instapark.valet.data.remote.ParkingAdminApi
import ai.instapark.valet.data.remote.dto.DeviceTokenRequest
import ai.instapark.valet.data.remote.toApiException
import com.google.gson.Gson

class PushTokenRepository(
    private val api: ParkingAdminApi,
    private val gson: Gson,
) {
    suspend fun register(token: String): Result<Unit> = try {
        Result.success(api.registerDeviceToken(DeviceTokenRequest(platform = "android", token = token)))
    } catch (t: Throwable) {
        Result.failure(t.toApiException(gson))
    }
}
