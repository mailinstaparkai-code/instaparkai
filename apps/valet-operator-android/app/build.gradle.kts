plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "ai.instapark.valet"
    compileSdk = 36

    defaultConfig {
        applicationId = "ai.instapark.valet"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
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
    debugImplementation(libs.androidx.ui.tooling)
}
