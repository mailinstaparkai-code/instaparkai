package ai.instapark.valet.data.repository

import ai.instapark.valet.data.remote.ParkingAdminApi
import ai.instapark.valet.data.remote.dto.CreateOperatorResponse
import ai.instapark.valet.data.remote.dto.OperatorsResponse
import ai.instapark.valet.data.remote.dto.SetOperatorActiveRequest
import ai.instapark.valet.data.remote.dto.SetOperatorDailyStatusRequest
import ai.instapark.valet.data.remote.dto.SetOperatorLeaveRequest
import ai.instapark.valet.data.remote.toApiException
import com.google.gson.Gson
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody

data class OperatorFormInput(
    val username: String,
    val password: String? = null,
    val fullName: String? = null,
    val employeeId: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val drivingLicenseExpiry: String? = null,
)

class OperatorsRepository(
    private val api: ParkingAdminApi,
    private val gson: Gson,
) {
    private fun String.textBody() = toRequestBody("text/plain".toMediaTypeOrNull())
    private fun String?.optTextBody(): RequestBody? = this?.textBody()

    private suspend fun <T> wrap(block: suspend () -> T): Result<T> = try {
        Result.success(block())
    } catch (t: Throwable) {
        Result.failure(t.toApiException(gson))
    }

    suspend fun list(): Result<OperatorsResponse> = wrap { api.operators() }

    suspend fun create(input: OperatorFormInput): Result<CreateOperatorResponse> = wrap {
        api.createOperator(
            username = input.username.textBody(),
            password = (input.password ?: "").textBody(),
            fullName = input.fullName.optTextBody(),
            employeeId = input.employeeId.optTextBody(),
            email = input.email.optTextBody(),
            phone = input.phone.optTextBody(),
            drivingLicenseExpiry = input.drivingLicenseExpiry.optTextBody(),
        )
    }

    suspend fun update(id: String, input: OperatorFormInput): Result<Unit> = wrap {
        api.updateOperator(
            id = id,
            username = input.username.textBody(),
            password = input.password.optTextBody(),
            fullName = input.fullName.optTextBody(),
            employeeId = input.employeeId.optTextBody(),
            email = input.email.optTextBody(),
            phone = input.phone.optTextBody(),
            drivingLicenseExpiry = input.drivingLicenseExpiry.optTextBody(),
        )
    }

    suspend fun delete(id: String): Result<Unit> = wrap { api.deleteOperator(id) }

    suspend fun setActive(id: String, isActive: Boolean): Result<Unit> = wrap {
        api.setOperatorActive(id, SetOperatorActiveRequest(isActive))
    }

    suspend fun setDailyStatus(id: String, status: String): Result<Unit> = wrap {
        api.setOperatorDailyStatus(id, SetOperatorDailyStatusRequest(status))
    }

    suspend fun setLeave(id: String, startDate: String, endDate: String): Result<Unit> = wrap {
        api.setOperatorLeave(id, SetOperatorLeaveRequest(startDate, endDate))
    }
}
