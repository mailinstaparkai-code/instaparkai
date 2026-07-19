package ai.instapark.valet.data.remote

import ai.instapark.valet.data.remote.dto.AutoAllocateRequest
import ai.instapark.valet.data.remote.dto.CheckInResponse
import ai.instapark.valet.data.remote.dto.DashboardResponse
import ai.instapark.valet.data.remote.dto.DispatchRequest
import ai.instapark.valet.data.remote.dto.LoginRequest
import ai.instapark.valet.data.remote.dto.LoginResponse
import ai.instapark.valet.data.remote.dto.MarkParkedRequest
import ai.instapark.valet.data.remote.dto.MeResponse
import ai.instapark.valet.data.remote.dto.MyDailyStatus
import ai.instapark.valet.data.remote.dto.SetStatusRequest
import ai.instapark.valet.data.remote.dto.NotificationsResponse
import ai.instapark.valet.data.remote.dto.PhotosResponse
import ai.instapark.valet.data.remote.dto.QueueResponse
import ai.instapark.valet.data.remote.dto.TimelineResponse
import ai.instapark.valet.data.remote.dto.UpdateTicketRequest
import ai.instapark.valet.data.remote.dto.VehiclesResponse
import ai.instapark.valet.data.remote.dto.VoidRequest
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path
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

    @GET("status")
    suspend fun myStatus(): MyDailyStatus

    @POST("status")
    suspend fun setMyStatus(@Body request: SetStatusRequest): MyDailyStatus

    @GET("vehicles")
    suspend fun vehicles(
        @Query("status") status: String? = null,
        @Query("vehicle_type") vehicleType: String? = null,
        @Query("operator") operator: String? = null,
        @Query("page") page: Int = 1,
    ): VehiclesResponse

    @GET("queue")
    suspend fun queue(
        @Query("status") status: String? = null,
        @Query("vehicle_type") vehicleType: String? = null,
    ): QueueResponse

    @Multipart
    @POST("queue/check-in")
    suspend fun checkIn(
        @Part("vehicle_number") vehicleNumber: RequestBody,
        @Part("vehicle_type") vehicleType: RequestBody,
        @Part("mobile_number") mobileNumber: RequestBody,
        @Part photoFront: MultipartBody.Part? = null,
        @Part photoBack: MultipartBody.Part? = null,
        @Part photoLeft: MultipartBody.Part? = null,
        @Part photoRight: MultipartBody.Part? = null,
        @Part photoOdometer: MultipartBody.Part? = null,
    ): CheckInResponse

    @POST("queue/{id}/mark-parked")
    suspend fun markParked(@Path("id") id: String, @Body request: MarkParkedRequest)

    @POST("queue/{id}/request")
    suspend fun requestVehicle(@Path("id") id: String)

    @POST("queue/{id}/dispatch")
    suspend fun dispatch(@Path("id") id: String, @Body request: DispatchRequest)

    @POST("queue/{id}/mark-arrived")
    suspend fun markArrived(@Path("id") id: String)

    @Multipart
    @POST("queue/{id}/complete-handover")
    suspend fun completeHandover(
        @Path("id") id: String,
        @Part("otp") otp: RequestBody,
        @Part("fare_amount") fareAmount: RequestBody?,
        @Part("payment_collected") paymentCollected: RequestBody,
        @Part photoHandover: MultipartBody.Part? = null,
    )

    @PATCH("queue/{id}")
    suspend fun updateTicket(@Path("id") id: String, @Body request: UpdateTicketRequest)

    @POST("queue/{id}/void")
    suspend fun voidTicket(@Path("id") id: String, @Body request: VoidRequest)

    @GET("queue/{id}/timeline")
    suspend fun timeline(@Path("id") id: String): TimelineResponse

    @GET("queue/{id}/photos")
    suspend fun photos(@Path("id") id: String): PhotosResponse

    @PATCH("queue/auto-allocate")
    suspend fun setAutoAllocate(@Body request: AutoAllocateRequest)

    @GET("notifications")
    suspend fun notifications(): NotificationsResponse

    @POST("notifications/mark-read")
    suspend fun markNotificationsRead()
}
