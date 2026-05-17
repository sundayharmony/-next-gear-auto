package com.nextgearauto.admin.ui.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.nextgearauto.admin.BuildConfig
import com.nextgearauto.admin.LocalAppGraph
import com.nextgearauto.admin.api.LoginRequest
import com.nextgearauto.admin.api.formatLoginFailure
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(onLoggedIn: () -> Unit) {
    val graph = LocalAppGraph.current
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("NGA Admin", style = MaterialTheme.typography.headlineMedium)
        Text(
            "Sign in with your staff account",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        if (BuildConfig.DEBUG) {
            val apiBase = BuildConfig.API_BASE_URL
            val emulatorOnly = apiBase.contains("10.0.2.2")
            val missingWww =
                apiBase.contains("rentnextgearauto.com") && !apiBase.contains("www.rentnextgearauto.com")
            Text(
                "API: $apiBase",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (emulatorOnly || missingWww) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer,
                    ),
                ) {
                    Text(
                        when {
                            emulatorOnly ->
                                "Physical device cannot use 10.0.2.2. Add ngaDebugApiUrl=http://YOUR_PC_IP:3000 to android/local.properties, sync Gradle, rebuild. Use npm run dev:lan on your PC."
                            else ->
                                "Use https://www.rentnextgearauto.com (with www). The bare domain redirects POST requests and login returns HTTP 400."
                        },
                        modifier = Modifier.padding(12.dp),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onErrorContainer,
                    )
                }
            }
        }

        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Email") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
        )
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Password") },
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
        )

        Button(
            onClick = {
                scope.launch {
                    loading = true
                    error = null
                    try {
                        val r = graph.api.login(
                            LoginRequest(
                                email = email.trim(),
                                password = password,
                            ),
                        )
                        if (!r.success) {
                            error = r.message ?: "Login failed"
                            return@launch
                        }
                        val t = r.tokens
                        if (t == null) {
                            error = "No tokens returned — use an admin or manager account."
                            return@launch
                        }
                        graph.tokenStore.saveTokens(
                            t.accessToken,
                            t.refreshToken,
                            t.expiresIn,
                        )
                        graph.tokenStore.saveStaffRole(r.data?.role)
                        onLoggedIn()
                    } catch (e: Exception) {
                        error = formatLoginFailure(e)
                    } finally {
                        loading = false
                    }
                }
            },
            modifier = Modifier.fillMaxWidth(),
            enabled = !loading && email.isNotBlank() && password.isNotBlank(),
        ) {
            if (loading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    strokeWidth = 2.dp,
                )
            } else {
                Text("Sign in")
            }
        }

        error?.let {
            Text(
                text = it,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall,
            )
        }
    }
}
