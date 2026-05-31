plugins {
    `kotlin-dsl`
}

dependencies {
    // Plugin marker artifacts — standard pattern for accessing plugins in build-logic
    compileOnly("org.jetbrains.kotlin:kotlin-gradle-plugin:${libs.versions.kotlin.get()}")
    compileOnly("com.android.tools.build:gradle:${libs.versions.agp.get()}")
}

gradlePlugin {
    plugins {
        register("kmpLibrary") {
            id                  = "paz.kmp.library"
            implementationClass = "KmpLibraryConventionPlugin"
        }
        register("androidApplication") {
            id                  = "paz.android.application"
            implementationClass = "AndroidApplicationConventionPlugin"
        }
    }
}
