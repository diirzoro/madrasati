package com.madrasati.app.ui.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.madrasati.app.data.Result
import com.madrasati.app.data.model.AdmissionApplication
import com.madrasati.app.data.model.Booking
import com.madrasati.app.data.model.UserDto
import com.madrasati.app.data.repository.AuthRepository
import com.madrasati.app.data.repository.CatalogRepository
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class ProfileViewModel(
    private val authRepository: AuthRepository,
    private val repo: CatalogRepository,
) : ViewModel() {

    val user: StateFlow<UserDto?> = authRepository.user

    var bookings by mutableStateOf<List<Booking>>(emptyList())
        private set
    var applications by mutableStateOf<List<AdmissionApplication>>(emptyList())
        private set
    var loading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    fun load() {
        val current = user.value
        if (current == null) return
        loading = true
        error = null
        viewModelScope.launch {
            when (val r = repo.listBookings()) {
                is Result.Success -> bookings = r.data
                is Result.Failure -> error = r.message
            }
            when (val r = repo.listApplications()) {
                is Result.Success -> applications = r.data
                is Result.Failure -> if (error == null) error = r.message
            }
            loading = false
        }
    }

    fun logout(onDone: () -> Unit) {
        viewModelScope.launch {
            authRepository.logout()
            bookings = emptyList()
            applications = emptyList()
            onDone()
        }
    }
}
