package com.nextgearauto.admin.domain

/**
 * Mirrors server rules in [src/lib/bookings/lifecycle.ts] for UX-only hints;
 * the API remains authoritative.
 */
object BookingLifecycle {
    private val transitions: Map<String, List<String>> = mapOf(
        "pending" to listOf("confirmed", "cancelled"),
        "confirmed" to listOf("active", "cancelled"),
        "active" to listOf("completed", "cancelled"),
        "completed" to emptyList(),
        "cancelled" to emptyList(),
    )

    fun allowedNextStatuses(current: String?): List<String> {
        if (current.isNullOrBlank()) return emptyList()
        return transitions[current] ?: emptyList()
    }

    fun labelForStatus(status: String): String = when (status) {
        "pending" -> "Pending"
        "confirmed" -> "Confirmed"
        "active" -> "Active"
        "completed" -> "Completed"
        "cancelled" -> "Cancelled"
        else -> status
    }
}
