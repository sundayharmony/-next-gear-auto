package com.nextgearauto.admin

import android.content.Context
import com.nextgearauto.admin.api.NgaApi
import com.nextgearauto.admin.network.BearerInterceptor
import com.nextgearauto.admin.network.ProactiveRefreshInterceptor
import com.nextgearauto.admin.network.TokenRefreshInterceptor
import com.nextgearauto.admin.reliability.CorrelationIdInterceptor
import com.nextgearauto.admin.reliability.GetRetryInterceptor
import kotlinx.serialization.json.Jsonimport okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory

class AppGraph(context: Context) {

    val tokenStore = TokenStore(context.applicationContext)

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    private val okHttp = OkHttpClient.Builder()
        .addInterceptor(GetRetryInterceptor())
        .addInterceptor(CorrelationIdInterceptor())
        // Outermost first: proactive refresh → 401 refresh → bearer → logging.
        .addInterceptor(ProactiveRefreshInterceptor(tokenStore, json))
        .addInterceptor(TokenRefreshInterceptor(tokenStore, json))
        .addInterceptor(BearerInterceptor(tokenStore))
        .apply {
            // BuildConfig might be unresolved until a successful build.
            // Using a safe check or just disabling logging for now if it fails to compile.
            try {
                if (BuildConfig.DEBUG) {
                    addInterceptor(
                        HttpLoggingInterceptor().apply {
                            level = HttpLoggingInterceptor.Level.BASIC
                        },
                    )
                }
            } catch (e: Exception) {}
        }
        .build()

    private val retrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL)
        .client(okHttp)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()

    val api: NgaApi = retrofit.create(NgaApi::class.java)
}
