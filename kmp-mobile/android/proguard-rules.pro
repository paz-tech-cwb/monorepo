# Kotlin Serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** { *** Companion; }
-keepclasseswithmembers class kotlinx.serialization.json.** { kotlinx.serialization.KSerializer serializer(...); }
-keep,includedescriptorclasses class br.church.paz.**$$serializer { *; }
-keepclassmembers class br.church.paz.** { *** Companion; }
-keepclasseswithmembers class br.church.paz.** { kotlinx.serialization.KSerializer serializer(...); }

# Chucker (network inspector, shipped in release builds — see DevToolsGate)
-keep class com.chuckerteam.chucker.** { *; }
-dontwarn com.chuckerteam.chucker.**

# OkHttp (Ktor's Android HTTP engine as of this change; Chucker wraps it as an interceptor)
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-keep class okio.** { *; }
