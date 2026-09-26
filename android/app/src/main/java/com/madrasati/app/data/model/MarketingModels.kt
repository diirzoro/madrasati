package com.madrasati.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class HeroSlide(
    val id: String,
    val type: String? = null,
    val source: String? = "remote",
    val titleAr: String? = "",
    val titleEn: String? = "",
    val subtitleAr: String? = "",
    val subtitleEn: String? = "",
    val badgeAr: String? = "",
    val badgeEn: String? = "",
    val image: String? = "",
    val imagePosition: String? = "center",
    val overlayTitleAr: String? = "",
    val overlayTitleEn: String? = "",
    val locationAr: String? = "",
    val locationEn: String? = "",
    val ctaLabelAr: String? = "",
    val ctaLabelEn: String? = "",
    val ctaRoute: String? = "",
    val ctaUrl: String? = "",
    val priority: Int? = 0,
    val placement: List<String> = emptyList(),
    val status: String? = null,
    val startAt: String? = null,
    val endAt: String? = null,
    val active: Boolean? = true,
    val createdAt: String? = null,
    val updatedAt: String? = null,
)

@Serializable
data class HeroSlidesResponse(
    val slides: List<HeroSlide> = emptyList(),
)

@Serializable
data class Advertisement(
    val id: String,
    val name: String? = null,
    val advertiser: String? = "",
    val organizationId: String? = null,
    val organizationName: String? = "",
    val adType: String? = null,
    val billingMode: String? = null,
    val status: String? = null,
    val placement: List<String> = emptyList(),
    val startAt: String? = null,
    val endAt: String? = null,
    val image: String? = "",
    val targetUrl: String? = "",
    val targetRoute: String? = "",
    val messageAr: String? = "",
    val messageEn: String? = "",
    val priority: Int? = 0,
    val notes: String? = "",
    val impressions: Int? = 0,
    val clicks: Int? = 0,
    val createdAt: String? = null,
    val updatedAt: String? = null,
)

@Serializable
data class AdvertisementsResponse(
    val items: List<Advertisement> = emptyList(),
)

@Serializable
data class Offer(
    val id: String,
    val organizationId: String? = null,
    val organizationName: String? = "",
    val title: String? = "",
    val titleEn: String? = "",
    val description: String? = "",
    val descriptionEn: String? = "",
    @Serializable(with = FlexDoubleSerializer::class) val discountPercent: Double? = null,
    val startAt: String? = null,
    val endAt: String? = null,
    val active: Boolean? = true,
    val createdAt: String? = null,
    val updatedAt: String? = null,
)

@Serializable
data class OffersResponse(
    val items: List<Offer> = emptyList(),
)

@Serializable
data class Fee(
    val id: String,
    val organizationId: String? = null,
    val orgName: String? = null,
    val title: String? = null,
    val description: String? = null,
    @Serializable(with = FlexDoubleSerializer::class) val amount: Double? = null,
    val currency: String? = null,
    val feeType: String? = null,
    val gradeLevel: String? = null,
    val isActive: Boolean? = true,
    val visibility: String? = null,
    val createdAt: String? = null,
)
