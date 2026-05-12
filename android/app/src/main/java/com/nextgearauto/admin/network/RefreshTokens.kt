package com.nextgearauto.admin.network

import com.nextgearauto.admin.BuildConfig
import com.nextgearauto.admin.TokenStore
import com.nextgearauto.admin.api.RefreshRequest
import com.nextgearauto.admin.api.RefreshResponse
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

/** Shared between proactive refresh and 401 retry — single lock avoids concurrent rotations. */
internal val ngaRefreshLock = Any()

private val JSON_MEDIA = "application/json; charset=utf-8".toMediaType()

private val refreshHttpClient: OkHttpClient by lazy {
    OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()
}

internal fun refreshEndpointUrl(): String =
    "${BuildConfig.API_BASE_URL.trimEnd('/')}/api/auth/refresh"

/**
 * POST `/api/auth/refresh` with JSON body (no cookies). Updates [TokenStore] on success.
 */
internal fun executeTokenRefresh(
    tokenStore: TokenStore,
    json: Json,
): Boolean {
    val rt = tokenStore.getRefreshToken() ?: return false
    val payload = json.encodeToString(RefreshRequest.serializer(), RefreshRequest(refreshToken = rt))
    val httpReq = Request.Builder()
        .url(refreshEndpointUrl())
        .post(payload.toRequestBody(JSON_MEDIA))
        .build()
    refreshHttpClient.newCall(httpReq).execute().use { resp ->
        val bodyText = resp.body?.string() ?: return false
        if (!resp.isSuccessful) return false
        val parsed = runCatching {
            json.decodeFromString(RefreshResponse.serializer(), bodyText)
        }.getOrNull() ?: return false
        if (!parsed.success) return false
        val t = parsed.tokens ?: return false
        tokenStore.saveTokens(t.accessToken, t.refreshToken, t.expiresIn)
        return true
    }
}
