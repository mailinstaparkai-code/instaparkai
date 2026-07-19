package ai.instapark.valet.data.repository

import ai.instapark.valet.data.remote.ParkingAdminApi
import ai.instapark.valet.data.remote.dto.AutoAllocateRequest
import ai.instapark.valet.data.remote.dto.DispatchRequest
import ai.instapark.valet.data.remote.dto.MarkParkedRequest
import ai.instapark.valet.data.remote.dto.PhotosResponse
import ai.instapark.valet.data.remote.dto.QueueResponse
import ai.instapark.valet.data.remote.dto.QueueTicket
import ai.instapark.valet.data.remote.dto.TimelineResponse
import ai.instapark.valet.data.remote.dto.UpdateTicketRequest
import ai.instapark.valet.data.remote.dto.VoidRequest
import ai.instapark.valet.data.remote.toApiException
import com.google.gson.Gson
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.toRequestBody

class QueueRepository(
    private val api: ParkingAdminApi,
    private val gson: Gson,
) {
    private fun String.textBody() = toRequestBody("text/plain".toMediaTypeOrNull())

    suspend fun list(status: String? = null, vehicleType: String? = null): Result<QueueResponse> = wrap {
        api.queue(status = status, vehicleType = vehicleType)
    }

    suspend fun checkIn(vehicleNumber: String, vehicleType: String, mobileNumber: String): Result<QueueTicket> = wrap {
        api.checkIn(
            vehicleNumber = vehicleNumber.textBody(),
            vehicleType = vehicleType.textBody(),
            mobileNumber = mobileNumber.textBody(),
        ).ticket
    }

    suspend fun markParked(id: String, slotId: String): Result<Unit> = wrap {
        api.markParked(id, MarkParkedRequest(slotId))
    }

    suspend fun requestVehicle(id: String): Result<Unit> = wrap { api.requestVehicle(id) }

    suspend fun dispatch(id: String, operatorId: String): Result<Unit> = wrap {
        api.dispatch(id, DispatchRequest(operatorId))
    }

    suspend fun markArrived(id: String): Result<Unit> = wrap { api.markArrived(id) }

    suspend fun completeHandover(
        id: String,
        otp: String,
        fareAmount: String?,
        paymentCollected: Boolean,
    ): Result<Unit> = wrap {
        api.completeHandover(
            id = id,
            otp = otp.textBody(),
            fareAmount = fareAmount?.textBody(),
            paymentCollected = paymentCollected.toString().textBody(),
        )
    }

    suspend fun updateTicket(id: String, vehicleNumber: String, mobileNumber: String): Result<Unit> = wrap {
        api.updateTicket(id, UpdateTicketRequest(vehicleNumber, mobileNumber))
    }

    suspend fun voidTicket(id: String, reason: String?): Result<Unit> = wrap {
        api.voidTicket(id, VoidRequest(reason))
    }

    suspend fun timeline(id: String): Result<TimelineResponse> = wrap { api.timeline(id) }

    suspend fun photos(id: String): Result<PhotosResponse> = wrap { api.photos(id) }

    suspend fun setAutoAllocate(enabled: Boolean): Result<Unit> = wrap {
        api.setAutoAllocate(AutoAllocateRequest(enabled))
    }

    private suspend fun <T> wrap(block: suspend () -> T): Result<T> = try {
        Result.success(block())
    } catch (t: Throwable) {
        Result.failure(t.toApiException(gson))
    }
}
