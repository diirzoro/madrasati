package com.madrasati.app.ui.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.madrasati.app.data.Result
import com.madrasati.app.data.model.Governorate
import com.madrasati.app.data.model.Organization
import com.madrasati.app.data.model.Stage
import com.madrasati.app.data.model.Subject
import com.madrasati.app.data.model.Teacher
import com.madrasati.app.data.repository.CatalogRepository
import com.madrasati.app.data.repository.OrganizationFilters
import com.madrasati.app.data.repository.TeacherFilters
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

enum class SearchTab { SCHOOLS, TEACHERS }

class SearchViewModel(private val repo: CatalogRepository) : ViewModel() {

    var tab by mutableStateOf(SearchTab.SCHOOLS)
    var query by mutableStateOf("")

    // School filters
    var orgType by mutableStateOf<String?>(null)
    var governorateCode by mutableStateOf<String?>(null)
    var districtCode by mutableStateOf<String?>(null)

    // Teacher filters
    var subjectId by mutableStateOf<Long?>(null)
    var stageId by mutableStateOf<String?>(null)

    var orgs by mutableStateOf<List<Organization>>(emptyList())
        private set
    var orgTotal by mutableStateOf(0)
        private set
    var teachers by mutableStateOf<List<Teacher>>(emptyList())
        private set
    var teacherTotal by mutableStateOf(0)
        private set
    var subjects by mutableStateOf<List<Subject>>(emptyList())
        private set
    var stages by mutableStateOf<List<Stage>>(emptyList())
        private set
    var governorates by mutableStateOf<List<Governorate>>(emptyList())
        private set

    var loading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    private var searchJob: Job? = null

    init {
        loadCatalogs()
        search()
    }

    private fun loadCatalogs() {
        viewModelScope.launch {
            when (val r = repo.subjects()) {
                is Result.Success -> subjects = r.data
                else -> Unit
            }
            when (val r = repo.stages()) {
                is Result.Success -> stages = r.data
                else -> Unit
            }
            when (val r = repo.governorates()) {
                is Result.Success -> governorates = r.data
                else -> Unit
            }
        }
    }

    fun onQueryChange(value: String) {
        query = value
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(400)
            search()
        }
    }

    fun search() {
        loading = true
        error = null
        viewModelScope.launch {
            when (tab) {
                SearchTab.SCHOOLS -> {
                    when (val r = repo.listOrganizations(
                        OrganizationFilters(
                            type = orgType,
                            governorate = governorateCode,
                            district = districtCode,
                            search = query.ifBlank { null },
                            limit = 50,
                        )
                    )) {
                        is Result.Success -> {
                            orgs = r.data.items
                            orgTotal = r.data.total
                        }
                        is Result.Failure -> error = r.message
                    }
                }
                SearchTab.TEACHERS -> {
                    when (val r = repo.listTeachers(
                        TeacherFilters(
                            subjectId = subjectId,
                            stageId = stageId,
                            search = query.ifBlank { null },
                            limit = 50,
                        )
                    )) {
                        is Result.Success -> {
                            teachers = r.data.items
                            teacherTotal = r.data.total
                        }
                        is Result.Failure -> error = r.message
                    }
                }
            }
            loading = false
        }
    }

    fun selectOrgType(value: String?) {
        orgType = value
        search()
    }

    fun selectGovernorate(value: String?) {
        governorateCode = value
        search()
    }

    fun selectDistrict(value: String?) {
        districtCode = value
        search()
    }

    fun selectSubject(value: Long?) {
        subjectId = value
        search()
    }

    fun selectStage(value: String?) {
        stageId = value
        search()
    }

    fun selectTab(newTab: SearchTab) {
        if (tab == newTab) return
        tab = newTab
        search()
    }

    fun clearFilters() {
        orgType = null
        governorateCode = null
        districtCode = null
        subjectId = null
        stageId = null
        query = ""
        search()
    }
}
