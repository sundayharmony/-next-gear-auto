package com.nextgearauto.admin.network

import com.nextgearauto.admin.TokenStore
import okhttp3.Interceptor
import okhttp3.Response

/** Adds `Authorization: Bearer` when an access token exists and none was set manually. */
class BearerInterceptor(
    private val tokenStore: TokenStore,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val token = tokenStore.getAccessToken()
        val req = chain.request()
        val needsBearer =
            !token.isNullOrBlank() &&
                req.header("Authorization").isNullOrBlank()
        val next = if (needsBearer) {
            req.newBuilder().header("Authorization", "Bearer $token").build()
        } else {
            req
        }
        return chain.proceed(next)
    }
}
