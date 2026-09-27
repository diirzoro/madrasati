package com.madrasati.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.unit.LayoutDirection
import androidx.navigation.compose.rememberNavController
import com.madrasati.app.ui.navigation.MadrasatiNavHost
import com.madrasati.app.ui.theme.MadrasatiTheme
import com.madrasati.app.util.Language

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MadrasatiTheme {
                val direction = if (Language.isRtl) LayoutDirection.Rtl else LayoutDirection.Ltr
                CompositionLocalProvider(androidx.compose.ui.platform.LocalLayoutDirection provides direction) {
                    val navController = rememberNavController()
                    MadrasatiNavHost(navController)
                }
            }
        }
    }
}
