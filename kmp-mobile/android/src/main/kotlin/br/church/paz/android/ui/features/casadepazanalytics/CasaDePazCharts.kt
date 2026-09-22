package br.church.paz.android.ui.features.casadepazanalytics

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import br.church.paz.android.ui.components.PazBarChart
import br.church.paz.android.ui.components.PazBarChartEmpty
import br.church.paz.android.ui.components.PazBarChartEntry
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.CasaDePazAnalyticsSummary

private val MONTH_LABELS =
    listOf("Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez")

private fun periodLabel(period: String): String =
    period
        .split("-")
        .let { parts ->
            if (parts.size == 2) {
                val month = parts[1].toIntOrNull()?.let { MONTH_LABELS.getOrNull(it - 1) } ?: parts[1]
                "$month/${parts[0].takeLast(2)}"
            } else {
                period
            }
        }

@Composable
fun CasaDePazChartCard(
    title: String,
    content: @Composable () -> Unit,
) {
    Surface(shape = PazShapes.large, color = MaterialTheme.colorScheme.surface, modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.fillMaxWidth().padding(PazSpacing.Lg)) {
            Text(title, style = MaterialTheme.typography.titleSmall)
            Spacer(Modifier.height(PazSpacing.Md))
            content()
        }
    }
}

// "Atividade das Casas de Paz" — houses (bars) + adults/kids attendance (a
// second bar series, since PazBarChart has no line-overlay support). Mirrors
// admin-ui's casa-de-paz-trend-chart without a charting dependency.
@Composable
fun CasaDePazHousesActivityChart(summary: CasaDePazAnalyticsSummary) {
    CasaDePazChartCard(title = "Atividade das Casas de Paz") {
        if (summary.series.isEmpty()) {
            PazBarChartEmpty("Nenhuma Casa de Paz registrada no período selecionado.")
        } else {
            PazBarChart(entries = summary.series.map { PazBarChartEntry(periodLabel(it.period), it.houses.toFloat()) })
        }
    }
}

@Composable
fun CasaDePazAttendanceChart(summary: CasaDePazAnalyticsSummary) {
    CasaDePazChartCard(title = "Presenças por Mês") {
        if (summary.series.isEmpty()) {
            PazBarChartEmpty("Nenhuma Casa de Paz registrada no período selecionado.")
        } else {
            PazBarChart(
                entries =
                    summary.series.map {
                        PazBarChartEntry(periodLabel(it.period), (it.adults + it.kids).toFloat())
                    },
            )
        }
    }
}

// "Aderência de Novas Pessoas" — guests + conversions per month.
@Composable
fun CasaDePazNewPeopleChart(summary: CasaDePazAnalyticsSummary) {
    CasaDePazChartCard(title = "Aderência de Novas Pessoas") {
        if (summary.series.isEmpty()) {
            PazBarChartEmpty("Nenhuma Casa de Paz registrada no período selecionado.")
        } else {
            PazBarChart(entries = summary.series.map { PazBarChartEntry(periodLabel(it.period), it.guests.toFloat()) })
        }
    }
}

@Composable
fun CasaDePazBySectorChart(summary: CasaDePazAnalyticsSummary) {
    CasaDePazChartCard(title = "Casas de Paz por Setor") {
        if (summary.bySector.isEmpty()) {
            PazBarChartEmpty("Nenhuma Casa de Paz registrada no período selecionado.")
        } else {
            PazBarChart(entries = summary.bySector.map { PazBarChartEntry(it.label, it.houses.toFloat()) })
        }
    }
}

@Composable
fun CasaDePazByDayChart(summary: CasaDePazAnalyticsSummary) {
    CasaDePazChartCard(title = "Casas de Paz por Dia") {
        if (summary.byDay.isEmpty()) {
            PazBarChartEmpty("Nenhuma Casa de Paz registrada no período selecionado.")
        } else {
            PazBarChart(entries = summary.byDay.map { PazBarChartEntry(it.label, it.houses.toFloat()) })
        }
    }
}
