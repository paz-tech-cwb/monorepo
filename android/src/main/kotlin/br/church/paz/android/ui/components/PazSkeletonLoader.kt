package br.church.paz.android.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing

@Composable
private fun shimmerBrush(): Brush {
    val transition = rememberInfiniteTransition(label = "shimmer")
    val offset by transition.animateFloat(
        initialValue  = 0f,
        targetValue   = 1200f,
        animationSpec = infiniteRepeatable(
            animation  = tween(1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart,
        ),
        label = "shimmer_offset",
    )
    return Brush.linearGradient(
        colors = listOf(
            Color.LightGray.copy(alpha = 0.6f),
            Color.LightGray.copy(alpha = 0.2f),
            Color.LightGray.copy(alpha = 0.6f),
        ),
        start = Offset.Zero,
        end   = Offset(offset, offset),
    )
}

@Composable
fun PazSkeleton(
    modifier: Modifier = Modifier,
    width: Dp = Dp.Unspecified,
    height: Dp = 16.dp,
    cornerRadius: Dp = 8.dp,
) {
    val brush = shimmerBrush()
    val widthMod = if (width != Dp.Unspecified) Modifier.width(width) else Modifier.fillMaxWidth()
    Box(
        modifier = modifier
            .then(widthMod)
            .height(height)
            .clip(RoundedCornerShape(cornerRadius))
            .background(brush),
    )
}

@Composable
fun PazCardSkeleton(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(PazShapes.large)
            .background(Color.LightGray.copy(alpha = 0.15f))
            .padding(PazSpacing.Lg),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
            PazSkeleton(height = 20.dp, width = 160.dp)
            PazSkeleton(height = 14.dp, width = 200.dp)
            PazSkeleton(height = 14.dp)
        }
    }
}
