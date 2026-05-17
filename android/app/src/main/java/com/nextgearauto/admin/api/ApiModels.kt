package com.nextgearauto.admin.api

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class LoginRequest(
    val action: String = "login",
    val email: String,
    val password: String,
    val client: String = "native",
)

@Serializable
data class LoginResponse(
    val success: Boolean,
    val data: UserDto? = null,
    val tokens: TokenBundleDto? = null,
    val message: String? = null,
)

@Serializable
data class UserDto(
    val id: String,
    val email: String? = null,
    val name: String? = null,
    val role: String? = null,
)

@Serializable
data class TokenBundleDto(
    val accessToken: String,
    val refreshToken: String,
    val tokenType: String? = null,
    val expiresIn: Int? = null,
)

@Serializable
data class RefreshRequest(
    val refreshToken: String,
    val client: String = "native",
)

@Serializable
data class RefreshResponse(
    val success: Boolean,
    val tokens: TokenBundleDto? = null,
    val message: String? = null,
)

@Serializable
data class BookingsListResponse(
    val success: Boolean,
    val data: List<BookingListItemDto> = emptyList(),
    val message: String? = null,
)

@Serializable
data class BookingDetailResponse(
    val success: Boolean,
    val data: BookingDetailDto? = null,
    val message: String? = null,
)

@Serializable
data class BookingDetailDto(
    val id: String,
    @SerialName("customer_name") val customer_name: String? = null,
    @SerialName("customer_email") val customer_email: String? = null,
    @SerialName("customer_phone") val customer_phone: String? = null,
    val status: String? = null,
    @SerialName("pickup_date") val pickup_date: String? = null,
    @SerialName("return_date") val return_date: String? = null,
    @SerialName("pickup_time") val pickup_time: String? = null,
    @SerialName("return_time") val return_time: String? = null,
    @SerialName("total_price") val total_price: Double? = null,
    val deposit: Double? = null,
    @SerialName("vehicle_id") val vehicle_id: String? = null,
    @SerialName("vehicle_name") val vehicle_name: String? = null,
    @SerialName("agreement_signed_at") val agreement_signed_at: String? = null,
    @SerialName("rental_agreement_url") val rental_agreement_url: String? = null,
    @SerialName("admin_notes") val admin_notes: String? = null,
    @SerialName("payment_method") val payment_method: String? = null,
    @SerialName("id_document_url") val id_document_url: String? = null,
    @SerialName("insurance_proof_url") val insurance_proof_url: String? = null,
)

@Serializable
data class BookingPaymentsResponse(
    val success: Boolean,
    val data: List<BookingPaymentRowDto> = emptyList(),
    val message: String? = null,
)

@Serializable
data class BookingPaymentRowDto(
    val id: String,
    @SerialName("booking_id") val booking_id: String? = null,
    val amount: Double,
    val method: String,
    val note: String? = null,
    @SerialName("received_at") val received_at: String? = null,
)

@Serializable
data class CreatePaymentRequest(
    @SerialName("booking_id") val booking_id: String,
    val amount: Double,
    val method: String,
    val note: String? = null,
)

@Serializable
data class CreatePaymentResponse(
    val success: Boolean,
    val data: CreatePaymentDataDto? = null,
    val message: String? = null,
)

@Serializable
data class CreatePaymentDataDto(
    val id: String? = null,
    @SerialName("new_deposit") val new_deposit: Double? = null,
)

@Serializable
data class PatchBookingRequest(
    val bookingId: String,
    val status: String,
)

@Serializable
data class PatchBookingResponse(
    val success: Boolean,
    val message: String? = null,
)

@Serializable
data class UploadDocumentResponse(
    val success: Boolean,
    val url: String? = null,
    val error: String? = null,
    val message: String? = null,
)

@Serializable
data class BookingListItemDto(
    val id: String,
    @SerialName("customer_name") val customer_name: String? = null,
    @SerialName("customer_email") val customer_email: String? = null,
    val status: String? = null,
    @SerialName("pickup_date") val pickup_date: String? = null,
    @SerialName("return_date") val return_date: String? = null,
    @SerialName("vehicleName") val vehicleName: String? = null,
    val customerName: String? = null,
    @SerialName("is_overdue") val is_overdue: Boolean? = null,
) {
    fun displayCustomer(): String = customerName ?: customer_name ?: "—"

    fun displayVehicle(): String = vehicleName ?: "—"
}

@Serializable
data class AdminVehicleDto(
    val id: String,
    val year: Int = 0,
    val make: String = "",
    val model: String = "",
    val maintenanceStatus: String? = null,
    val dailyRate: Double? = null,
)

@Serializable
data class AdminVehiclesListResponse(
    val success: Boolean,
    val data: List<AdminVehicleDto> = emptyList(),
    val message: String? = null,
)
