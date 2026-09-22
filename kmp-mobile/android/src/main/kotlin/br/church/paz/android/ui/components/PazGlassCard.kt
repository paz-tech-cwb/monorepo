package br.church.paz.android.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import br.church.paz.android.ui.theme.LocalPazDarkTheme
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazSpacing

/**
 * Translucent "glass" surface — the Compose counterpart of iOS `PazMaterial.glass`
 * (`.thinMaterial` in light mode, `.ultraThinMaterial` in dark mode) applied to
 * card-sized content, meant to sit over [PazMeshBackground].
 *
 * Compose has no first-class backdrop-blur-through-content material, so this
 * approximates the same visual tier with a translucent [PazColors.Surface] fill
 * plus a hairline border, matched to iOS's per-scheme opacity tiers.
 */
@Composable
fun PazGlassCard(
    modifier: Modifier = Modifier,
    cornerRadius: Dp = PazSpacing.CardRadiusCompact,
    content: @Composable () -> Unit,
) {
    val isDark = LocalPazDarkTheme.current
    val shape = RoundedCornerShape(cornerRadius)

    // Mirrors PazMaterial: dark mode stays thinner/more translucent (ultraThinMaterial),
    // light mode steps up to a more opaque fill (thinMaterial) for foreground contrast.
    val fillColor = if (isDark) PazColors.DarkSurface else PazColors.Surface
    val fillAlpha = if (isDark) 0.55f else 0.72f
    val borderColor = if (isDark) PazColors.DarkBorder else PazColors.Border
    val borderAlpha = if (isDark) 0.60f else 0.80f

    Box(
        modifier =
            modifier
                .clip(shape)
                .background(fillColor.copy(alpha = fillAlpha))
                .border(1.dp, borderColor.copy(alpha = borderAlpha), shape),
    ) {
        content()
    }
}

/** Chip/badge-sized glass tier — same opacity as [PazGlassCard] per iOS `PazMaterial.chip`. */
@Composable
fun PazGlassChip(
    modifier: Modifier = Modifier,
    cornerRadius: Dp = 999.dp,
    content: @Composable () -> Unit,
) {
    PazGlassCard(modifier = modifier, cornerRadius = cornerRadius, content = content)
}
