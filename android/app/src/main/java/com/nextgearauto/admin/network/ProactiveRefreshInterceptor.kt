package com.nextgearauto.admin.network

import com.nextgearauto.admin.TokenStore
import kotlinx.serialization.json.Json
import okhttp3.Interceptor
import okhttp3.Response

private const val PROACTIVE_BUFFER_MS = 120_000L // refresh ~2 min before expiry

/**
 * Refreshes the access token shortly before JWT expiry so fewer requests hit 401.
 */
class ProactiveRefreshInterceptor(
    private val tokenStore: TokenStore,
    private val json: Json,
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        if (tokenStore.hasAccessToken() && tokenStore.isAccessExpiringWithin(PROACTIVE_BUFFER_MS)) {
            synchronized(ngaRefreshLock) {
                if (tokenStore.hasAccessToken() && tokenStore.isAccessExpiringWithin(PROACTIVE_BUFFER_MS)) {
                    executeTokenRefresh(tokenStore, json)
                }
            }
        }
        return chain.proceed(chain.request())
    }
}
