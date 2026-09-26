package com.madrasati.app.ui.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.madrasati.app.data.Result
import com.madrasati.app.data.model.Advertisement
import com.madrasati.app.data.model.HeroSlide
import com.madrasati.app.data.model.Organization
import com.madrasati.app.data.model.Teacher
import com.madrasati.app.data.repository.CatalogRepository
import com.madrasati.app.data.repository.OrganizationFilters
import com.madrasati.app.data.repository.TeacherFilters
import kotlinx.coroutines.async
import kotlinx.coroutines.launch

class HomeViewModel(private val repo: CatalogRepository) : ViewModel() {

    var slides by mutableStateOf<List<HeroSlide>>(emptyList())
        private set
    var ads by mutableStateOf<List<Advertisement>>(emptyList())
        private set
    var orgs by mutableStateOf<List<Organization>>(emptyList())
        private set
    var teachers by mutableStateOf<List<Teacher>>(emptyList())
        private set
    var loading by mutableStateOf(true)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    init {
        load()
    }

    fun load() {
        loading = true
        error = null
        viewModelScope.launch {
            val slidesDeferred = async { repo.heroSlides() }
            val adsDeferred = async { repo.advertisements() }
            val orgsDeferred = async { repo.listOrganizations(OrganizationFilters(limit = 6)) }
            val teachersDeferred = async { repo.listTeachers(TeacherFilters(limit = 6)) }

            val slides = slidesDeferred.await()
            val ads = adsDeferred.await()
            val orgs = orgsDeferred.await()
            val teachers = teachersDeferred.await()

            this@HomeViewModel.slides = (slides as? Result.Success)?.data?.slides ?: emptyList()
            this@HomeViewModel.ads = (ads as? Result.Success)?.data?.items ?: emptyList()
            this@HomeViewModel.orgs = (orgs as? Result.Success)?.data?.items ?: emptyList()
            this@HomeViewModel.teachers = (teachers as? Result.Success)?.data?.items ?: emptyList()

            val firstError = listOf(slides, ads, orgs, teachers)
                .filterIsInstance<Result.Failure>()
                .firstOrNull()
            if (firstError != null) {
                this@HomeViewModel.error = firstError.message
            }
            this@HomeViewModel.loading = false
        }
    }
}
