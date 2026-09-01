import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

// Release signing credentials live in a gitignored keystore.properties (see README) --
// falls back to an unsigned release build if it's missing (e.g. a fresh clone) rather
// than failing the whole build.
val keystorePropertiesFile = rootProject.file("keystore.properties")
val keystoreProperties = Properties().apply {
    if (keystorePropertiesFile.exists()) {
        keystorePropertiesFile.inputStream().use { load(it) }
    }
}

// google-services.json (gitignored, like keystore.properties) identifies the Firebase
// project used for FCM push -- apply the plugin only if it's present so a fresh clone
// without it still builds (just without push notifications working).
if (file("google-services.json").exists()) {
    apply(plugin = "com.google.gms.google-services")
}

android {
    namespace = "ai.instapark.valet"
    compileSdk = 36

    defaultConfig {
        applicationId = "ai.instapark.valet"
        minSdk = 26
        targetSdk = 36
        versionCode = 19
        versionName = "0.5.7"
    }

    signingConfigs {
        if (keystorePropertiesFile.exists()) {
            create("release") {
                storeFile = rootProject.file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["storePassword"] as String
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            if (keystorePropertiesFile.exists()) {
                signingConfig = signingConfigs.getByName("release")
            }
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

    // The dev API base URL points at the emulator's alias for the host machine's
    // localhost, where `next dev` runs during Phase 1-4 development/verification.
    // A release build (Phase 5) will override this with the production API host.
    buildTypes.getByName("debug") {
        buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2:3000/api/parking-admin/v1/\"")
    }
    buildTypes.getByName("release") {
        buildConfigField("String", "API_BASE_URL", "\"https://instaparkai-super-admin.vercel.app/api/parking-admin/v1/\"")
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.material.icons.extended)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.datastore.preferences)
    implementation(libs.retrofit.core)
    implementation(libs.retrofit.converter.gson)
    implementation(libs.okhttp.core)
    implementation(libs.okhttp.logging.interceptor)
    implementation(libs.gson)
    implementation(libs.coil.compose)
    implementation(libs.androidx.exifinterface)
    implementation(libs.androidx.core.splashscreen)
    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.messaging)
    debugImplementation(libs.androidx.ui.tooling)
}
