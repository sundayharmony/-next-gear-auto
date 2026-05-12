package com.nextgearauto.admin.ui.payments

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/**
 * Global “payments” tab: recording happens per booking (admin). Managers see booking totals on detail.
 */
@Composable
fun PaymentsOverviewScreen(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.padding(vertical = 8.dp),
    ) {
        Text("Payments", style = MaterialTheme.typography.headlineSmall)
        Text(
            "Record payments inside each booking (Bookings → open a row). Admin accounts can add entries that sync to deposit totals.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 12.dp),
        )
    }
}
