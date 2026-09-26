package com.madrasati.app

import android.app.Application
import com.madrasati.app.data.api.ApiClient
import com.madrasati.app.di.AppContainer

class MadrasatiApp : Application() {

    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        ApiClient.init(this)
        container = AppContainer.init(this)
    }
}
