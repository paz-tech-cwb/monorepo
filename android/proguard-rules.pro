# Kotlin Serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** { *** Companion; }
-keepclasseswithmembers class kotlinx.serialization.json.** { kotlinx.serialization.KSerializer serializer(...); }
-keep,includedescriptorclasses class br.church.paz.**$$serializer { *; }
-keepclassmembers class br.church.paz.** { *** Companion; }
-keepclasseswithmembers class br.church.paz.** { kotlinx.serialization.KSerializer serializer(...); }
