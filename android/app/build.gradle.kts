plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
}

// Environment-aware API base URLs. The backend is server/pg-app.js (default port
// 4003); Android calls the same /api/... routes as the web frontend and never
// connects to PostgreSQL directly, so no database host/port/credentials live here.
//
// TEST / DEBUG — the emulator reaches the host machine's localhost via 10.0.2.2.
// For a physical device, point it at your machine's LAN IP instead:
//   gradlew assembleDebug -PMADRASATI_API_BASE_URL=http://192.168.1.10:4003/
val debugApiBaseUrl: String = (project.findProperty("MADRASATI_API_BASE_URL") as String?)
    ?: "http://10.0.2.2:4003/"

// PRODUCTION / RELEASE — must be HTTPS, set at build time:
//   gradlew assembleRelease -PMADRASATI_PROD_API_BASE_URL=https://api.madrasati.example/
// The placeholder below is deliberately non-routable and must be overridden
// before any release build is shipped.
val prodApiBaseUrl: String = (project.findProperty("MADRASATI_PROD_API_BASE_URL") as String?)
    ?: "https://api.madrasati.example/"

android {
    namespace = "com.madrasati.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.madrasati.app"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
    }

    buildTypes {
        debug {
            buildConfigField("String", "API_BASE_URL", "\"$debugApiBaseUrl\"")
        }
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            buildConfigField("String", "API_BASE_URL", "\"$prodApiBaseUrl\"")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlin {
        compilerOptions {
            jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.10.01")
    implementation(composeBom)

    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-compose:1.9.3")

    // Lifecycle
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")

    // Compose
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")

    // Navigation
    implementation("androidx.navigation:navigation-compose:2.8.4")

    // Networking
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-kotlinx-serialization:2.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    // Serialization
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")

    // Images
    implementation("io.coil-kt:coil-compose:2.7.0")

    // Preferences (session cookie persistence + language)
    implementation("androidx.datastore:datastore-preferences:1.1.1")

    // Debug tooling
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
