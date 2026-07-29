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
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File

data class CheckInPhotos(
    val front: File? = null,
    val back: File? = null,
    val left: File? = null,
    val right: File? = null,
    val odometer: File? = null,
)

class QueueRepository(
    private val api: ParkingAdminApi,
    private val gson: Gson,
) {
    private fun String.textBody() = toRequestBody("text/plain".toMediaTypeOrNull())

    private fun filePart(fieldName: String, file: File?): MultipartBody.Part? {
        if (file == null) return null
        return MultipartBody.Part.createFormData(
            fieldName,
            file.name,
            file.asRequestBody("image/jpeg".toMediaTypeOrNull())
        )
    }

    suspend fun list(status: String? = null, vehicleType: String? = null): Result<QueueResponse> = wrap {
        api.queue(status = status, vehicleType = vehicleType)
    }

    suspend fun checkIn(
        vehicleNumber: String,
        vehicleType: String,
        mobileNumber: String,
        qrCode: String? = null,
        photos: CheckInPhotos = CheckInPhotos(),
    ): Result<QueueTicket> = wrap {
        api.checkIn(
            vehicleNumber = vehicleNumber.textBody(),
            vehicleType = vehicleType.textBody(),
            mobileNumber = mobileNumber.textBody(),
            qrCode = qrCode?.textBody(),
            photoFront = filePart("photo_front", photos.front),
            photoBack = filePart("photo_back", photos.back),
            photoLeft = filePart("photo_left", photos.left),
            photoRight = filePart("photo_right", photos.right),
            photoOdometer = filePart("photo_odometer", photos.odometer),
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
        code: String,
        isQrMode: Boolean,
        fareAmount: String?,
        paymentCollected: Boolean,
        handoverPhoto: File? = null,
    ): Result<Unit> = wrap {
        api.completeHandover(
            id = id,
            otp = if (!isQrMode) code.textBody() else null,
            qrCode = if (isQrMode) code.textBody() else null,
            fareAmount = fareAmount?.textBody(),
            paymentCollected = paymentCollected.toString().textBody(),
            photoHandover = filePart("photo_handover", handoverPhoto),
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
