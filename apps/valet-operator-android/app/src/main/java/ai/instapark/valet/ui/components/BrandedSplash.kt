package ai.instapark.valet.ui.components

import ai.instapark.valet.R
import ai.instapark.valet.ui.theme.BrandOrange
import ai.instapark.valet.ui.theme.DarkBackground
import ai.instapark.valet.ui.theme.DarkTextSecondary
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp

/**
 * The branded splash from the operator reference: logo lockup + tagline on the
 * dark brand background, night-scene art anchored at the bottom, and an
 * indeterminate orange loading bar. Shown while the stored session is being
 * restored (see ValetNavGraph). Always dark, regardless of the theme setting --
 * matching the reference.
 */
@Composable
fun BrandedSplash() {
    val transition = rememberInfiniteTransition(label = "splashLoad")
    val loadOffset by transition.animateFloat(
        initialValue = -0.4f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1100, easing = LinearEasing),
            repeatMode = RepeatMode.Restart,
        ),
        label = "loadOffset",
    )

    Box(modifier = Modifier.fillMaxSize().background(DarkBackground)) {
        Image(
            painter = painterResource(R.drawable.img_night_scene),
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.BottomCenter)
                .height(340.dp),
        )
        // Fade the art into the background so it blends like the reference
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(340.dp)
                .align(Alignment.BottomCenter)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(DarkBackground, Color.Transparent),
                        endY = 400f,
                    )
                )
        )
        Column(
            modifier = Modifier.fillMaxSize().padding(top = 96.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Image(
                painter = painterResource(R.drawable.img_logo_lockup),
                contentDescription = "InstaPark AI Valet Parking",
                modifier = Modifier.width(230.dp),
            )
            Text(
                "Smarter Parking. Seamless Experience.",
                style = MaterialTheme.typography.bodyMedium,
                color = DarkTextSecondary,
                modifier = Modifier.padding(top = 16.dp),
            )
        }
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 56.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(
                modifier = Modifier
                    .width(120.dp)
                    .height(4.dp)
                    .clip(RoundedCornerShape(50))
                    .background(Color.White.copy(alpha = 0.15f)),
            ) {
                Box(
                    modifier = Modifier
                        .offset(x = 120.dp * loadOffset)
                        .width(48.dp)
                        .height(4.dp)
                        .clip(RoundedCornerShape(50))
                        .background(BrandOrange),
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text("Loading…", style = MaterialTheme.typography.bodySmall, color = DarkTextSecondary)
        }
    }
}
