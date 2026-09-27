package com.madrasati.app.ui.navigation

object Routes {
    const val HOME = "home"
    const val SEARCH = "search"
    const val PROFILE = "profile"

    const val SCHOOL = "school/{orgId}"
    const val TEACHER = "teacher/{teacherId}"

    const val LOGIN = "login"
    const val REGISTER = "register"

    const val BOOKINGS = "bookings"
    const val APPLICATIONS = "applications"

    const val BOOKING = "booking/{kind}/{id}"
    const val ADMISSION = "admission/{orgId}"

    fun school(orgId: String) = "school/$orgId"
    fun teacher(id: String) = "teacher/$id"
    fun booking(kind: String, id: String) = "booking/$kind/$id"
    fun admission(orgId: String) = "admission/$orgId"
}
