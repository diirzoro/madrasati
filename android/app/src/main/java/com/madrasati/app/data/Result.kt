package com.madrasati.app.data

import com.madrasati.app.data.model.ApiException
import java.io.IOException

sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Failure(
        val message: String,
        val status: Int? = null,
        val code: String? = null,
    ) : Result<Nothing>()
}

/** Maps a network/API call into a [Result], translating exceptions to messages. */
suspend fun <T> apiCall(block: suspend () -> T): Result<T> = try {
    Result.Success(block())
} catch (e: ApiException) {
    Result.Failure(e.message, e.status, e.code)
} catch (e: IOException) {
    Result.Failure("تعذر الاتصال بالخادم — تحقق من اتصالك بالإنترنت", null, null)
} catch (e: Exception) {
    Result.Failure(e.message ?: "حدث خطأ غير متوقع", null, null)
}
