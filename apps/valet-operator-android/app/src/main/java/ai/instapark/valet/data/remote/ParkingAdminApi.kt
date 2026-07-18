package ai.instapark.valet.data.remote

import ai.instapark.valet.data.remote.dto.DashboardResponse
import ai.instapark.valet.data.remote.dto.LoginRequest
import ai.instapark.valet.data.remote.dto.LoginResponse
import ai.instapark.valet.data.remote.dto.MeResponse
import ai.instapark.valet.data.remote.dto.VehiclesResponse
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Body
import retrofit2.http.Query

interface ParkingAdminApi {
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): LoginResponse

    @POST("auth/logout")
    suspend fun logout()

    @GET("me")
    suspend fun me(): MeResponse

    @GET("dashboard")
    suspend fun dashboard(): DashboardResponse

    @GET("vehicles")
    suspend fun vehicles(
        @Query("status") status: String? = null,
        @Query("vehicle_type") vehicleType: String? = null,
        @Query("operator") operator: String? = null,
        @Query("page") page: Int = 1,
    ): VehiclesResponse
}
