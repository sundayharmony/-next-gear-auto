package com.nextgearauto.admin

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.nextgearauto.admin.navigation.AdminAppShell
import com.nextgearauto.admin.ui.auth.LoginScreen

@Composable
fun AppRoot() {
    val graph = LocalAppGraph.current
    var loggedIn by remember { mutableStateOf(graph.tokenStore.hasAccessToken()) }

    if (!loggedIn) {
        LoginScreen(onLoggedIn = { loggedIn = true })
    } else {
        AdminAppShell(onLogout = {
            graph.tokenStore.clear()
            loggedIn = false
        })
    }
}
