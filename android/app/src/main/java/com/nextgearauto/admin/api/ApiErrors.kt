package com.nextgearauto.admin.api

import kotlinx.serialization.json.Json
import retrofit2.HttpException

private val errorJson = Json { ignoreUnknownKeys = true }

fun formatLoginFailure(throwable: Throwable): String {
    if (throwable is HttpException) {
        val code = throwable.code()
        val body = throwable.response()?.errorBody()?.string().orEmpty()
        val apiMessage = runCatching {
            errorJson.decodeFromString<LoginResponse>(body).message
        }.getOrNull()?.takeIf { it.isNotBlank() }
        if (apiMessage != null) return apiMessage
        if (code == 400 && body.contains("Invalid request body")) {
            return "Request failed (HTTP 400). If using rentnextgearauto.com, set ngaDebugApiUrl to https://www.rentnextgearauto.com in local.properties and rebuild."
        }
        return "HTTP $code"
    }
    val msg = throwable.message.orEmpty()
    return when {
        msg.contains("10.0.2.2") ->
            "10.0.2.2 only works on the emulator. Use ngaDebugApiUrl with your PC LAN IP or https://www.rentnextgearauto.com in android/local.properties, then rebuild."
        msg.isBlank() -> "Network error — check API URL and that the server is running."
        else -> msg
    }
}
