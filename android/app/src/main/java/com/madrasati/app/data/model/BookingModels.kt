package com.madrasati.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class Booking(
    val id: String,
    val userId: String? = null,
    val organizationId: String? = null,
    val teacherUserId: String? = null,
    val bookingType: String? = null,
    val title: String? = null,
    val description: String? = null,
    val startTime: String? = null,
    val endTime: String? = null,
    val status: String? = null,
    @Serializable(with = FlexDoubleSerializer::class) val amount: Double? = null,
    val currency: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null,
)

@Serializable
data class CreateBookingRequest(
    val organizationId: String? = null,
    val teacherUserId: String? = null,
    val bookingType: String,
    val clientName: String? = null,
    val clientPhone: String? = null,
    val clientEmail: String? = null,
    val seats: Int? = 1,
    val subjectId: Long? = null,
    val stageId: String? = null,
    val startsAt: String? = null,
    val endsAt: String? = null,
    val notes: String? = null,
)
