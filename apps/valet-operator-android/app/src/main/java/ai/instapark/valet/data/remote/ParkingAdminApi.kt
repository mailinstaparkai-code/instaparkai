package ai.instapark.valet.data.remote

import ai.instapark.valet.data.remote.dto.AppVersionResponse
import ai.instapark.valet.data.remote.dto.AutoAllocateRequest
import ai.instapark.valet.data.remote.dto.CheckInResponse
import ai.instapark.valet.data.remote.dto.CreateOperatorResponse
import ai.instapark.valet.data.remote.dto.CreateSlotRequest
import ai.instapark.valet.data.remote.dto.CreateSlotResponse
import ai.instapark.valet.data.remote.dto.CreateSlotsBulkRequest
import ai.instapark.valet.data.remote.dto.CreateSlotsBulkResponse
import ai.instapark.valet.data.remote.dto.CreateTariffRuleRequest
import ai.instapark.valet.data.remote.dto.CreateTariffRuleResponse
import ai.instapark.valet.data.remote.dto.CreateVehiclePassRequest
import ai.instapark.valet.data.remote.dto.CreateVehiclePassResponse
import ai.instapark.valet.data.remote.dto.CreateVehicleTypeRequest
import ai.instapark.valet.data.remote.dto.CreateVehicleTypeResponse
import ai.instapark.valet.data.remote.dto.CreateZoneRequest
import ai.instapark.valet.data.remote.dto.CreateZoneResponse
import ai.instapark.valet.data.remote.dto.DashboardResponse
import ai.instapark.valet.data.remote.dto.DeviceTokenRequest
import ai.instapark.valet.data.remote.dto.DispatchRequest
import ai.instapark.valet.data.remote.dto.GenerateQrCodesRequest
import ai.instapark.valet.data.remote.dto.GenerateQrCodesResponse
import ai.instapark.valet.data.remote.dto.GuestRequestsResponse
import ai.instapark.valet.data.remote.dto.LoginRequest
import ai.instapark.valet.data.remote.dto.LoginResponse
import ai.instapark.valet.data.remote.dto.MarkParkedRequest
import ai.instapark.valet.data.remote.dto.MeResponse
import ai.instapark.valet.data.remote.dto.MyDailyStatus
import ai.instapark.valet.data.remote.dto.OperatorsResponse
import ai.instapark.valet.data.remote.dto.SetGuestRequestModeRequest
import ai.instapark.valet.data.remote.dto.SetGuestRequestModeResponse
import ai.instapark.valet.data.remote.dto.SetOperatorActiveRequest
import ai.instapark.valet.data.remote.dto.SetOperatorDailyStatusRequest
import ai.instapark.valet.data.remote.dto.SetOperatorLeaveRequest
import ai.instapark.valet.data.remote.dto.SetStatusRequest
import ai.instapark.valet.data.remote.dto.NotificationsResponse
import ai.instapark.valet.data.remote.dto.PhotosResponse
import ai.instapark.valet.data.remote.dto.QueueResponse
import ai.instapark.valet.data.remote.dto.SwitchSiteRequest
import ai.instapark.valet.data.remote.dto.SwitchSiteResponse
import ai.instapark.valet.data.remote.dto.TariffRulesResponse
import ai.instapark.valet.data.remote.dto.TimelineResponse
import ai.instapark.valet.data.remote.dto.UpdateTicketRequest
import ai.instapark.valet.data.remote.dto.VehiclePassesResponse
import ai.instapark.valet.data.remote.dto.VehicleTypesResponse
import ai.instapark.valet.data.remote.dto.VehicleTransactionsResponse
import ai.instapark.valet.data.remote.dto.VehiclesResponse
import ai.instapark.valet.data.remote.dto.VoidRequest
import ai.instapark.valet.data.remote.dto.ZonesResponse
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.http.Body
import retrofit2.http.DELETE
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

    @GET("app-version")
    suspend fun appVersion(@Query("platform") platform: String = "android"): AppVersionResponse

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
        @Part("qr_code") qrCode: RequestBody? = null,
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
        @Part("otp") otp: RequestBody?,
        @Part("qr_code") qrCode: RequestBody?,
        @Part("fare_amount") fareAmount: RequestBody?,
        @Part("payment_collected") paymentCollected: RequestBody,
        @Part photoHandover: MultipartBody.Part? = null,
    )

    @Multipart
    @POST("queue/{id}/direct-checkout")
    suspend fun completeDirectCheckout(
        @Path("id") id: String,
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

    @POST("device-tokens")
    suspend fun registerDeviceToken(@Body request: DeviceTokenRequest)

    @POST("me/switch-site")
    suspend fun switchSite(@Body request: SwitchSiteRequest): SwitchSiteResponse

    @GET("reports/vehicle-transactions")
    suspend fun vehicleTransactionsReport(
        @Query("type") type: String? = null,
        @Query("operator") operator: String? = null,
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
        @Query("page") page: Int = 1,
    ): VehicleTransactionsResponse

    @GET("configuration/zones")
    suspend fun zones(): ZonesResponse

    @POST("configuration/zones")
    suspend fun createZone(@Body request: CreateZoneRequest): CreateZoneResponse

    @DELETE("configuration/zones/{id}")
    suspend fun deleteZone(@Path("id") id: String)

    @POST("configuration/zones/{zoneId}/slots")
    suspend fun createSlot(@Path("zoneId") zoneId: String, @Body request: CreateSlotRequest): CreateSlotResponse

    @POST("configuration/zones/{zoneId}/slots/bulk")
    suspend fun createSlotsBulk(@Path("zoneId") zoneId: String, @Body request: CreateSlotsBulkRequest): CreateSlotsBulkResponse

    @DELETE("configuration/slots/{id}")
    suspend fun deleteSlot(@Path("id") id: String)

    @GET("configuration/vehicle-types")
    suspend fun vehicleTypes(): VehicleTypesResponse

    @POST("configuration/vehicle-types")
    suspend fun createVehicleType(@Body request: CreateVehicleTypeRequest): CreateVehicleTypeResponse

    @DELETE("configuration/vehicle-types/{id}")
    suspend fun deleteVehicleType(@Path("id") id: String)

    @GET("configuration/vehicle-passes")
    suspend fun vehiclePasses(): VehiclePassesResponse

    @POST("configuration/vehicle-passes")
    suspend fun createVehiclePass(@Body request: CreateVehiclePassRequest): CreateVehiclePassResponse

    @DELETE("configuration/vehicle-passes/{id}")
    suspend fun deleteVehiclePass(@Path("id") id: String)

    @GET("configuration/tariffs")
    suspend fun tariffRules(): TariffRulesResponse

    @POST("configuration/tariffs")
    suspend fun createTariffRule(@Body request: CreateTariffRuleRequest): CreateTariffRuleResponse

    @DELETE("configuration/tariffs/{id}")
    suspend fun deleteTariffRule(@Path("id") id: String)

    @GET("configuration/guest-requests")
    suspend fun guestRequests(): GuestRequestsResponse

    @PATCH("configuration/guest-requests")
    suspend fun setGuestRequestMode(@Body request: SetGuestRequestModeRequest): SetGuestRequestModeResponse

    @POST("configuration/qr-codes")
    suspend fun generateQrCodes(@Body request: GenerateQrCodesRequest): GenerateQrCodesResponse

    @GET("operators")
    suspend fun operators(): OperatorsResponse

    @Multipart
    @POST("operators")
    suspend fun createOperator(
        @Part("username") username: RequestBody,
        @Part("password") password: RequestBody,
        @Part("fullName") fullName: RequestBody?,
        @Part("employeeId") employeeId: RequestBody?,
        @Part("email") email: RequestBody?,
        @Part("phone") phone: RequestBody?,
        @Part("drivingLicenseExpiry") drivingLicenseExpiry: RequestBody?,
        @Part photo: MultipartBody.Part? = null,
        @Part drivingLicense: MultipartBody.Part? = null,
        @Part aadhar: MultipartBody.Part? = null,
        @Part policeVerification: MultipartBody.Part? = null,
    ): CreateOperatorResponse

    @Multipart
    @PATCH("operators/{id}")
    suspend fun updateOperator(
        @Path("id") id: String,
        @Part("username") username: RequestBody,
        @Part("password") password: RequestBody?,
        @Part("fullName") fullName: RequestBody?,
        @Part("employeeId") employeeId: RequestBody?,
        @Part("email") email: RequestBody?,
        @Part("phone") phone: RequestBody?,
        @Part("drivingLicenseExpiry") drivingLicenseExpiry: RequestBody?,
        @Part photo: MultipartBody.Part? = null,
        @Part drivingLicense: MultipartBody.Part? = null,
        @Part aadhar: MultipartBody.Part? = null,
        @Part policeVerification: MultipartBody.Part? = null,
    )

    @DELETE("operators/{id}")
    suspend fun deleteOperator(@Path("id") id: String)

    @PATCH("operators/{id}/active")
    suspend fun setOperatorActive(@Path("id") id: String, @Body request: SetOperatorActiveRequest)

    @PATCH("operators/{id}/daily-status")
    suspend fun setOperatorDailyStatus(@Path("id") id: String, @Body request: SetOperatorDailyStatusRequest)

    @POST("operators/{id}/leave")
    suspend fun setOperatorLeave(@Path("id") id: String, @Body request: SetOperatorLeaveRequest)
}
