package com.nextgearauto.admin.ui.calendar

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.nextgearauto.admin.api.BookingListItemDto
import com.nextgearauto.admin.api.NgaApi
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.time.LocalDate

data class CalendarDaySection(
    val dateLabel: String,
    val sortKey: String,
    val bookings: List<BookingListItemDto>,
)

class CalendarViewModel(
    private val api: NgaApi,
) : ViewModel() {

    var uiState: CalendarUiState by mutableStateOf(CalendarUiState.Loading)
        private set

    /** Next [days] calendar days including today. */
    fun load(days: Long = 7L) {
        viewModelScope.launch {
            uiState = CalendarUiState.Loading
            uiState = try {
                val start = LocalDate.now()
                val end = start.plusDays(days - 1)
                val resp = api.listBookings(
                    perPage = 200,
                    from = start.toString(),
                    to = end.toString(),
                )
                if (!resp.success) {
                    CalendarUiState.Error(resp.message ?: "Failed")
                } else {
                    val sections = groupByPickupDate(resp.data)
                    CalendarUiState.Success(sections)
                }
            } catch (e: HttpException) {
                CalendarUiState.Error("HTTP ${e.code()}")
            } catch (e: Exception) {
                CalendarUiState.Error(e.message ?: "Error")
            }
        }
    }

    companion object {
        fun Factory(api: NgaApi): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                return CalendarViewModel(api) as T
            }
        }

        fun groupByPickupDate(rows: List<BookingListItemDto>): List<CalendarDaySection> {
            val byDate = rows.groupBy { it.pickup_date ?: "—" }
                .toSortedMap(compareBy { if (it == "—") "" else it })
            return byDate.map { (date, list) ->
                CalendarDaySection(
                    dateLabel = date,
                    sortKey = date,
                    bookings = list.sortedBy { it.customer_name ?: it.id },
                )
            }
        }
    }
}

sealed interface CalendarUiState {
    data object Loading : CalendarUiState
    data class Success(val sections: List<CalendarDaySection>) : CalendarUiState
    data class Error(val message: String) : CalendarUiState
}
