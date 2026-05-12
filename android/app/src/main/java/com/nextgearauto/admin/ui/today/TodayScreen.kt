package com.nextgearauto.admin.ui.today

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.nextgearauto.admin.ui.bookings.BookingRowCard

@Composable
fun TodayScreen(
    state: TodayUiState,
    onRetry: () -> Unit,
    onBookingClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    when (state) {
        TodayUiState.Loading -> {
            Box(
                modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator()
            }
        }

        is TodayUiState.Error -> {
            Column(
                modifier
                    .fillMaxSize()
                    .padding(24.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(state.message, color = MaterialTheme.colorScheme.error)
                Button(onClick = onRetry, modifier = Modifier.padding(top = 16.dp)) {
                    Text("Retry")
                }
            }
        }

        is TodayUiState.Success -> {
            val b = state.buckets
            if (b.overdue.isEmpty() && b.pickupsReturns.isEmpty() && b.spanningToday.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Nothing scheduled for today.")
                }
            } else {
                LazyColumn(
                    modifier = modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    if (b.overdue.isNotEmpty()) {
                        item {
                            Text(
                                "Overdue",
                                style = MaterialTheme.typography.titleMedium,
                                modifier = Modifier.padding(bottom = 8.dp),
                            )
                        }
                        items(b.overdue, key = { it.id }) { row ->
                            BookingRowCard(row = row, onClick = { onBookingClick(row.id) })
                        }
                    }
                    if (b.pickupsReturns.isNotEmpty()) {
                        item {
                            Text(
                                "Pickup / return today",
                                style = MaterialTheme.typography.titleMedium,
                                modifier = Modifier.padding(top = 8.dp, bottom = 8.dp),
                            )
                        }
                        items(b.pickupsReturns, key = { it.id }) { row ->
                            BookingRowCard(row = row, onClick = { onBookingClick(row.id) })
                        }
                    }
                    if (b.spanningToday.isNotEmpty()) {
                        item {
                            Text(
                                "On rent today",
                                style = MaterialTheme.typography.titleMedium,
                                modifier = Modifier.padding(top = 8.dp, bottom = 8.dp),
                            )
                        }
                        items(b.spanningToday, key = { it.id }) { row ->
                            BookingRowCard(row = row, onClick = { onBookingClick(row.id) })
                        }
                    }
                }
            }
        }
    }
}
