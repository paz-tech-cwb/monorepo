package br.church.paz.android.ui.theme

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

object PazGradients {
    /** Deep navy hero — splash, home hero, detail hero */
    val Hero =
        Brush.linearGradient(
            colors = listOf(PazColors.Primary, PazColors.PrimaryMid, PazColors.PrimaryLight),
            start = Offset.Zero,
            end = Offset(Float.POSITIVE_INFINITY, Float.POSITIVE_INFINITY),
        )

    /** Carousel / card gradient */
    val Card =
        Brush.linearGradient(
            colors = listOf(PazColors.PrimaryMid, PazColors.PrimaryLight),
            start = Offset.Zero,
            end = Offset(Float.POSITIVE_INFINITY, Float.POSITIVE_INFINITY),
        )

    /** Contribution card */
    val Contribution =
        Brush.linearGradient(
            colors = listOf(Color(0xFF032E58), Color(0xFF0B4D8C), Color(0xFF1565C0)),
            start = Offset.Zero,
            end = Offset(Float.POSITIVE_INFINITY, Float.POSITIVE_INFINITY),
        )

    /** Soft page background */
    val Soft =
        Brush.verticalGradient(
            colors = listOf(PazColors.PrimaryTint, PazColors.Background),
        )

    /** Dark hero for dark-mode screens */
    val DarkHero =
        Brush.linearGradient(
            colors = listOf(Color(0xFF040D1A), Color(0xFF081929), Color(0xFF0D2A45)),
            start = Offset.Zero,
            end = Offset(Float.POSITIVE_INFINITY, Float.POSITIVE_INFINITY),
        )

    /** Primary featured card — dark navy */
    val FeaturedCard =
        Brush.linearGradient(
            colorStops =
                arrayOf(
                    0f to Color(0xFF0A335F),
                    0.52f to Color(0xFF072E5A),
                    1f to Color(0xFF06243F),
                ),
            start = Offset(0f, 0f),
            end = Offset(Float.POSITIVE_INFINITY, Float.POSITIVE_INFINITY),
        )

    /** Alternate featured card — slightly lighter navy */
    val FeaturedCardAlt =
        Brush.linearGradient(
            colorStops =
                arrayOf(
                    0f to Color(0xFF0E4683),
                    0.55f to Color(0xFF0B3A6B),
                    1f to Color(0xFF072E58),
                ),
            start = Offset(0f, 0f),
            end = Offset(Float.POSITIVE_INFINITY, Float.POSITIVE_INFINITY),
        )
}
