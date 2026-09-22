package br.church.paz.android.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing

/**
 * A single metric card used by both the Life Group and Casa de Paz reports —
 * title + icon header, a large value, an optional secondary value (e.g.
 * "X / Y"), a subtitle, and an optional growth badge.
 */
@Composable
fun PazStatCard(
    title: String,
    value: String,
    subtitle: String,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    secondaryValue: String? = null,
    growth: Double? = null,
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = PazShapes.large,
        color = MaterialTheme.colorScheme.surface,
    ) {
        Column(Modifier.padding(PazSpacing.Lg)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = androidx.compose.foundation.layout.Arrangement.SpaceBetween,
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                )
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                    modifier = Modifier.height(18.dp),
                )
            }
            Spacer(Modifier.height(PazSpacing.Xs))
            Row(verticalAlignment = androidx.compose.ui.Alignment.Bottom) {
                Text(text = value, style = MaterialTheme.typography.headlineSmall)
                if (secondaryValue != null) {
                    Text(
                        text = " / $secondaryValue",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                    )
                }
            }
            Spacer(Modifier.height(2.dp))
            Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                    modifier = Modifier.weight(1f, fill = false),
                )
                growth?.let { PazGrowthBadge(it) }
            }
        }
    }
}

/**
 * Percentage growth badge — green for positive, red for negative, neutral
 * gray for exactly zero ("estável"). Callers must only pass a non-null value
 * (see backend comparison semantics: null means "no previous-period data,"
 * which callers should render as no badge at all).
 */
@Composable
fun PazGrowthBadge(
    growth: Double,
    modifier: Modifier = Modifier,
) {
    val percent = kotlin.math.round(growth * 100).toInt()
    val (label, color) =
        when {
            percent > 0 -> "+$percent%" to PazColors.Success
            percent < 0 -> "$percent%" to PazColors.Error
            else -> "estável" to MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
        }
    Surface(
        modifier = modifier.padding(start = PazSpacing.Xs),
        shape = RoundedCornerShape(50),
        color = color.copy(alpha = 0.12f),
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = color,
            modifier = Modifier.padding(horizontal = PazSpacing.Xs, vertical = 2.dp),
        )
    }
}
