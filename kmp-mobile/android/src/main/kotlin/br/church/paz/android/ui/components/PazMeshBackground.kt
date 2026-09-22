package br.church.paz.android.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import br.church.paz.android.ui.theme.LocalPazDarkTheme
import br.church.paz.android.ui.theme.PazColors

/**
 * App-wide soft "mesh gradient" backdrop — several large, softly-diffused brand-color
 * blobs layered over the base background, sitting behind every screen so glass
 * surfaces ([PazGlassCard]) have something to actually show through.
 *
 * Compose port of iOS `PazMeshBackground.swift`. minSdk 26 doesn't support
 * `Modifier.blur` with an unbounded edge treatment (API 31+), so this approximates
 * the blurred-circle look with large radial gradients instead of a true blur.
 */
@Composable
fun PazMeshBackground(modifier: Modifier = Modifier) {
    val isDark = LocalPazDarkTheme.current
    val background = if (isDark) PazColors.DarkBackground else PazColors.Background

    Box(
        modifier =
            modifier
                .fillMaxSize()
                .background(background)
                .drawBehind {
                    fun blob(
                        color: Color,
                        alpha: Float,
                        radius: Float,
                        center: Offset,
                    ) {
                        drawCircle(
                            brush =
                                Brush.radialGradient(
                                    colors = listOf(color.copy(alpha = alpha), color.copy(alpha = 0f)),
                                    center = center,
                                    radius = radius,
                                ),
                            radius = radius,
                            center = center,
                        )
                    }

                    val w = size.width
                    val h = size.height

                    blob(
                        color = PazColors.PrimaryLight,
                        alpha = if (isDark) 0.35f else 0.28f,
                        radius = 420f,
                        center = Offset(w * -0.10f, h * 0.10f),
                    )
                    blob(
                        color = PazColors.Sky,
                        alpha = if (isDark) 0.28f else 0.22f,
                        radius = 380f,
                        center = Offset(w * 0.85f, h * 0.28f),
                    )
                    blob(
                        color = PazColors.PrimaryMid,
                        alpha = if (isDark) 0.32f else 0.20f,
                        radius = 460f,
                        center = Offset(w * -0.05f, h * 0.72f),
                    )
                    blob(
                        color = PazColors.Gold,
                        alpha = if (isDark) 0.10f else 0.08f,
                        radius = 300f,
                        center = Offset(w * 0.80f, h * 0.85f),
                    )
                },
    )
}
