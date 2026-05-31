plugins {
    `kotlin-dsl`
}

dependencies {
    compileOnly(libs.plugins.kotlin.multiplatform.get().let { "${it.pluginId}:${it.pluginId}.gradle.plugin:${it.version}" })
    compileOnly(libs.plugins.kotlin.android.get().let { "${it.pluginId}:${it.pluginId}.gradle.plugin:${it.version}" })
    compileOnly(libs.plugins.kotlin.compose.compiler.get().let { "${it.pluginId}:${it.pluginId}.gradle.plugin:${it.version}" })
    compileOnly(libs.plugins.android.application.get().let { "com.android.tools.build:gradle:${it.version}" })
    compileOnly(libs.plugins.android.library.get().let { "com.android.tools.build:gradle:${it.version}" })
}
