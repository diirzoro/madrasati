package com.madrasati.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class Teacher(
    val id: String,
    val userId: String? = null,
    val userName: String? = null,
    val userEmail: String? = null,
    val nameEn: String? = null,
    val avatarUrl: String? = null,
    val bio: String? = null,
    val headline: String? = null,
    val experienceYears: Int? = null,
    val skills: List<String> = emptyList(),
    val qualifications: List<Qualification> = emptyList(),
    val gender: String? = null,
    val phone: String? = null,
    val userPhone: String? = null,
    val whatsapp: String? = null,
    val countryCode: String? = null,
    val countryName: String? = null,
    val governorateId: Long? = null,
    val governorateName: String? = null,
    val districtId: Long? = null,
    val districtName: String? = null,
    val neighborhoodId: Long? = null,
    val neighborhoodName: String? = null,
    val addressLine: String? = null,
    @Serializable(with = FlexDoubleSerializer::class) val travelRadiusKm: Double? = null,
    val offersOnline: Boolean = false,
    val travelsToStudentHome: Boolean = false,
    val acceptsStudentHome: Boolean = false,
    val verified: Boolean = false,
    val verificationStatus: String? = null,
    val status: String? = null,
    val deletionRequestId: String? = null,
    val documentCount: Int? = 0,
    val isProtected: Boolean = false,
    val stages: List<TeacherStage> = emptyList(),
    val subjects: List<TeacherSubject> = emptyList(),
    val availability: List<AvailabilitySlot> = emptyList(),
    val pricingGated: Boolean = true,
    @Serializable(with = FlexDoubleSerializer::class) val hourlyRate: Double? = null,
    val currency: String? = "YER",
    val createdAt: String? = null,
    val updatedAt: String? = null,
)

@Serializable
data class TeacherSubject(
    val subjectId: Long,
    val name: String? = null,
    val slug: String? = null,
    val reviewStatus: String? = null,
    val scope: String? = "global",
    @Serializable(with = FlexDoubleSerializer::class) val amount: Double? = null,
    val currency: String? = null,
    val billingPeriod: String? = null,
    val languageCode: String? = null,
    @Serializable(with = FlexDoubleSerializer::class) val discountPercent: Double? = null,
    val promoLabel: String? = null,
    val locationMode: String? = null,
    val isActive: Boolean? = true,
)

@Serializable
data class TeacherStage(
    val id: String,
    val name: String? = null,
    val nameEn: String? = null,
)

@Serializable
data class Qualification(
    val id: String? = null,
    val title: String? = null,
    val institutionName: String? = null,
    val degree: String? = null,
    val year: Int? = null,
    val documentUrl: String? = null,
)

@Serializable
data class AvailabilitySlot(
    val id: String? = null,
    val dayOfWeek: Int = 0,
    val startTime: String? = null,
    val endTime: String? = null,
    val locationMode: String? = "online",
    val notes: String? = null,
)

@Serializable
data class TeacherListResponse(
    val items: List<Teacher> = emptyList(),
    val total: Int = 0,
    val pricingGated: Boolean = true,
)
