package ai.instapark.valet.data.repository

import ai.instapark.valet.data.remote.ParkingAdminApi
import ai.instapark.valet.data.remote.dto.VehiclesResponse
import ai.instapark.valet.data.remote.toApiException
import com.google.gson.Gson

class VehiclesRepository(
    private val api: ParkingAdminApi,
    private val gson: Gson,
) {
    suspend fun list(
        status: String? = null,
        vehicleType: String? = null,
        operator: String? = null,
        page: Int = 1,
    ): Result<VehiclesResponse> = try {
        Result.success(api.vehicles(status = status, vehicleType = vehicleType, operator = operator, page = page))
    } catch (t: Throwable) {
        Result.failure(t.toApiException(gson))
    }
}
