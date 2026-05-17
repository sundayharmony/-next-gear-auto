package com.nextgearauto.admin.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class BookingLifecycleTest {
    @Test
    fun confirmedIncludesNoShow() {
        assertTrue(BookingLifecycle.allowedNextStatuses("confirmed").contains("no-show"))
    }

    @Test
    fun pendingDoesNotIncludeNoShow() {
        assertEquals(
            listOf("confirmed", "cancelled"),
            BookingLifecycle.allowedNextStatuses("pending"),
        )
    }
}
