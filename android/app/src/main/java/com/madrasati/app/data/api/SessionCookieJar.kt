package com.madrasati.app.data.api

import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import java.util.concurrent.ConcurrentHashMap

private const val SESSION_COOKIE = "madarasati_session"

/**
 * A [CookieJar] that persists only the session cookie and reconstructs it for
 * every request to the configured API host. Non-session cookies are held in
 * memory only, which is enough for the single-origin API this app talks to.
 */
class SessionCookieJar(private val store: SessionCookieStore) : CookieJar {

    private val cache = ConcurrentHashMap<String, List<Cookie>>()

    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        cache[url.host] = cookies
        val session = cookies.firstOrNull { it.name == SESSION_COOKIE }
        when {
            session == null -> Unit
            session.value.isEmpty() || session.expiresAt == Long.MIN_VALUE -> {
                // Logout: Max-Age=0 or empty value clears the stored token.
                store.clear()
            }
            else -> store.save(session.value)
        }
    }

    override fun loadForRequest(url: HttpUrl): List<Cookie> {
        val stored = cache[url.host]
        if (!stored.isNullOrEmpty()) return stored
        val value = store.load() ?: return emptyList()
        val cookie = Cookie.Builder()
            .name(SESSION_COOKIE)
            .value(value)
            .path("/")
            .domain(url.host)
            .build()
        return listOf(cookie)
    }

    fun clear() {
        cache.clear()
        store.clear()
    }
}
