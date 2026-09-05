package br.church.paz.android.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.unit.dp

val LocalPazDarkTheme = staticCompositionLocalOf { false }

val PazShapes =
    Shapes(
        extraSmall = RoundedCornerShape(4.dp),
        small = RoundedCornerShape(8.dp),
        medium = RoundedCornerShape(10.dp),
        large = RoundedCornerShape(16.dp),
        extraLarge = RoundedCornerShape(22.dp),
    )
val PazShapeXxl = RoundedCornerShape(30.dp)
val PazShapePill = RoundedCornerShape(999.dp)

object PazSpacing {
    val Xs = 4.dp
    val Sm = 8.dp
    val Md = 12.dp
    val Lg = 16.dp
    val Xl = 24.dp
    val Xxl = 32.dp
    val Xxxl = 48.dp
    val PageHorizontal = Lg
    val CardGap = Md
}

@Composable
fun PazTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    CompositionLocalProvider(LocalPazDarkTheme provides darkTheme) {
        MaterialTheme(
            colorScheme = if (darkTheme) PazDarkColorScheme else PazLightColorScheme,
            typography = PazTypography,
            shapes = PazShapes,
            content = content,
        )
    }
}
