# Keep the kotlinx.serialization generated serializers.
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.**
-keepclassmembers class com.madrasati.app.** {
    *** Companion;
}
-keepclasseswithmembers class com.madrasati.app.** {
    kotlinx.serialization.KSerializer serializer(...);
}
