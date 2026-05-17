package com.nextgearauto.admin.api

import kotlinx.serialization.json.Json
import org.junit.Assert.assertTrue
import org.junit.Test

class LoginRequestSerializationTest {
    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    @Test
    fun loginRequestIncludesActionAndClient() {
        val body = json.encodeToString(
            LoginRequest.serializer(),
            LoginRequest(email = "a@b.com", password = "secret"),
        )
        assertTrue(body.contains("\"action\":\"login\""))
        assertTrue(body.contains("\"client\":\"native\""))
    }
}
