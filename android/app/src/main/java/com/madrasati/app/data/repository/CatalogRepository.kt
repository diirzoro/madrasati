package com.madrasati.app.data.repository

import com.madrasati.app.data.Result
import com.madrasati.app.data.api.MadrasatiApi
import com.madrasati.app.data.apiCall
import com.madrasati.app.data.model.AcademicLanguage
import com.madrasati.app.data.model.AdmissionApplication
import com.madrasati.app.data.model.AdvertisementsResponse
import com.madrasati.app.data.model.Booking
import com.madrasati.app.data.model.Country
import com.madrasati.app.data.model.CreateApplicationRequest
import com.madrasati.app.data.model.CreateBookingRequest
import com.madrasati.app.data.model.Curriculum
import com.madrasati.app.data.model.District
import com.madrasati.app.data.model.Grade
import com.madrasati.app.data.model.Governorate
import com.madrasati.app.data.model.HeroSlidesResponse
import com.madrasati.app.data.model.Neighborhood
import com.madrasati.app.data.model.Offering
import com.madrasati.app.data.model.Organization
import com.madrasati.app.data.model.OrganizationListResponse
import com.madrasati.app.data.model.Stage
import com.madrasati.app.data.model.Subject
import com.madrasati.app.data.model.Teacher
import com.madrasati.app.data.model.TeacherListResponse

data class OrganizationFilters(
    val type: String? = null,
    val governorate: String? = null,
    val district: String? = null,
    val neighborhood: String? = null,
    val search: String? = null,
    val page: Int? = null,
    val limit: Int? = null,
)

data class TeacherFilters(
    val organizationId: String? = null,
    val subjectId: Long? = null,
    val stageId: String? = null,
    val search: String? = null,
    val governorateId: Long? = null,
    val offset: Int? = null,
    val limit: Int? = null,
)

class CatalogRepository(private val api: MadrasatiApi) {

    suspend fun listOrganizations(filters: OrganizationFilters): Result<OrganizationListResponse> =
        apiCall {
            api.listOrganizations(
                type = filters.type,
                governorate = filters.governorate,
                district = filters.district,
                neighborhood = filters.neighborhood,
                search = filters.search,
                page = filters.page,
                limit = filters.limit,
            )
        }

    suspend fun getOrganization(id: String): Result<Organization> =
        apiCall { api.getOrganization(id) }

    suspend fun offeringPublic(orgId: String): Result<Offering> =
        apiCall { api.offeringPublic(orgId) }

    suspend fun stages(): Result<List<Stage>> = apiCall { api.stages() }

    suspend fun grades(stageId: String? = null): Result<List<Grade>> =
        apiCall { api.grades(stageId) }

    suspend fun subjects(): Result<List<Subject>> = apiCall { api.subjects() }

    suspend fun curricula(): Result<List<Curriculum>> = apiCall { api.curricula() }

    suspend fun languages(): Result<List<AcademicLanguage>> = apiCall { api.languages() }

    suspend fun listTeachers(filters: TeacherFilters): Result<TeacherListResponse> =
        apiCall {
            api.listTeachers(
                organizationId = filters.organizationId,
                subjectId = filters.subjectId,
                stageId = filters.stageId,
                search = filters.search,
                governorateId = filters.governorateId,
                offset = filters.offset,
                limit = filters.limit,
            )
        }

    suspend fun getTeacher(id: String): Result<Teacher> = apiCall { api.getTeacher(id) }

    suspend fun countries(): Result<List<Country>> = apiCall { api.countries() }

    suspend fun governorates(): Result<List<Governorate>> = apiCall { api.governorates() }

    suspend fun districts(governorateId: Long? = null): Result<List<District>> =
        apiCall { api.districts(governorateId) }

    suspend fun neighborhoods(districtId: Long? = null): Result<List<Neighborhood>> =
        apiCall { api.neighborhoods(districtId) }

    suspend fun heroSlides(): Result<HeroSlidesResponse> = apiCall { api.heroSlides() }

    suspend fun advertisements(): Result<AdvertisementsResponse> = apiCall { api.advertisements() }

    suspend fun listBookings(status: String? = null): Result<List<Booking>> =
        apiCall { api.bookings(status) }

    suspend fun createBooking(request: CreateBookingRequest): Result<Booking> =
        apiCall { api.createBooking(request) }

    suspend fun listApplications(): Result<List<AdmissionApplication>> =
        apiCall { api.applications() }

    suspend fun createApplication(request: CreateApplicationRequest): Result<AdmissionApplication> =
        apiCall { api.createApplication(request) }
}
