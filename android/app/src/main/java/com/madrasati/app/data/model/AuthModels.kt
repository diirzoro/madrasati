package com.madrasati.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class UserDto(
    val id: String,
    val name: String? = null,
    val email: String? = null,
    val role: String? = "client",
    val phone: String? = null,
    val status: String? = "active",
    val organizationId: String? = null,
    val organizationName: String? = null,
    val organizationType: String? = null,
    val organizationVerified: Boolean? = null,
    val membershipRole: String? = null,
    val membershipStatus: String? = null,
    val teacherKind: String? = null,
    val isProtected: Boolean? = false,
    val createdAt: String? = null,
    val updatedAt: String? = null,
)

@Serializable
data class LoginRequest(
    val email: String,
    val password: String,
)

@Serializable
data class RegisterRequest(
    val name: String,
    val email: String,
    val password: String,
    val phone: String? = null,
    val phoneCountryCode: String? = null,
    val countryIso: String? = null,
    val profile: RegisterProfile? = null,
)

@Serializable
data class RegisterProfile(
    val countryCode: String? = null,
    val governorateId: String? = null,
    val districtId: String? = null,
    val phoneCountryCode: String? = null,
)

@Serializable
data class SessionResponse(
    val hasSession: Boolean = false,
)

@Serializable
data class AvailabilityCheck(
    val available: Boolean = false,
    val reason: String? = null,
)
