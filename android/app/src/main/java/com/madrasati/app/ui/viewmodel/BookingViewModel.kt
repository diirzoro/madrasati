package com.madrasati.app.ui.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.madrasati.app.data.Result
import com.madrasati.app.data.model.CreateBookingRequest
import com.madrasati.app.data.model.Organization
import com.madrasati.app.data.model.Teacher
import com.madrasati.app.data.repository.CatalogRepository
import kotlinx.coroutines.launch

enum class BookingKind { TEACHER, ORG }

class BookingViewModel(
    private val repo: CatalogRepository,
    val kind: BookingKind,
    private val id: String,
) : ViewModel() {

    var teacher by mutableStateOf<Teacher?>(null)
        private set
    var org by mutableStateOf<Organization?>(null)
        private set
    var loading by mutableStateOf(true)
        private set

    var bookingType by mutableStateOf(if (kind == BookingKind.TEACHER) "teacher_lesson" else "school_visit")
    var subjectId by mutableStateOf<Long?>(null)
    var date by mutableStateOf("")
    var seats by mutableStateOf("1")
    var notes by mutableStateOf("")

    var submitting by mutableStateOf(false)
        private set
    var submitted by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    init {
        loadContext()
    }

    private fun loadContext() {
        viewModelScope.launch {
            when (kind) {
                BookingKind.TEACHER -> {
                    when (val r = repo.getTeacher(id)) {
                        is Result.Success -> teacher = r.data
                        is Result.Failure -> error = r.message
                    }
                }
                BookingKind.ORG -> {
                    when (val r = repo.getOrganization(id)) {
                        is Result.Success -> org = r.data
                        is Result.Failure -> error = r.message
                    }
                }
            }
            loading = false
        }
    }

    fun submit(onDone: () -> Unit) {
        if (date.isBlank()) {
            error = "يرجى اختيار التاريخ"
            return
        }
        submitting = true
        error = null
        viewModelScope.launch {
            val request = CreateBookingRequest(
                organizationId = if (kind == BookingKind.ORG) id else null,
                teacherUserId = if (kind == BookingKind.TEACHER) teacher?.userId else null,
                bookingType = bookingType,
                subjectId = subjectId,
                seats = seats.toIntOrNull() ?: 1,
                startsAt = "${date}T09:00:00",
                notes = notes.trim().ifBlank { null },
            )
            when (val r = repo.createBooking(request)) {
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
