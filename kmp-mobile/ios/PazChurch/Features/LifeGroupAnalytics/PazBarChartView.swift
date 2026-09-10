import SwiftUI

struct PazBarChartEntry: Identifiable {
    let label: String
    let value: Double
    var displayValue: String?

    var id: String { label }
}

/// Minimal hand-rolled bar chart — mirrors the Android PazBarChart component.
/// No charting dependency exists anywhere in this app, so both platforms
/// draw bars directly rather than pulling one in for two charts.
struct PazBarChartView: View {
    let entries: [PazBarChartEntry]
    var barColor: Color = PazColors.accent
    var height: CGFloat = 200

    private var maxValue: Double {
        max(entries.map(\.value).max() ?? 0, 1)
    }

    /// Reserve room above the tallest bar for its value label so it never
    /// gets clipped by the chart's fixed height.
    private var barAreaHeight: CGFloat { height - 18 }

    private func formattedValue(_ value: Double) -> String {
        value == value.rounded() ? String(Int(value)) : String(format: "%.1f", value)
    }

    var body: some View {
        VStack(spacing: 8) {
            HStack(alignment: .bottom, spacing: 6) {
                ForEach(entries) { entry in
                    VStack(spacing: 4) {
                        Spacer(minLength: 0)
                        Text(entry.displayValue ?? formattedValue(entry.value))
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundStyle(PazColors.ink)
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                        RoundedRectangle(cornerRadius: 4)
                            .fill(barColor)
                            .frame(height: max(2, CGFloat(entry.value / maxValue) * barAreaHeight))
                    }
                }
            }
            .frame(height: height, alignment: .bottom)

            HStack(spacing: 6) {
                ForEach(entries) { entry in
                    Text(entry.label)
                        .font(PazTypography.bodySmall)
                        .foregroundStyle(PazColors.slate)
                        .frame(maxWidth: .infinity)
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                }
            }
        }
    }
}

struct PazBarChartEmptyView: View {
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
