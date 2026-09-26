package com.madrasati.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class Country(
    val id: Long,
    val code: String? = null,
    val name: String? = null,
    val nameEn: String? = null,
    val callingCode: String? = null,
    val isDefault: Boolean = false,
    val isActive: Boolean = true,
    val sortOrder: Int? = 0,
)

@Serializable
data class Governorate(
    val id: Long,
    val code: String? = null,
    val pcode: String? = null,
    val name: String? = null,
    val nameEn: String? = null,
    @Serializable(with = FlexDoubleSerializer::class) val latitude: Double? = null,
    @Serializable(with = FlexDoubleSerializer::class) val longitude: Double? = null,
    val countryCode: String? = null,
)

@Serializable
data class District(
    val id: Long,
    val governorateId: Long? = null,
    val code: String? = null,
    val pcode: String? = null,
    val name: String? = null,
    val nameEn: String? = null,
    @Serializable(with = FlexDoubleSerializer::class) val latitude: Double? = null,
    @Serializable(with = FlexDoubleSerializer::class) val longitude: Double? = null,
)

@Serializable
data class Neighborhood(
    val id: Long,
    val districtId: Long? = null,
    val code: String? = null,
    val name: String? = null,
    val nameEn: String? = null,
    @Serializable(with = FlexDoubleSerializer::class) val latitude: Double? = null,
    @Serializable(with = FlexDoubleSerializer::class) val longitude: Double? = null,
)
