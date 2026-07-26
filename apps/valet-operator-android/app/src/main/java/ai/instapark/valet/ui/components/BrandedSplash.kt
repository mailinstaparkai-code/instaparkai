package ai.instapark.valet.ui.components

import ai.instapark.valet.R
import ai.instapark.valet.ui.theme.CanvasBottom
import ai.instapark.valet.ui.theme.CanvasTop
import ai.instapark.valet.ui.theme.InkSecondary
import ai.instapark.valet.ui.theme.PrimaryBlue
import ai.instapark.valet.ui.theme.AccentOrange
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.DirectionsCar
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * The branded splash: light sky-blue canvas, centered brand mark + wordmark, a
 * 2-segment step indicator, and a bottom city-skyline flourish -- matches the
 * reference splash shared alongside the bug report (always this light treatment,
 * regardless of the in-app theme setting, same as the previous dark version was
 * always dark). Shown while the stored session is being restored (ValetNavGraph).
 */
@Composable
fun BrandedSplash() {
    val transition = rememberInfiniteTransition(label = "splashLoad")
    val stepFill by transition.animateFloat(
        initialValue = 0.42f,
        targetValue = 0.62f,
        animationSpec = infiniteRepeatable(
            animation = tween(1400, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "stepFill",
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(listOf(CanvasTop, CanvasBottom))),
    ) {
        SplashCornerWaves(modifier = Modifier.align(Alignment.TopStart).size(220.dp))
        SplashCornerWaves(modifier = Modifier.align(Alignment.TopEnd).size(220.dp), mirror = true)

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 190.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Image(
                painter = painterResource(R.drawable.ic_brand_mark),
                contentDescription = "InstaPark AI",
                modifier = Modifier.size(104.dp),
            )
            Spacer(modifier = Modifier.height(20.dp))
            Image(
                painter = painterResource(R.drawable.ic_wordmark),
                contentDescription = "InstaPark AI",
                modifier = Modifier.width(230.dp),
            )
            Spacer(modifier = Modifier.height(10.dp))
            Text(
                "SMART VALET PARKING",
                style = MaterialTheme.typography.labelMedium,
                color = InkSecondary,
                letterSpacing = 3.sp,
                fontWeight = FontWeight.Medium,
            )

            Spacer(modifier = Modifier.height(56.dp))

            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier.width(240.dp),
            ) {
                Box(
                    modifier = Modifier
                        .weight(stepFill)
                        .height(4.dp)
                        .clip(RoundedCornerShape(50))
                        .background(PrimaryBlue),
                )
                Box(
                    modifier = Modifier
                        .weight(1f - stepFill)
                        .height(4.dp)
                        .clip(RoundedCornerShape(50))
                        .background(PrimaryBlue.copy(alpha = 0.15f)),
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                "Digitizing Parking.\nMaximizing Value.",
                style = MaterialTheme.typography.bodyMedium,
                color = InkSecondary,
                textAlign = TextAlign.Center,
                lineHeight = 20.sp,
            )
        }

        SplashSkyline(modifier = Modifier.align(Alignment.BottomCenter))
    }
}

/** Faint interlocking wave-line accents, top corners only -- decorative, low-alpha. */
@Composable
private fun SplashCornerWaves(modifier: Modifier = Modifier, mirror: Boolean = false) {
    Canvas(modifier = modifier) {
        val w = size.width
        val h = size.height
        val startX = if (mirror) w else 0f
        val endX = if (mirror) 0f else w
        val ctrl1X = if (mirror) w * 0.65f else w * 0.35f
        val ctrl2X = if (mirror) w * 0.35f else w * 0.65f
        val colors = listOf(AccentOrange, PrimaryBlue, PrimaryBlue)
        colors.forEachIndexed { index, color ->
            val yStart = h * (0.12f + index * 0.14f)
            val path = Path().apply {
                moveTo(startX, yStart)
                cubicTo(
                    ctrl1X, yStart - h * 0.10f,
                    ctrl2X, yStart + h * 0.16f,
                    endX, yStart + h * 0.05f,
                )
            }
            drawPath(
                path = path,
                color = color.copy(alpha = 0.07f),
                style = Stroke(width = 1.5.dp.toPx()),
            )
        }
    }
}

/** Bottom flourish: a simple city-skyline silhouette + car + parking sign. */
@Composable
private fun SplashSkyline(modifier: Modifier = Modifier) {
    val skylineColor = PrimaryBlue.copy(alpha = 0.10f)
    Box(modifier = modifier.fillMaxWidth().height(150.dp)) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val w = size.width
            val h = size.height
            val buildingWidths = listOf(0.10f, 0.07f, 0.13f, 0.08f, 0.11f, 0.09f, 0.12f)
            val buildingHeights = listOf(0.35f, 0.55f, 0.42f, 0.70f, 0.30f, 0.48f, 0.38f)
            var x = w * 0.04f
            buildingWidths.forEachIndexed { i, wFrac ->
                val bw = w * wFrac
                val bh = h * buildingHeights[i]
                drawRect(
                    color = skylineColor,
                    topLeft = Offset(x, h - bh),
                    size = androidx.compose.ui.geometry.Size(bw, bh),
                )
                x += bw + w * 0.02f
            }
        }
        Icon(
            imageVector = Icons.Outlined.DirectionsCar,
            contentDescription = null,
            tint = PrimaryBlue.copy(alpha = 0.55f),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 22.dp)
                .size(48.dp),
        )
        Box(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 36.dp, bottom = 48.dp)
                .size(30.dp)
                .clip(RoundedCornerShape(6.dp))
                .background(PrimaryBlue.copy(alpha = 0.55f)),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                "P",
                color = Color.White,
                fontWeight = FontWeight.Bold,
                style = MaterialTheme.typography.titleMedium,
            )
        }
    }
}
