package ai.instapark.valet.data.repository

import ai.instapark.valet.data.remote.ParkingAdminApi
import ai.instapark.valet.data.remote.dto.DashboardResponse
import ai.instapark.valet.data.remote.toApiException
import com.google.gson.Gson

class DashboardRepository(
    private val api: ParkingAdminApi,
    private val gson: Gson,
) {
    suspend fun getSummary(): Result<DashboardResponse> = try {
        Result.success(api.dashboard())
    } catch (t: Throwable) {
        Result.failure(t.toApiException(gson))
    }
}
