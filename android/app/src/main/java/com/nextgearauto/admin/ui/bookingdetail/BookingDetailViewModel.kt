package com.nextgearauto.admin.ui.bookingdetail

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.nextgearauto.admin.TokenStore
import com.nextgearauto.admin.api.BookingDetailDto
import com.nextgearauto.admin.api.BookingPaymentRowDto
import com.nextgearauto.admin.api.CreatePaymentRequest
import com.nextgearauto.admin.api.NgaApi
import com.nextgearauto.admin.api.PatchBookingRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import retrofit2.HttpException

class BookingDetailViewModel(
    private val bookingId: String,
    private val api: NgaApi,
    private val tokenStore: TokenStore,
) : ViewModel() {

    var uiState: BookingDetailUiState by mutableStateOf(BookingDetailUiState.Loading)
        private set

    var paymentError: String? by mutableStateOf(null)
        private set

    var statusActionError: String? by mutableStateOf(null)
        private set

    var uploadError: String? by mutableStateOf(null)
        private set

    var busy: Boolean by mutableStateOf(false)
        private set

    fun load() {
        viewModelScope.launch {
            uiState = BookingDetailUiState.Loading
            paymentError = null
            statusActionError = null
            uploadError = null
            uiState = try {
                val detail = api.getBooking(bookingId)
                if (!detail.success || detail.data == null) {
                    BookingDetailUiState.Error(detail.message ?: "Booking not found")
                } else {
                    val payments = if (tokenStore.isAdmin()) {
                        api.listBookingPayments(bookingId).data
                    } else {
                        emptyList()
                    }
                    BookingDetailUiState.Success(
                        booking = detail.data,
                        payments = payments,
                        canRecordPayments = tokenStore.isAdmin(),
                    )
                }
            } catch (e: HttpException) {
                BookingDetailUiState.Error("HTTP ${e.code()}")
            } catch (e: Exception) {
                BookingDetailUiState.Error(e.message ?: "Failed to load")
            }
        }
    }

    fun patchStatus(newStatus: String) {
        viewModelScope.launch {
            statusActionError = null
            busy = true
            try {
                val r = api.patchBooking(PatchBookingRequest(bookingId = bookingId, status = newStatus))
                if (!r.success) {
                    statusActionError = r.message ?: "Could not update status"
                    return@launch
                }
                load()
            } catch (e: HttpException) {
                statusActionError = "HTTP ${e.code()}"
            } catch (e: Exception) {
                statusActionError = e.message ?: "Update failed"
            } finally {
                busy = false
            }
        }
    }

    fun recordPayment(amount: Double, method: String, note: String?) {
        if (!tokenStore.isAdmin()) return
        viewModelScope.launch {
            paymentError = null
            busy = true
            try {
                val r = api.createBookingPayment(
                    CreatePaymentRequest(
                        booking_id = bookingId,
                        amount = amount,
                        method = method,
                        note = note?.takeIf { it.isNotBlank() },
                    ),
                )
                if (!r.success) {
                    paymentError = r.message ?: "Could not record payment"
                    return@launch
                }
                load()
            } catch (e: HttpException) {
                paymentError = "HTTP ${e.code()}"
            } catch (e: Exception) {
                paymentError = e.message ?: "Payment failed"
            } finally {
                busy = false
            }
        }
    }

    fun uploadDocument(bytes: ByteArray, filename: String, mime: String, docType: String) {
        viewModelScope.launch {
            uploadError = null
            busy = true
            try {
                val r = withContext(Dispatchers.IO) {
                    val body = bytes.toRequestBody(mime.toMediaType())
                    val part = MultipartBody.Part.createFormData("file", filename, body)
                    val bookingRb = bookingId.toRequestBody("text/plain".toMediaType())
                    val typeRb = docType.toRequestBody("text/plain".toMediaType())
                    api.uploadBookingDocument(part, bookingRb, typeRb)
                }
                if (!r.success) {
                    uploadError = r.error ?: r.message ?: "Upload failed"
                } else {
                    load()
                }
            } catch (e: HttpException) {
                uploadError = "HTTP ${e.code()}"
            } catch (e: Exception) {
                uploadError = e.message ?: "Upload failed"
            } finally {
                busy = false
            }
        }
    }

    companion object {
        fun Factory(
            bookingId: String,
            api: NgaApi,
            tokenStore: TokenStore,
        ): ViewModelProvider.Factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                return BookingDetailViewModel(bookingId, api, tokenStore) as T
            }
        }
    }
}

sealed interface BookingDetailUiState {
    data object Loading : BookingDetailUiState
    data class Success(
        val booking: BookingDetailDto,
        val payments: List<BookingPaymentRowDto>,
        val canRecordPayments: Boolean,
    ) : BookingDetailUiState

    data class Error(val message: String) : BookingDetailUiState
}
