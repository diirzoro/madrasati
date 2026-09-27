package com.madrasati.app.ui.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.madrasati.app.data.Result
import com.madrasati.app.data.model.RegisterRequest
import com.madrasati.app.data.model.UserDto
import com.madrasati.app.data.repository.AuthRepository
import kotlinx.coroutines.launch

class AuthViewModel(private val authRepository: AuthRepository) : ViewModel() {

    var loading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set
    var success by mutableStateOf(false)
        private set

    var email by mutableStateOf("")
    var password by mutableStateOf("")
    var name by mutableStateOf("")
    var phone by mutableStateOf("")

    fun clearError() {
        error = null
    }

    fun login(onDone: (UserDto) -> Unit) {
        if (email.isBlank() || password.isBlank()) {
            error = "يرجى إدخال البريد الإلكتروني وكلمة المرور"
            return
        }
        loading = true
        error = null
        viewModelScope.launch {
            when (val r = authRepository.login(email, password)) {
                is Result.Success -> onDone(r.data)
                is Result.Failure -> error = r.message
            }
            loading = false
        }
    }

    fun register(onDone: (UserDto) -> Unit) {
        if (name.isBlank() || email.isBlank() || password.isBlank()) {
            error = "يرجى إدخال الاسم والبريد الإلكتروني وكلمة المرور"
            return
        }
        loading = true
        error = null
        viewModelScope.launch {
            val request = RegisterRequest(
                name = name.trim(),
                email = email.trim(),
                password = password,
                phone = phone.trim().ifBlank { null },
                countryIso = "YE",
                phoneCountryCode = "967",
            )
            when (val r = authRepository.register(request)) {
                is Result.Success -> onDone(r.data)
                is Result.Failure -> error = r.message
            }
            loading = false
        }
    }
}
