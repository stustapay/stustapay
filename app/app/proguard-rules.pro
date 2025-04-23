# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# Rules added from missing_rules.txt
-dontwarn com.google.errorprone.annotations.CanIgnoreReturnValue
-dontwarn com.sumup.analyticskit.**
-dontwarn com.sumup.mixpanel.**
-dontwarn com.sumup.observabilitylib.**
-dontwarn com.sumup.observablib.crashreporting.exception.CrashlyticsExporter

# OpenTelemetry related warnings
-dontwarn io.opentelemetry.**

# Java management warnings
-dontwarn java.lang.management.**

# Keep Kotlin serialization classes
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt

# Kotlin serialization looks up the generated serializer classes through a function on companion
# objects. The companions are looked up reflectively so we need to explicitly keep these functions.
-keepclasseswithmembers class **.*Companion {
    kotlinx.serialization.KSerializer serializer(...);
}

# Keep Hilt-related classes
-keepclassmembers,allowobfuscation class * {
    @javax.inject.* *;
    @dagger.* *;
    <init>();
}

# Ktor
-keep class io.ktor.** { *; }

# Protobuf
-keep class * extends com.google.protobuf.GeneratedMessageLite { *; }

# Keep SumUp SDK classes that might be used reflectively
-keep class com.sumup.merchant.** { *; }