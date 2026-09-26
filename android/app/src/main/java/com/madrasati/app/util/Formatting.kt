package com.madrasati.app.util

import java.text.NumberFormat
import java.util.Locale

/** Formats a money amount with its currency code, e.g. "50,000 ر.ي". */
fun formatMoney(amount: Double?, currency: String?): String {
    if (amount == null) return ""
    val currencyLabel = I18n.t("currency.${currency ?: "YER"}")
    val locale = if (Language.isArabic) Locale("ar") else Locale.US
    val formatted = NumberFormat.getNumberInstance(locale).format(amount)
    return "$formatted $currencyLabel"
}

/** Returns the localized label for an organization type code. */
fun typeLabel(type: String?): String {
    if (type.isNullOrBlank()) return I18n.t("allTypes")
    return I18n.t("type.$type")
}

fun statusLabel(status: String?): String {
    if (status.isNullOrBlank()) return ""
    return I18n.t("status.$status")
}

fun deliveryModeLabel(mode: String?): String {
    if (mode.isNullOrBlank()) return I18n.t("notDeclared")
    return I18n.t("delivery.$mode")
}

fun dayLabel(dayOfWeek: Int): String = I18n.t("day.${dayOfWeek.coerceIn(0, 6)}")
