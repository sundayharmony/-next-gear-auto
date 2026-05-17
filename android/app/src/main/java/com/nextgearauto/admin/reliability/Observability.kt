package com.nextgearauto.admin.reliability

import android.util.Log
import com.nextgearauto.admin.BuildConfig

/** Debug-only breadcrumbs; swap for Crashlytics in production when wired. */
object Observability {
    private const val TAG = "NGA-Obs"

    fun breadcrumb(message: String) {
        if (BuildConfig.DEBUG) {
            Log.d(TAG, message)
        }
    }
}
