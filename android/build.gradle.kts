plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("com.google.gms.google-services")
}

// Make Google Services processing optional so unit tests work without
// a real google-services.json (placeholder or CI secrets both work).
afterEvaluate {
    tasks.matching { it.name.startsWith("process") && it.name.contains("GoogleServices") }.configureEach {
        enabled = file("google-services.json").exists()
    }
}

android {
    namespace = "br.church.paz.android"
    compileSdk = 35

    defaultConfig {
        applicationId = "br.church.paz.android"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            buildConfigField("String", "BASE_URL", "\"http://10.0.2.2:3001/api\"")
            // Replace with your actual OAuth 2.0 web client ID from Firebase Console
            buildConfigField("String", "GOOGLE_WEB_CLIENT_ID", "\"\"")
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            buildConfigField("String", "BASE_URL", "\"https://api.paz.church/api\"")
            // Replace with your actual OAuth 2.0 web client ID from Firebase Console
            buildConfigField("String", "GOOGLE_WEB_CLIENT_ID", "\"\"")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation(project(":shared"))

    val composeBom = platform(libs.compose.bom)
    implementation(composeBom)
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.material3)
    implementation(libs.compose.navigation)
    implementation(libs.compose.activity)
    implementation(libs.compose.lifecycle)
    implementation(libs.compose.viewmodel)
    debugImplementation(libs.compose.ui.tooling)

    implementation(libs.koin.android)
    implementation(libs.koin.compose)

    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.auth)
    implementation(libs.firebase.messaging)
    implementation(libs.firebase.remote.config)
    implementation(libs.google.signin)

    implementation(libs.coil.compose)
    implementation(libs.coil.network)

    implementation(libs.datastore.android)
    implementation(libs.ktor.client.cio.jvm)
    implementation(libs.compose.icons.extended)
    implementation(libs.credentials)
    implementation(libs.credentials.play.services)
    implementation(libs.googleid)

    testImplementation(libs.junit)
    testImplementation(libs.kotlin.test.junit)
    testImplementation(libs.coroutines.test)
    testImplementation(libs.turbine)
    testImplementation(libs.mockk)
    testImplementation(libs.arch.core.testing)
}
