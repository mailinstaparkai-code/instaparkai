package ai.instapark.valet.ui.theme

import ai.instapark.valet.R
import androidx.compose.material3.Typography
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// design.md §9 -- Inter (400/500/600/700), single variable font file with weight axis.
@OptIn(ExperimentalTextApi::class)
val Inter = FontFamily(
    Font(R.font.inter_variable, FontWeight.Normal, variationSettings = FontVariation.Settings(FontVariation.weight(400))),
    Font(R.font.inter_variable, FontWeight.Medium, variationSettings = FontVariation.Settings(FontVariation.weight(500))),
    Font(R.font.inter_variable, FontWeight.SemiBold, variationSettings = FontVariation.Settings(FontVariation.weight(600))),
    Font(R.font.inter_variable, FontWeight.Bold, variationSettings = FontVariation.Settings(FontVariation.weight(700))),
)

val Typography = Typography().let { d ->
    d.copy(
        // Display / screen title -- 26px/700 at -0.02em (greeting, KPI-standalone)
        headlineSmall = d.headlineSmall.copy(fontFamily = Inter, fontWeight = FontWeight.Bold, fontSize = 26.sp, letterSpacing = (-0.02).sp),
        // Dialog title -- 20px/700
        titleLarge = d.titleLarge.copy(fontFamily = Inter, fontWeight = FontWeight.Bold, fontSize = 20.sp),
        // Section title / card title -- 15px/600
        titleMedium = d.titleMedium.copy(fontFamily = Inter, fontWeight = FontWeight.SemiBold, fontSize = 15.sp),
        // Body -- 14px/400-500
        bodyMedium = d.bodyMedium.copy(fontFamily = Inter, fontSize = 14.sp),
        bodySmall = d.bodySmall.copy(fontFamily = Inter, fontSize = 13.sp),
        // Labels -- 11-13px/500
        labelLarge = d.labelLarge.copy(fontFamily = Inter, fontWeight = FontWeight.SemiBold, fontSize = 16.sp),
        labelMedium = d.labelMedium.copy(fontFamily = Inter, fontWeight = FontWeight.Medium, fontSize = 13.sp),
        labelSmall = d.labelSmall.copy(fontFamily = Inter, fontWeight = FontWeight.Medium, fontSize = 11.sp),
    )
}
