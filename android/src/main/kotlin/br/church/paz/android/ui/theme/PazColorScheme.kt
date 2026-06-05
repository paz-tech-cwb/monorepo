package br.church.paz.android.ui.theme

import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.ui.graphics.Color

val PazLightColorScheme =
    lightColorScheme(
        primary = PazColors.Primary,
        onPrimary = Color.White,
        primaryContainer = PazColors.PrimaryContainer,
        onPrimaryContainer = PazColors.Primary,
        secondary = PazColors.Accent,
        onSecondary = Color.White,
        secondaryContainer = PazColors.SecondaryContainer,
        onSecondaryContainer = PazColors.PrimaryMid,
        tertiary = PazColors.Gold,
        onTertiary = Color(0xFF140E00),
        background = PazColors.Background,
        onBackground = PazColors.OnSurface,
        surface = PazColors.Surface,
        onSurface = PazColors.OnSurface,
        surfaceVariant = PazColors.PrimaryTint,
        onSurfaceVariant = PazColors.OnSurface2,
        outline = PazColors.Border,
        outlineVariant = PazColors.Muted,
        error = PazColors.Error,
        onError = Color.White,
        errorContainer = PazColors.ErrorTint,
        onErrorContainer = PazColors.Error,
        scrim = Color(0x99000000),
        surfaceTint = Color.Transparent,
    )

val PazDarkColorScheme =
    darkColorScheme(
        primary = PazColors.PrimaryLight,
        onPrimary = Color.White,
        primaryContainer = PazColors.DarkPrimaryContainer,
        onPrimaryContainer = Color.White,
        secondary = PazColors.Accent,
        onSecondary = Color.White,
        secondaryContainer = PazColors.DarkSecondaryContainer,
        onSecondaryContainer = Color.White,
        tertiary = PazColors.Gold,
        onTertiary = Color(0xFF140E00),
        background = PazColors.DarkBackground,
        onBackground = PazColors.DarkOnBackground,
        surface = PazColors.DarkSurface,
        onSurface = PazColors.DarkOnBackground,
        surfaceVariant = PazColors.DarkSurface2,
        onSurfaceVariant = PazColors.DarkOnSurface,
        outline = PazColors.DarkBorder,
        outlineVariant = PazColors.DarkMuted,
        error = PazColors.DarkError,
        onError = PazColors.DarkBackground,
        errorContainer = Color(0xFF4D1212),
        onErrorContainer = PazColors.DarkError,
        scrim = Color.Black,
        surfaceTint = Color.Transparent,
    )
