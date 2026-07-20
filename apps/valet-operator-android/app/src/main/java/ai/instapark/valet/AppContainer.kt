package ai.instapark.valet

import ai.instapark.valet.data.local.ThemeStore
import ai.instapark.valet.data.local.TokenStore
import ai.instapark.valet.data.remote.AuthInterceptor
import ai.instapark.valet.data.remote.ParkingAdminApi
import ai.instapark.valet.data.remote.SessionTokenHolder
import ai.instapark.valet.data.repository.DashboardRepository
import ai.instapark.valet.data.repository.NotificationsRepository
import ai.instapark.valet.data.repository.PushTokenRepository
import ai.instapark.valet.data.repository.QueueRepository
import ai.instapark.valet.data.repository.SessionRepository
import ai.instapark.valet.data.repository.VehiclesRepository
import android.content.Context
import com.google.gson.Gson
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

/**
 * Hand-rolled dependency container (no Hilt) -- kept deliberately simple for a
 * single-Application-scoped graph. Revisit if the dependency graph grows past what's
 * comfortable to wire by hand.
 */
class AppContainer(context: Context) {
    val tokenStore = TokenStore(context)
    val themeStore = ThemeStore(context)
    private val sessionTokenHolder = SessionTokenHolder()
    private val gson = Gson()

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(AuthInterceptor(sessionTokenHolder))
        .addInterceptor(HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC })
        .build()

    private val retrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create(gson))
        .build()

    private val api = retrofit.create(ParkingAdminApi::class.java)

    val sessionRepository = SessionRepository(api, tokenStore, sessionTokenHolder, gson)
    val dashboardRepository = DashboardRepository(api, gson)
    val vehiclesRepository = VehiclesRepository(api, gson)
    val queueRepository = QueueRepository(api, gson)
    val notificationsRepository = NotificationsRepository(api, gson)
    val pushTokenRepository = PushTokenRepository(api, gson)
}
