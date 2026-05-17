package com.nextgearauto.admin.reliability

import com.nextgearauto.admin.BuildConfig
import okhttp3.Interceptor
import okhttp3.Response
import java.util.UUID

/**
 * Adds correlation id and optional client version for server logs / tracing.
 */
class CorrelationIdInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val req = chain.request()
        val b = req.newBuilder()
        if (req.header("X-Request-Id") == null) {
            b.header("X-Request-Id", UUID.randomUUID().toString())
        }
        b.header("X-NGA-Client-Version", BuildConfig.MOBILE_CLIENT_VERSION)
        return chain.proceed(b.build())
    }
}
