package com.madrasati.app.data.api

import android.content.Context
import android.content.SharedPreferences

/**
 * Persistent store for the single `madarasati_session` cookie. The backend keeps
 * sessions in memory server-side, but the cookie carries the opaque token that
 * identifies the session, so persisting it lets a login survive app restarts
 * (within the 24h server TTL).
 */
class SessionCookieStore(context: Context) {

    private val prefs: SharedPreferences =
        context.applicationContext.getSharedPreferences("madrasati_session", Context.MODE_PRIVATE)

    fun save(value: String) {
        prefs.edit().putString(KEY, value).apply()
    }

    fun load(): String? = prefs.getString(KEY, null)

    fun clear() {
        prefs.edit().remove(KEY).apply()
    }

    private companion object {
        const val KEY = "session_cookie"
    }
}
