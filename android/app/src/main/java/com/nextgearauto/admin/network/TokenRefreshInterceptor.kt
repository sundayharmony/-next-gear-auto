package com.nextgearauto.admin.network

import com.nextgearauto.admin.TokenStore
import kotlinx.serialization.json.Json
import okhttp3.Interceptor
import okhttp3.Response

/**
 * On HTTP 401, rotates tokens via POST `/api/auth/refresh` and retries once.
 */
class TokenRefreshInterceptor(
    private val tokenStore: TokenStore,
    private val json: Json,
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        var response = chain.proceed(request)

        if (response.code != 401) return response
        if (!shouldAttemptRefresh(request)) return response

        response.close()

        synchronized(ngaRefreshLock) {
            if (!executeTokenRefresh(tokenStore, json)) {
                tokenStore.clear()
                val withoutAuth = request.newBuilder().removeHeader("Authorization").build()
                return chain.proceed(withoutAuth)
            }
        }

        val retry = request.newBuilder()
            .removeHeader("Authorization")
            .header(HEADER_AFTER_REFRESH, "1")
            .build()
        return chain.proceed(retry)
    }

    private fun shouldAttemptRefresh(request: okhttp3.Request): Boolean {
        if (request.header(HEADER_AFTER_REFRESH) != null) return false
        val path = request.url.encodedPath
        if (path.endsWith("/api/auth/refresh")) return false
        if (request.method == "POST" && path == "/api/auth") return false
        return true
    }

    companion object {
        private const val HEADER_AFTER_REFRESH = "X-NGA-After-Refresh"
    }
}
