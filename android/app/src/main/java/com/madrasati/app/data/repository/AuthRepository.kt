package com.madrasati.app.data.repository

import com.madrasati.app.data.Result
import com.madrasati.app.data.api.ApiClient
import com.madrasati.app.data.api.MadrasatiApi
import com.madrasati.app.data.apiCall
import com.madrasati.app.data.model.LoginRequest
import com.madrasati.app.data.model.RegisterRequest
import com.madrasati.app.data.model.UserDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class AuthRepository(private val api: MadrasatiApi) {

    private val _user = MutableStateFlow<UserDto?>(null)
    val user: StateFlow<UserDto?> = _user.asStateFlow()

    val isLoggedIn: Boolean get() = _user.value != null

    fun setUser(value: UserDto?) {
        _user.value = value
    }

    /** Restores the session from the persisted cookie, if one is still valid. */
    suspend fun refreshSession(): Result<UserDto?> {
        val session = apiCall { api.session() }
        if (session is Result.Success && session.data.hasSession) {
            return when (val me = apiCall { api.me() }) {
                is Result.Success -> {
                    _user.value = me.data
                    Result.Success(me.data)
                }
                is Result.Failure -> {
                    _user.value = null
                    Result.Success(null)
                }
            }
        }
        _user.value = null
        return Result.Success(null)
    }

    suspend fun login(email: String, password: String): Result<UserDto> {
        return when (val result = apiCall { api.login(LoginRequest(email.trim(), password)) }) {
            is Result.Success -> {
                _user.value = result.data
                Result.Success(result.data)
            }
            is Result.Failure -> result
        }
    }

    suspend fun register(request: RegisterRequest): Result<UserDto> {
        return when (val result = apiCall { api.register(request) }) {
            is Result.Success -> {
                _user.value = result.data
                Result.Success(result.data)
            }
            is Result.Failure -> result
        }
    }

    suspend fun logout() {
        apiCall { api.logout() }
        ApiClient.cookieJar.clear()
        _user.value = null
    }
}
