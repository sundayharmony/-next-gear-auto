package com.nextgearauto.admin

import androidx.compose.runtime.staticCompositionLocalOf

val LocalAppGraph = staticCompositionLocalOf<AppGraph> {
    error("LocalAppGraph not provided — wrap UI in CompositionLocalProvider")
}
