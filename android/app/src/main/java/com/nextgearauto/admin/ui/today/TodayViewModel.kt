package com.nextgearauto.admin.ui.today

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.nextgearauto.admin.api.BookingListItemDto
import com.nextgearauto.admin.api.NgaApi
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.time.LocalDate

data class TodayBuckets(
    val overdue: List<BookingListItemDto>,
    val pickupsReturns: List<BookingListItemDto>,
    val spanningToday: List<BookingListItemDto>,
)

class TodayViewModel(
    private val api: NgaApi,
) : ViewModel() {

    var uiState: TodayUiState by mutableStateOf(TodayUiState.Loading)
        private set

    fun load() {
        viewModelScope.launch {
            uiState = TodayUiState.Loading
            uiState = try {
                val todayStr = LocalDate.now().toString()
                coroutineScope {
                    val overlapDef = async {
                        api.listBookings(perPage = 150, from = todayStr, to = todayStr)
                    }
                    val activeDef = async {
                        api.listBookings(perPage = 150, status = "active")
                    }
                    val overlapResp = overlapDef.await()
                    val activeResp = activeDef.await()
                    if (!overlapResp.success || !activeResp.success) {
                        return@coroutineScope TodayUiState.Error(
                            overlapResp.message ?: activeResp.message ?: "Failed to load",
                        )
                    }
                    TodayUiState.Success(
                        partitionToday(overlapResp.data, activeResp.data, todayStr),
                    )
                }
            } catch (e: HttpException) {
                TodayUiState.Error("HTTP ${e.code()}")
            } catch (e: Exception) {
                TodayUiState.Error(e.message ?: "Error")
            }
        }
    }

    companion object {
        fun Factory(api: NgaApi): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                return TodayViewModel(api) as T
            }
        }

        fun partitionToday(
            overlap: List<BookingListItemDto>,
            active: List<BookingListItemDto>,
            today: String,
        ): TodayBuckets {
            val overdue = active.filter {
                it.status == "active" && it.is_overdue == true
            }.distinctBy { it.id }

            val overdueIds = overdue.map { it.id }.toSet()
            val pickupsReturns = overlap.filter {
                it.pickup_date == today || it.return_date == today
            }.distinctBy { it.id }

            val prIds = pickupsReturns.map { it.id }.toSet()
            val spanning = overlap.filter {
                it.id !in prIds && it.id !in overdueIds
            }.distinctBy { it.id }

            return TodayBuckets(
                overdue = overdue,
                pickupsReturns = pickupsReturns,
                spanningToday = spanning,
            )
        }
    }
}

sealed interface TodayUiState {
    data object Loading : TodayUiState
    data class Success(val buckets: TodayBuckets) : TodayUiState
    data class Error(val message: String) : TodayUiState
}
