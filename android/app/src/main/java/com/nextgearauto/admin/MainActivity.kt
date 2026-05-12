package com.nextgearauto.admin

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.material3.Surface
import androidx.compose.runtime.CompositionLocalProvider
import com.nextgearauto.admin.ui.theme.NgaAdminTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val graph = (application as NgaApplication).graph
        setContent {
            CompositionLocalProvider(LocalAppGraph provides graph) {
                NgaAdminTheme {
                    Surface {
                        AppRoot()
                    }
                }
            }
        }
    }
}
