package com.madrasati.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class ApiErrorDto(
    val error: String? = null,
    val code: String? = null,
)

/** Thrown when the API responds with a non-2xx status. */
class ApiException(
    val status: Int,
    override val message: String,
    val code: String? = null,
) : Exception(message)
