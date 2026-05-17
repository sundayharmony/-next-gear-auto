package com.nextgearauto.admin

import android.app.Application
import com.nextgearauto.admin.reliability.Observability

class NgaApplication : Application() {
    lateinit var graph: AppGraph
        private set

    override fun onCreate() {
        super.onCreate()
        Observability.breadcrumb("Application onCreate")
        graph = AppGraph(this)
    }
}
