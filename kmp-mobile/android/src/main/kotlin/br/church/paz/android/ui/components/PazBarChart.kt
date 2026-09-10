package br.church.paz.android.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazSpacing
import kotlin.math.min

data class PazBarChartEntry(
    val label: String,
    val value: Float,
)

/**
 * Minimal hand-rolled bar chart — no charting dependency exists in this app
 * (Android or iOS), so this is built directly on Canvas rather than pulling
 * one in for two charts. Renders vertical bars with a baseline and value
 * labels; deliberately simple (no axes/gridlines/animation) to match the
 * project's existing custom-drawn components (see PazCarousel).
 */
@Composable
fun PazBarChart(
    entries: List<PazBarChartEntry>,
    modifier: Modifier = Modifier,
    barColor: androidx.compose.ui.graphics.Color = PazColors.Primary,
    height: androidx.compose.ui.unit.Dp = 220.dp,
) {
    if (entries.isEmpty()) return
    val maxValue = (entries.maxOfOrNull { it.value } ?: 0f).coerceAtLeast(1f)

    val barCount = entries.size

    BoxWithConstraints(modifier = modifier.fillMaxWidth()) {
        val density = androidx.compose.ui.platform.LocalDensity.current
        // Clamp the gap so it shrinks (instead of the bar width going
        // negative) once there are many bars in a narrow chart.
        val gapPx = with(density) { min(8.dp.toPx(), constraints.maxWidth / (barCount * 4f)) }
        val gapDp = with(density) { gapPx.toDp() }
        val barWidthDp =
            with(density) {
                ((constraints.maxWidth - gapPx * (barCount - 1)) / barCount).toDp()
            }

        Column(modifier = Modifier.fillMaxWidth()) {
            Canvas(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .height(height),
            ) {
                val gap = gapPx
                val barWidth = barWidthDp.toPx()

                drawLine(
                    color = barColor.copy(alpha = 0.15f),
                    start = Offset(0f, size.height),
                    end = Offset(size.width, size.height),
                    strokeWidth = 1.dp.toPx(),
                )

                entries.forEachIndexed { index, entry ->
                    val barHeight = (entry.value / maxValue) * size.height
                    val left = index * (barWidth + gap)
                    drawRoundRect(
                        color = barColor,
                        topLeft = Offset(left, size.height - barHeight),
                        size = Size(barWidth, barHeight),
                        cornerRadius =
                            androidx.compose.ui.geometry
                                .CornerRadius(6.dp.toPx(), 6.dp.toPx()),
                    )
                }
            }

            Spacer(PazSpacing.Xs)

            // Labels use the same per-bar width/gap math as the bars above so
            // they stay aligned instead of drifting via independent
            // SpaceBetween/weight layout.
            Row(modifier = Modifier.fillMaxWidth()) {
                entries.forEachIndexed { index, entry ->
                    Text(
                        text = entry.label,
                        style = MaterialTheme.typography.labelSmall,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.width(barWidthDp),
                    )
                    if (index != entries.lastIndex) {
                        Box(Modifier.width(gapDp))
                    }
                }
            }
        }
    }
}

@Composable
private fun Spacer(size: androidx.compose.ui.unit.Dp) {
    Box(Modifier.height(size))
}

@Composable
fun PazBarChartEmpty(
    message: String,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier.fillMaxWidth().padding(PazSpacing.Lg),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = message,
            style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)),
            textAlign = TextAlign.Center,
        )
    }
}
