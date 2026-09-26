package com.madrasati.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class Stage(
    val id: String,
    val code: String? = null,
    val name: String? = null,
    val nameEn: String? = null,
    val description: String? = null,
    val sortOrder: Int? = 0,
    val isActive: Boolean? = true,
)

@Serializable
data class Grade(
    val id: String,
    val code: String? = null,
    val name: String? = null,
    val description: String? = null,
    val track: String? = null,
    val sortOrder: Int? = 0,
    val stageId: String? = null,
    val stageName: String? = null,
    val isActive: Boolean? = true,
)

@Serializable
data class Subject(
    val id: Long,
    val name: String? = null,
    val description: String? = null,
    val scope: String? = "global",
    val organizationId: String? = null,
    val reviewStatus: String? = "approved",
    val reviewNote: String? = null,
)

@Serializable
data class Curriculum(
    val id: String,
    val name: String? = null,
    val isActive: Boolean? = true,
)

@Serializable
data class AcademicLanguage(
    val id: String,
    val name: String? = null,
    val code: String? = null,
    val isActive: Boolean? = true,
)

@Serializable
data class TeachingMethod(
    val id: String,
    val name: String? = null,
    val slug: String? = null,
    val isActive: Boolean? = true,
)

// ---------- Organization offering ----------

@Serializable
data class Offering(
    val organizationId: String,
    val pricingGated: Boolean = true,
    val stages: List<OfferingStage> = emptyList(),
    val subjects: List<OfferingSubject> = emptyList(),
)

@Serializable
data class OfferingStage(
    val stageId: String,
    val stageCode: String? = null,
    val stageName: String? = null,
    val deliveryMode: String? = null,
    val languageCode: String? = null,
    val capacity: Int? = null,
    val currentStudents: Int? = null,
    val remainingSeats: Int? = null,
    val fee: OfferingFee? = null,
)

@Serializable
data class OfferingFee(
    val id: String? = null,
    @Serializable(with = FlexDoubleSerializer::class) val amount: Double? = null,
    val currency: String? = null,
    val frequency: String? = null,
    val visibility: String? = null,
)

@Serializable
data class OfferingSubject(
    val subjectId: Long,
    val name: String? = null,
    val languageCode: String? = null,
    @Serializable(with = FlexDoubleSerializer::class) val amount: Double? = null,
    val currency: String? = null,
    val frequency: String? = null,
    val scope: String? = "global",
    val reviewStatus: String? = "approved",
)
