package com.madrasati.app.ui.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.madrasati.app.data.Result
import com.madrasati.app.data.model.CreateApplicationRequest
import com.madrasati.app.data.model.Grade
import com.madrasati.app.data.model.Offering
import com.madrasati.app.data.model.Organization
import com.madrasati.app.data.repository.CatalogRepository
import kotlinx.coroutines.launch

class AdmissionViewModel(
    private val repo: CatalogRepository,
    private val orgId: String,
) : ViewModel() {

    var org by mutableStateOf<Organization?>(null)
        private set
    var offering by mutableStateOf<Offering?>(null)
        private set
    var grades by mutableStateOf<List<Grade>>(emptyList())
        private set
    var loading by mutableStateOf(true)
        private set

    var studentName by mutableStateOf("")
    var phone by mutableStateOf("")
    var email by mutableStateOf("")
    var stageId by mutableStateOf<String?>(null)
    var gradeId by mutableStateOf<String?>(null)
    var programName by mutableStateOf("")
    var notes by mutableStateOf("")

    var submitting by mutableStateOf(false)
        private set
    var submitted by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            when (val r = repo.getOrganization(orgId)) {
                is Result.Success -> org = r.data
                is Result.Failure -> error = r.message
            }
            when (val r = repo.offeringPublic(orgId)) {
                is Result.Success -> offering = r.data
                is Result.Failure -> if (error == null) error = r.message
            }
            loading = false
        }
    }

    fun onStageSelected(stageId: String) {
        this.stageId = stageId
        this.gradeId = null
        grades = emptyList()
        viewModelScope.launch {
            when (val r = repo.grades(stageId)) {
                is Result.Success -> grades = r.data
                else -> Unit
            }
        }
    }

    fun submit(onDone: () -> Unit) {
        if (studentName.isBlank()) {
            error = "يرجى إدخال اسم الطالب"
            return
        }
        submitting = true
        error = null
        viewModelScope.launch {
            val request = CreateApplicationRequest(
                organizationId = orgId,
                studentName = studentName.trim(),
                phone = phone.trim().ifBlank { null },
                email = email.trim().ifBlank { null },
                stageId = stageId,
                gradeId = gradeId,
                programName = programName.trim().ifBlank { null },
                notes = notes.trim().ifBlank { null },
            )
            when (val r = repo.createApplication(request)) {
                is Result.Success -> {
                    submitted = true
                    onDone()
                }
                is Result.Failure -> error = r.message
            }
            submitting = false
        }
    }
}
