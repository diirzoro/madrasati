package com.madrasati.app.di

import android.content.Context
import com.madrasati.app.data.api.ApiClient
import com.madrasati.app.data.repository.AuthRepository
import com.madrasati.app.data.repository.CatalogRepository

/**
 * Manual dependency container. Kept simple: a single Application-scoped graph
 * exposing the repositories the screens and ViewModels need.
 */
class AppContainer(private val appContext: Context) {

    val authRepository: AuthRepository by lazy {
        AuthRepository(ApiClient.api)
    }

    val catalogRepository: CatalogRepository by lazy {
        CatalogRepository(ApiClient.api)
    }

    companion object {
        @Volatile
        private var instance: AppContainer? = null

        fun init(context: Context): AppContainer {
            return instance ?: synchronized(this) {
                instance ?: AppContainer(context.applicationContext).also { instance = it }
            }
        }

        val get: AppContainer
            get() = instance ?: error("AppContainer has not been initialized")
    }
}
