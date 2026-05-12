package com.nextgearauto.admin.api

import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Query

interface NgaApi {

    @POST("api/auth")
    suspend fun login(@Body body: LoginRequest): LoginResponse

    @GET("api/bookings")
    suspend fun listBookings(
        @Query("page") page: Int? = null,
        @Query("per_page") perPage: Int? = null,
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
        @Query("status") status: String? = null,
    ): BookingsListResponse

    @GET("api/bookings")
    suspend fun getBooking(@Query("id") id: String): BookingDetailResponse

    @GET("api/admin/booking-payments")
    suspend fun listBookingPayments(@Query("booking_id") bookingId: String): BookingPaymentsResponse

    @POST("api/admin/booking-payments")
    suspend fun createBookingPayment(@Body body: CreatePaymentRequest): CreatePaymentResponse

    @PATCH("api/bookings")
    suspend fun patchBooking(@Body body: PatchBookingRequest): PatchBookingResponse

    @Multipart
    @POST("api/bookings/upload")
    suspend fun uploadBookingDocument(
        @Part file: MultipartBody.Part,
        @Part("bookingId") bookingId: RequestBody,
        @Part("type") docType: RequestBody,
    ): UploadDocumentResponse
}
