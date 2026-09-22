import Charts
import SwiftUI

/// A single data point in a bar/line series chart. Used by both
/// `PazTrendChart` (bars + optional line overlays) and
/// `PazHorizontalBarChart`.
struct PazChartSeriesPoint: Identifiable {
    let id = UUID()
    let label: String
    let value: Double
    /// Distinguishes multiple metrics plotted in the same chart (e.g.
    /// "Casas" vs "Adultos") — drives the legend / color mapping.
    let series: String
}

/// A trend chart combining bars (first series) with line overlays (the
/// remaining series) over a shared category axis — mirrors admin-ui's
/// recharts ComposedChart trend charts (casa-de-paz-trend-chart.tsx) using
/// Swift Charts' BarMark/LineMark instead of a hand-rolled Canvas, since
/// this screen benefits from real multi-series overlay support that
/// PazBarChartView doesn't provide.
struct PazTrendChart: View {
    /// The series rendered as bars — typically the "volume" metric (e.g.
    /// "Casas de Paz").
    let barSeries: [PazChartSeriesPoint]
    /// The series rendered as line overlays — typically headcount metrics.
    let lineSeries: [PazChartSeriesPoint]
    var barColor: Color = PazColors.accent
    var lineColors: [Color] = [PazColors.pazPrimaryMid, PazColors.pazGold]

    var body: some View {
        Chart {
            ForEach(barSeries) { point in
                BarMark(
                    x: .value("Período", point.label),
                    y: .value(point.series, point.value)
                )
                .foregroundStyle(barColor.opacity(0.4))
            }
            ForEach(Array(Set(lineSeries.map(\.series))).sorted(), id: \.self) { seriesName in
                ForEach(lineSeries.filter { $0.series == seriesName }) { point in
                    LineMark(
                        x: .value("Período", point.label),
                        y: .value(seriesName, point.value)
                    )
                    .foregroundStyle(by: .value("Série", seriesName))
                    .symbol(by: .value("Série", seriesName))
                }
            }
        }
        .chartLegend(position: .bottom)
        .frame(height: 220)
    }
}

/// A horizontal bar chart — mirrors admin-ui's horizontal bar charts (e.g.
/// "Casas de Paz por Setor").
struct PazHorizontalBarChart: View {
    let entries: [PazChartSeriesPoint]
    var barColor: Color = PazColors.accent

    var body: some View {
        Chart(entries) { entry in
            BarMark(
                x: .value("Valor", entry.value),
                y: .value("Categoria", entry.label)
            )
            .foregroundStyle(barColor)
        }
        .frame(height: CGFloat(max(entries.count, 1)) * 36 + 20)
    }
}

/// A donut chart slice.
struct PazDonutSlice: Identifiable {
    let id = UUID()
    let label: String
    let value: Double
    let color: Color
}

/// A donut chart built on Swift Charts' `SectorMark` — used by "Grupos por
/// Setor" and "Membros com e sem Grupo" on the Life Group report.
struct PazDonutChart: View {
    let slices: [PazDonutSlice]

    var body: some View {
        VStack(alignment: .leading, spacing: PazSpacing.md) {
            Chart(slices) { slice in
                SectorMark(
                    angle: .value("Valor", slice.value),
                    innerRadius: .ratio(0.6),
                    angularInset: 1.5
                )
                .foregroundStyle(slice.color)
            }
            .frame(height: 160)

            ForEach(slices) { slice in
                HStack(spacing: PazSpacing.xs) {
                    Circle().fill(slice.color).frame(width: 10, height: 10)
                    Text(slice.label)
                        .font(PazTypography.bodySmall)
                        .foregroundStyle(PazColors.ink)
                    Spacer()
                    Text("\(Int(slice.value))")
                        .font(PazTypography.bodySmall)
                        .foregroundStyle(PazColors.slate)
                }
            }
        }
    }
}

/// Shared brand-token palette for donut slices, reused across every donut
/// chart so colors stay consistent with the design system instead of
/// arbitrary hues.
enum PazDonutPalette {
    static let colors: [Color] = [
        PazColors.pazPrimaryMid,
        PazColors.accent,
        PazColors.pazGold,
        PazColors.pazSky,
        PazColors.pazPrimaryLight,
        PazColors.success,
    ]
}

struct PazChartEmptyView: View {
    let message: String

    var body: some View {
        Text(message)
            .font(PazTypography.bodySmall)
            .foregroundStyle(PazColors.slate)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 24)
    }
}
