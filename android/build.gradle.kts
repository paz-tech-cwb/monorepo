plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("com.google.gms.google-services")
    alias(libs.plugins.ktlint)
}

android {
    // Package name must match Firebase project: com.cwb.pazchurch.app
    namespace = "com.cwb.pazchurch.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.cwb.pazchurch.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }

    buildTypes {
        debug {
            buildConfigField("String", "BASE_URL", "\"http://localhost:3001/api\"")
            // Web client ID from google-services.json → oauth_client[type=3]
            buildConfigField(
                "String",
                "GOOGLE_WEB_CLIENT_ID",
                "\"139667803306-l99mi58j9d2ovncd4frvh4j2tpjaq2ei.apps.googleusercontent.com\"",
            )
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
            buildConfigField("String", "BASE_URL", "\"https://api.paz.church/api\"")
            buildConfigField(
                "String",
                "GOOGLE_WEB_CLIENT_ID",
                "\"139667803306-l99mi58j9d2ovncd4frvh4j2tpjaq2ei.apps.googleusercontent.com\"",
            )
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

ktlint {
    version.set("1.3.1")
    android.set(true)
    outputColorName.set("RED")
    reporters { reporter(org.jlleitschuh.gradle.ktlint.reporter.ReporterType.PLAIN) }
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
    implementation(libs.coroutines.play.services)

    testImplementation(libs.junit)
    testImplementation(libs.kotlin.test.junit)
    testImplementation(libs.coroutines.test)
    testImplementation(libs.turbine)
    testImplementation(libs.mockk)
    testImplementation(libs.arch.core.testing)
}
