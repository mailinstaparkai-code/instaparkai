package ai.instapark.valet.data.repository

import ai.instapark.valet.data.remote.ParkingAdminApi
import ai.instapark.valet.data.remote.dto.AppVersionResponse
import ai.instapark.valet.data.remote.toApiException
import com.google.gson.Gson

class UpdateRepository(
    private val api: ParkingAdminApi,
    private val gson: Gson,
) {
    suspend fun checkForUpdate(): Result<AppVersionResponse> = try {
        Result.success(api.appVersion())
    } catch (t: Throwable) {
        Result.failure(t.toApiException(gson))
    }
}
