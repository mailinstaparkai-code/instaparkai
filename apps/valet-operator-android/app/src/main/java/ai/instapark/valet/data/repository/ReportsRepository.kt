package ai.instapark.valet.data.repository

import ai.instapark.valet.data.remote.ParkingAdminApi
import ai.instapark.valet.data.remote.dto.VehicleTransactionsResponse
import ai.instapark.valet.data.remote.toApiException
import com.google.gson.Gson

class ReportsRepository(
    private val api: ParkingAdminApi,
    private val gson: Gson,
) {
    suspend fun vehicleTransactions(
        type: String? = null,
        operator: String? = null,
        from: String? = null,
        to: String? = null,
        page: Int = 1,
    ): Result<VehicleTransactionsResponse> = try {
        Result.success(api.vehicleTransactionsReport(type, operator, from, to, page))
    } catch (t: Throwable) {
        Result.failure(t.toApiException(gson))
    }
}
