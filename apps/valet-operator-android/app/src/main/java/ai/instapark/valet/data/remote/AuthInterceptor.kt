package ai.instapark.valet.data.remote

import okhttp3.Interceptor
import okhttp3.Response

/** Holds the current bearer token in memory so [AuthInterceptor] can read it synchronously. */
class SessionTokenHolder {
    @Volatile
    var token: String? = null
}

class AuthInterceptor(private val tokenHolder: SessionTokenHolder) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val token = tokenHolder.token
        val request = if (token != null) {
            chain.request().newBuilder().addHeader("Authorization", "Bearer $token").build()
        } else {
            chain.request()
        }
        return chain.proceed(request)
    }
}
