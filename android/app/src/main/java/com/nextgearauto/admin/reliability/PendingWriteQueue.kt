package com.nextgearauto.admin.reliability

/**
 * Future: enqueue failed mutations (PATCH, POST payment) for replay when online.
 * No-op default keeps MVP simple; wire WorkManager here when product requires offline writes.
 */
interface PendingWriteQueue {
    fun enqueue(tag: String, block: suspend () -> Unit)
}

object NoOpPendingWriteQueue : PendingWriteQueue {
    override fun enqueue(tag: String, block: suspend () -> Unit) {
        /* intentionally empty */
    }
}
