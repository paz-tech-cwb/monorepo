import Shared
import SwiftUI

private let monthLabels = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez",
]

private func periodLabel(_ period: String) -> String {
    let parts = period.split(separator: "-")
    guard parts.count == 2, let monthIndex = Int(parts[1]), monthLabels.indices.contains(monthIndex - 1) else {
        return period
    }
    return "\(monthLabels[monthIndex - 1])/\(parts[0].suffix(2))"
}

/// The full set of charts for the Casa de Paz report — mirrors admin-ui's
/// casa-de-paz-trend-chart / casa-de-paz-breakdown-charts, but `by_time`
/// ("Horário") is intentionally not rendered: it was removed from admin-ui
/// (commit 4494359) and must not be reintroduced on mobile.
struct CasaDePazCharts: View {
    let summary: CasaDePazAnalyticsSummary

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            chartCard(title: "Atividade das Casas de Paz") {
                if summary.series.isEmpty {
                    PazChartEmptyView(message: "Nenhuma Casa de Paz registrada no período selecionado.")
                } else {
                    PazTrendChart(
                        barSeries: summary.series.map {
                            PazChartSeriesPoint(
                                label: periodLabel($0.period),
                                value: Double($0.houses),
                                series: "Casas"
                            )
                        },
                        lineSeries: summary.series.flatMap { point -> [PazChartSeriesPoint] in
                            let label = periodLabel(point.period)
                            return [
                                PazChartSeriesPoint(label: label, value: Double(point.adults), series: "Adultos"),
                                PazChartSeriesPoint(label: label, value: Double(point.kids), series: "Crianças"),
                            ]
                        }
                    )
                }
            }

            chartCard(title: "Aderência de Novas Pessoas") {
                if summary.series.isEmpty {
                    PazChartEmptyView(message: "Nenhuma Casa de Paz registrada no período selecionado.")
                } else {
                    PazTrendChart(
                        barSeries: [],
                        lineSeries: summary.series.flatMap { point -> [PazChartSeriesPoint] in
                            let label = periodLabel(point.period)
                            return [
                                PazChartSeriesPoint(label: label, value: Double(point.guests), series: "Convidados"),
                                PazChartSeriesPoint(
                                    label: label,
                                    value: Double(point.conversions),
                                    series: "Conversões"
                                ),
                            ]
                        }
                    )
                }
            }

            chartCard(title: "Casas de Paz por Setor") {
                if summary.bySector.isEmpty {
                    PazChartEmptyView(message: "Nenhuma Casa de Paz registrada no período selecionado.")
                } else {
                    PazHorizontalBarChart(
                        entries: summary.bySector.map {
                            PazChartSeriesPoint(label: $0.label, value: Double($0.houses), series: "Casas")
                        }
                    )
                }
            }

            chartCard(title: "Casas de Paz por Dia") {
                if summary.byDay.isEmpty {
                    PazChartEmptyView(message: "Nenhuma Casa de Paz registrada no período selecionado.")
                } else {
                    PazHorizontalBarChart(
                        entries: summary.byDay.map {
                            PazChartSeriesPoint(label: $0.label, value: Double($0.houses), series: "Casas")
                        }
                    )
                }
            }
        }
    }

    private func chartCard(title: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title).font(PazTypography.titleSmall).foregroundStyle(PazColors.ink)
            content()
        }
        .padding(16)
        .glassCard(radius: PazSpacing.cardRadiusCompact)
    }
}
