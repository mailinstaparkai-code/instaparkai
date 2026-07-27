package ai.instapark.valet.ui.theme

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.draw.drawBehind

/**
 * HANDOFF §10 -- replaces the flat CanvasTop/CanvasBottom ramp with a layered gradient
 * (three soft radial glows over a vertical base). Light theme only; dark theme keeps its
 * flat near-black background per §2/§8 (unaffected by this pass).
 *
 * Circular Brush.radialGradient approximates the CSS spec's elliptical radial-gradients
 * (radius sized from the larger box dimension) -- exact ellipse shape isn't load-bearing
 * for an ambient decorative background.
 */
fun Modifier.valetAppCanvas(isDark: Boolean): Modifier = this.then(
    if (isDark) {
        Modifier.background(DarkBackground)
    } else {
        Modifier
            .fillMaxSize()
            .drawBehind {
                drawRect(Brush.verticalGradient(listOf(Color(0xFFFCFDFF), Color(0xFFF3F7FF))))
                val maxDim = size.width.coerceAtLeast(size.height)
                drawRect(
                    brush = Brush.radialGradient(
                        colors = listOf(Color(0xFFDCE9FF), Color(0x00DCE9FF)),
                        center = Offset(size.width * 0.08f, size.height * -0.06f),
                        radius = maxDim * 0.85f,
                    ),
                )
                drawRect(
                    brush = Brush.radialGradient(
                        colors = listOf(Color(0xFFFFE3D6), Color(0x00FFE3D6)),
                        center = Offset(size.width * 1.04f, size.height * 0.12f),
                        radius = maxDim * 0.62f,
                    ),
                )
                drawRect(
                    brush = Brush.radialGradient(
                        colors = listOf(Color(0xFFE4E9FF), Color(0x00E4E9FF)),
                        center = Offset(size.width * 0.50f, size.height * 1.08f),
                        radius = maxDim * 0.72f,
                    ),
                )
            }
    }
)
