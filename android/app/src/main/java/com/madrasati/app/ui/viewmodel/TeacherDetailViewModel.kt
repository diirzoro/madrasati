package com.madrasati.app.ui.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.madrasati.app.data.Result
import com.madrasati.app.data.model.Teacher
import com.madrasati.app.data.repository.CatalogRepository
import kotlinx.coroutines.launch

class TeacherDetailViewModel(
    private val repo: CatalogRepository,
    private val teacherId: String,
) : ViewModel() {

    var teacher by mutableStateOf<Teacher?>(null)
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
            when (val r = repo.getTeacher(teacherId)) {
                is Result.Success -> teacher = r.data
                is Result.Failure -> error = r.message
            }
            loading = false
        }
    }
}
