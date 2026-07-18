package ai.instapark.valet.data.remote

import ai.instapark.valet.data.remote.dto.ApiErrorBody
import com.google.gson.Gson
import retrofit2.HttpException

class ApiException(val code: String, message: String, val httpStatus: Int) : Exception(message)

fun Throwable.toApiException(gson: Gson): ApiException {
    if (this is HttpException) {
        val raw = response()?.errorBody()?.string()
        val parsed = raw?.let { runCatching { gson.fromJson(it, ApiErrorBody::class.java) }.getOrNull() }
        return ApiException(
            code = parsed?.error?.code ?: "http_error",
            message = parsed?.error?.message ?: (message() ?: "Something went wrong."),
            httpStatus = code(),
        )
    }
    return ApiException(code = "network_error", message = message ?: "Network error", httpStatus = -1)
}
