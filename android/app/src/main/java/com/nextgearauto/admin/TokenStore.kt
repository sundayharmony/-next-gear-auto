package com.nextgearauto.admin

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Stores JWT access + refresh tokens using AES-backed EncryptedSharedPreferences.
 */
class TokenStore(context: Context) {

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val prefs = EncryptedSharedPreferences.create(
        context,
        PREFS_NAME,
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    fun hasAccessToken(): Boolean = prefs.getString(KEY_ACCESS, null).isNullOrBlank().not()

    fun getAccessToken(): String? = prefs.getString(KEY_ACCESS, null)

    fun getRefreshToken(): String? = prefs.getString(KEY_REFRESH, null)

    fun saveTokens(
        accessToken: String,
        refreshToken: String,
        expiresInSeconds: Int? = null,
    ) {
        val expSec = expiresInSeconds ?: DEFAULT_ACCESS_EXPIRY_SEC
        val expiresAt = System.currentTimeMillis() + expSec * 1000L
        prefs.edit()
            .putString(KEY_ACCESS, accessToken)
            .putString(KEY_REFRESH, refreshToken)
            .putLong(KEY_ACCESS_EXPIRES_AT, expiresAt)
            .apply()
    }

    /** Best-effort: expiry used for proactive refresh (falls back if unset). */
    fun isAccessExpiringWithin(bufferMs: Long): Boolean {
        if (!hasAccessToken()) return false
        val exp = prefs.getLong(KEY_ACCESS_EXPIRES_AT, 0L)
        if (exp <= 0L) return false
        return System.currentTimeMillis() >= exp - bufferMs
    }

    fun saveStaffRole(role: String?) {
        val ed = prefs.edit()
        if (role.isNullOrBlank()) ed.remove(KEY_ROLE)
        else ed.putString(KEY_ROLE, role)
        ed.apply()
    }

    /** `admin`, `manager`, or null if unknown. */
    fun getStaffRole(): String? = prefs.getString(KEY_ROLE, null)

    fun isAdmin(): Boolean = getStaffRole() == "admin"

    fun clear() {
        prefs.edit().clear().apply()
    }

    companion object {
        private const val PREFS_NAME = "nga_admin_secure_prefs"
        private const val KEY_ACCESS = "access_token"
        private const val KEY_REFRESH = "refresh_token"
        private const val KEY_ACCESS_EXPIRES_AT = "access_expires_at_ms"
        private const val KEY_ROLE = "staff_role"
        private const val DEFAULT_ACCESS_EXPIRY_SEC = 3600
    }
}
