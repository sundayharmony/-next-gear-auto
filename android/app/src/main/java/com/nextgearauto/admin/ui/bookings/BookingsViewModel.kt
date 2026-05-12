package com.nextgearauto.admin.ui.bookings

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

class BookingsViewModel(
    private val api: NgaApi,
) : ViewModel() {

    var uiState: BookingsUiState by mutableStateOf(BookingsUiState.Loading)
        private set

    fun load() {
        viewModelScope.launch {
            uiState = BookingsUiState.Loading
            uiState = try {
                val r = api.listBookings(page = 1, perPage = 50)
                if (r.success) BookingsUiState.Success(r.data)
                else BookingsUiState.Error(r.message ?: "Request failed")
            } catch (e: HttpException) {
                BookingsUiState.Error("HTTP ${e.code()}")
            } catch (e: Exception) {
                BookingsUiState.Error(e.message ?: "Network error")
            }
        }
    }

    companion object {
        fun Factory(api: NgaApi): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                return BookingsViewModel(api) as T
            }
        }
    }
}

sealed interface BookingsUiState {
    data object Loading : BookingsUiState
    data class Success(val items: List<BookingListItemDto>) : BookingsUiState
    data class Error(val message: String) : BookingsUiState
}
