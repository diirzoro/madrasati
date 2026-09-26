package com.madrasati.app.data.api

import android.content.Context
import com.madrasati.app.BuildConfig
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {

    val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        coerceInputValues = true
        explicitNulls = false
    }

    val baseUrl: String get() = BuildConfig.API_BASE_URL

    lateinit var cookieStore: SessionCookieStore
        private set

    lateinit var api: MadrasatiApi
        private set

    lateinit var cookieJar: SessionCookieJar
        private set

    fun init(context: Context) {
        cookieStore = SessionCookieStore(context)
        cookieJar = SessionCookieJar(cookieStore)

        val client = OkHttpClient.Builder()
            .cookieJar(cookieJar)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .apply {
                if (BuildConfig.DEBUG) {
                    addInterceptor(
                        HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC }
                    )
                }
            }
            .build()

        val contentType = "application/json".toMediaType()

        api = Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addConverterFactory(json.asConverterFactory(contentType))
            .build()
            .create(MadrasatiApi::class.java)
    }

    /**
     * Resolves a media path returned by the API (e.g. `/uploads/marketing/x.png`,
     * or a full https URL) into an absolute URL the image loader can fetch.
     */
    fun resolveMediaUrl(path: String?): String? {
        if (path.isNullOrBlank()) return null
        if (path.startsWith("http://") || path.startsWith("https://")) return path
        if (path.startsWith("/")) return baseUrl.trimEnd('/') + path
        return path
    }
}
