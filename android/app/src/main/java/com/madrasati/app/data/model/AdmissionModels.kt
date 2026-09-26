package com.madrasati.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class AdmissionApplication(
    val id: String,
    val userId: String? = null,
    val organizationId: String? = null,
    val applicantName: String? = null,
    val applicantPhone: String? = null,
    val applicantEmail: String? = null,
    val stageId: String? = null,
    val gradeId: String? = null,
    val programName: String? = null,
    val notes: String? = null,
    val status: String? = null,
    val submittedAt: String? = null,
    val reviewedAt: String? = null,
    val reviewedByUserId: String? = null,
    val decisionReason: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null,
)

@Serializable
data class CreateApplicationRequest(
    val organizationId: String,
    val studentName: String,
    val phone: String? = null,
    val email: String? = null,
    val stageId: String? = null,
    val gradeId: String? = null,
    val programName: String? = null,
    val notes: String? = null,
)
