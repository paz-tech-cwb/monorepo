package br.church.paz.android.ui.features.casadepazanalytics

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import br.church.paz.android.ui.components.PazGrowthBadge
import br.church.paz.android.ui.components.PazStatCard
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.CasaDePazAnalyticsSummary
import kotlin.math.roundToInt

/**
 * Mirrors casa-de-paz-report.tsx's five stat cards exactly — growth badges
 * come straight from the backend's `growth` object (server-computed
 * (current - previous) / previous, null when there's no previous-period
 * data), never recomputed on-device.
 */
@Composable
fun CasaDePazStatCards(summary: CasaDePazAnalyticsSummary) {
    Column(verticalArrangement = Arrangement.spacedBy(PazSpacing.Md)) {
        PazStatCard(
            title = "Vidas Alcançadas",
            value = summary.totals.lives.toString(),
            subtitle = "adultos + crianças + convidados",
            icon = Icons.Filled.Favorite,
            growth = summary.growth.lives,
        )
        PazStatCard(
            title = "Casas de Paz",
            value = summary.totals.houses.toString(),
            subtitle = "realizadas no período",
            icon = Icons.Filled.Home,
            growth = summary.growth.houses,
        )
        CasaDePazPresencasCard(
            adults = summary.totals.adults,
            kids = summary.totals.kids,
            guests = summary.totals.guests,
            guestsGrowth = summary.growth.guests,
        )
        PazStatCard(
            title = "Conversões",
            value = summary.totals.conversions.toString(),
            subtitle = "decisões registradas",
            icon = Icons.Filled.PersonAdd,
            growth = summary.growth.conversions,
        )
        PazStatCard(
            title = "Taxa de Conversão",
            value = "${(summary.totals.conversionRate * 100).roundToInt()}%",
            subtitle = "conversões sobre convidados",
            icon = Icons.Filled.TrendingUp,
        )
    }
}

/**
 * "Presenças" card — matches admin-ui's casa-de-paz-report.tsx breakdown-row
 * layout for this card (Adultos / Crianças / Convidados rows) instead of a
 * single headline number, because the growth badge is `growth.guests` (guest
 * growth), not growth for adults+kids. A single "adults+kids" headline
 * paired with a guests-only badge reads as "+N% presences," which is
 * misleading — the breakdown rows put the Convidados count directly above
 * its own badge so the number the badge describes is always visible next to
 * it.
 */
@Composable
private fun CasaDePazPresencasCard(
    adults: Int,
    kids: Int,
    guests: Int,
    guestsGrowth: Double?,
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = PazShapes.large,
        color = MaterialTheme.colorScheme.surface,
    ) {
        Column(Modifier.padding(PazSpacing.Lg)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    text = "Presenças",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                )
                Icon(
                    imageVector = Icons.Filled.Groups,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                    modifier = Modifier.height(18.dp),
                )
            }
            Spacer(Modifier.height(PazSpacing.Xs))
            CasaDePazBreakdownRow(label = "Adultos", value = adults.toString())
            CasaDePazBreakdownRow(label = "Crianças", value = kids.toString())
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "Convidados",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = guests.toString(),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    guestsGrowth?.let { PazGrowthBadge(it) }
                }
            }
        }
    }
}

@Composable
private fun CasaDePazBreakdownRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }
}
