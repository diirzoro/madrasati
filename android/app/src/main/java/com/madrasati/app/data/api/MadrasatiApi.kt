package com.madrasati.app.data.api

import com.madrasati.app.data.model.AcademicLanguage
import com.madrasati.app.data.model.AdmissionApplication
import com.madrasati.app.data.model.AdvertisementsResponse
import com.madrasati.app.data.model.AvailabilityCheck
import com.madrasati.app.data.model.Booking
import com.madrasati.app.data.model.Country
import com.madrasati.app.data.model.CreateApplicationRequest
import com.madrasati.app.data.model.CreateBookingRequest
import com.madrasati.app.data.model.Curriculum
import com.madrasati.app.data.model.District
import com.madrasati.app.data.model.Grade
import com.madrasati.app.data.model.Governorate
import com.madrasati.app.data.model.HeroSlidesResponse
import com.madrasati.app.data.model.LoginRequest
import com.madrasati.app.data.model.Neighborhood
import com.madrasati.app.data.model.Offering
import com.madrasati.app.data.model.Organization
import com.madrasati.app.data.model.OrganizationListResponse
import com.madrasati.app.data.model.RegisterRequest
import com.madrasati.app.data.model.SessionResponse
import com.madrasati.app.data.model.Stage
import com.madrasati.app.data.model.Subject
import com.madrasati.app.data.model.Teacher
import com.madrasati.app.data.model.TeacherListResponse
import com.madrasati.app.data.model.UserDto
import kotlinx.serialization.json.JsonObject
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface MadrasatiApi {

    // ---------- auth ----------
    @POST("api/auth/login")
    suspend fun login(@Body body: LoginRequest): UserDto

    @POST("api/auth/register")
    suspend fun register(@Body body: RegisterRequest): UserDto

    @POST("api/auth/logout")
    suspend fun logout(): JsonObject

    @GET("api/auth/session")
    suspend fun session(): SessionResponse

    @GET("api/auth/me")
    suspend fun me(): UserDto

    @GET("api/auth/check-email")
    suspend fun checkEmail(@Query("email") email: String): AvailabilityCheck

    // ---------- organizations ----------
    @GET("api/organizations")
    suspend fun listOrganizations(
        @Query("type") type: String? = null,
        @Query("governorate") governorate: String? = null,
        @Query("district") district: String? = null,
        @Query("neighborhood") neighborhood: String? = null,
        @Query("search") search: String? = null,
        @Query("page") page: Int? = null,
        @Query("limit") limit: Int? = null,
    ): OrganizationListResponse

    @GET("api/organizations/{id}")
    suspend fun getOrganization(@Path("id") id: String): Organization

    // ---------- academic catalog ----------
    @GET("api/academic/stages")
    suspend fun stages(): List<Stage>

    @GET("api/academic/grades")
    suspend fun grades(@Query("stageId") stageId: String? = null): List<Grade>

    @GET("api/academic/subjects")
    suspend fun subjects(): List<Subject>

    @GET("api/academic/curricula")
    suspend fun curricula(): List<Curriculum>

    @GET("api/academic/languages")
    suspend fun languages(): List<AcademicLanguage>

    @GET("api/academic/org/{orgId}/offering/public")
    suspend fun offeringPublic(@Path("orgId") orgId: String): Offering

    // ---------- teachers ----------
    @GET("api/teachers")
    suspend fun listTeachers(
        @Query("organizationId") organizationId: String? = null,
        @Query("subjectId") subjectId: Long? = null,
        @Query("stageId") stageId: String? = null,
        @Query("search") search: String? = null,
        @Query("governorateId") governorateId: Long? = null,
        @Query("offset") offset: Int? = null,
        @Query("limit") limit: Int? = null,
    ): TeacherListResponse

    @GET("api/teachers/{id}")
    suspend fun getTeacher(@Path("id") id: String): Teacher

    // ---------- locations ----------
    @GET("api/locations/countries")
    suspend fun countries(): List<Country>

    @GET("api/locations/governorates")
    suspend fun governorates(): List<Governorate>

    @GET("api/locations/districts")
    suspend fun districts(@Query("governorateId") governorateId: Long? = null): List<District>

    @GET("api/locations/neighborhoods")
    suspend fun neighborhoods(@Query("districtId") districtId: Long? = null): List<Neighborhood>

    // ---------- marketing ----------
    @GET("api/hero-slides")
    suspend fun heroSlides(@Query("placement") placement: String = "public_hero"): HeroSlidesResponse

    @GET("api/advertisements")
    suspend fun advertisements(
        @Query("placement") placement: String = "ticker",
        @Query("limit") limit: Int = 6,
    ): AdvertisementsResponse

    // ---------- bookings ----------
    @GET("api/bookings")
    suspend fun bookings(@Query("status") status: String? = null): List<Booking>

    @POST("api/bookings")
    suspend fun createBooking(@Body body: CreateBookingRequest): Booking

    // ---------- admissions ----------
    @GET("api/admissions")
    suspend fun applications(): List<AdmissionApplication>

    @POST("api/admissions")
    suspend fun createApplication(@Body body: CreateApplicationRequest): AdmissionApplication
}
