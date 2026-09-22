package br.church.paz.android.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazSpacing

data class PazDonutSlice(
    val label: String,
    val value: Float,
    val color: Color,
)

/**
 * A palette of brand-token colors reused across every donut chart in the
 * app so "Grupos por Setor" / "Membros com e sem Grupo" always match the
 * design system rather than arbitrary hues.
 */
val PazDonutPalette =
    listOf(
        PazColors.PrimaryMid,
        PazColors.Accent,
        PazColors.Gold,
        PazColors.Sky,
        PazColors.GoldLight,
        PazColors.Success,
    )

/**
 * Minimal hand-rolled donut chart — mirrors PazBarChart's decision to draw
 * directly on Canvas rather than adding a charting dependency. Renders arcs
 * proportional to each slice's value plus a label legend below.
 */
@Composable
fun PazDonutChart(
    slices: List<PazDonutSlice>,
    modifier: Modifier = Modifier,
    diameter: androidx.compose.ui.unit.Dp = 160.dp,
) {
    val total = slices.sumOf { it.value.toDouble() }.toFloat()
    if (slices.isEmpty() || total <= 0f) return

    Column(modifier = modifier.fillMaxWidth()) {
        Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            Canvas(modifier = Modifier.size(diameter)) {
                val strokeWidth = size.minDimension * 0.22f
                val arcSize = Size(size.width - strokeWidth, size.height - strokeWidth)
                val topLeft = Offset(strokeWidth / 2, strokeWidth / 2)
                var startAngle = -90f
                slices.forEach { slice ->
                    val sweep = (slice.value / total) * 360f
                    drawArc(
                        color = slice.color,
                        startAngle = startAngle,
                        sweepAngle = sweep,
                        useCenter = false,
                        topLeft = topLeft,
                        size = arcSize,
                        style =
                            androidx.compose.ui.graphics.drawscope
                                .Stroke(width = strokeWidth),
                    )
                    startAngle += sweep
                }
            }
        }

        Spacer(modifier = Modifier.height(PazSpacing.Md))

        Column(verticalArrangement = Arrangement.spacedBy(PazSpacing.Xs)) {
            slices.forEach { slice ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier =
                            Modifier
                                .size(10.dp)
                                .background(slice.color, CircleShape),
                    )
                    Spacer(modifier = Modifier.width(PazSpacing.Xs))
                    Text(
                        text = slice.label,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.weight(1f),
                    )
                    Text(
                        text = slice.value.toInt().toString(),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                    )
                }
            }
        }
    }
}

@Composable
fun PazDonutChartEmpty(
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
