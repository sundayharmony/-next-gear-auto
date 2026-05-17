package com.nextgearauto.admin.reliability

import okhttp3.Interceptor
import okhttp3.Response

/**
 * Retries idempotent GETs on transient upstream failures (best-effort; server remains authoritative).
 */
class GetRetryInterceptor(
    private val maxRetries: Int = 2,
    private val retryableCodes: Set<Int> = setOf(502, 503, 504, 408),
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        var response = chain.proceed(request)
        if (request.method != "GET") return response

        var attempt = 0
        while (attempt < maxRetries && response.code in retryableCodes) {
            response.close()
            Thread.sleep(150L * (attempt + 1))
            attempt++
            response = chain.proceed(request)
        }
        return response
    }
}
