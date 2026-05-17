import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
}

val ngaLocalProperties = Properties().apply {
    val file = rootProject.file("local.properties")
    if (file.exists()) {
        file.inputStream().use { load(it) }
    }
}

fun ngaProp(name: String): String? {
    val fromGradle = (findProperty(name) as String?)?.trim()?.takeIf { it.isNotEmpty() }
    if (fromGradle != null) return fromGradle
    return ngaLocalProperties.getProperty(name)?.trim()?.takeIf { it.isNotEmpty() }
}

android {
    namespace = "com.nextgearauto.admin"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.nextgearauto.admin"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
        buildConfigField("String", "MOBILE_CLIENT_VERSION", "\"1.0.0\"")
        vectorDrawables {
            useSupportLibrary = true
        }
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        debug {
            // Emulator: 10.0.2.2. Physical device: ngaDebugApiUrl in android/local.properties (see docs/android-physical-device-debug.md).
            val debugUrl = ngaProp("ngaDebugApiUrl")?.trimEnd('/') ?: "http://10.0.2.2:3000"
            logger.lifecycle("NGA Admin debug API_BASE_URL = ${debugUrl}/")
            buildConfigField("String", "API_BASE_URL", "\"${debugUrl}/\"")
        }
        release {
            isMinifyEnabled = false
            val releaseUrl = ngaProp("ngaReleaseApiUrl")?.trimEnd('/')
                ?: "https://YOUR_PRODUCTION_DOMAIN"
            buildConfigField("String", "API_BASE_URL", "\"${releaseUrl}/\"")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.12.01")
    implementation(composeBom)
    androidTestImplementation(composeBom)

    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.compose.ui:ui-tooling-preview")
    debugImplementation("androidx.compose.ui:ui-tooling")

    implementation("androidx.navigation:navigation-compose:2.8.5")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")

    implementation("androidx.security:security-crypto:1.1.0")

    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.jakewharton.retrofit:retrofit2-kotlinx-serialization-converter:1.0.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")

    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")

    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
