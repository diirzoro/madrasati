package com.madrasati.app.util

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

enum class AppLanguage { AR, EN }

object Language {
    var current by mutableStateOf(AppLanguage.AR)

    val isArabic: Boolean get() = current == AppLanguage.AR
    val isRtl: Boolean get() = current == AppLanguage.AR

    fun toggle() {
        current = if (current == AppLanguage.AR) AppLanguage.EN else AppLanguage.AR
    }
}
