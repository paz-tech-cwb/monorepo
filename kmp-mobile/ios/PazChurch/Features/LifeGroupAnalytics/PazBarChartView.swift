import SwiftUI

struct PazBarChartEntry: Identifiable {
    let label: String
    let value: Double

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

    var body: some View {
        VStack(spacing: 8) {
            HStack(alignment: .bottom, spacing: 6) {
                ForEach(entries) { entry in
                    VStack {
                        Spacer(minLength: 0)
                        RoundedRectangle(cornerRadius: 4)
                            .fill(barColor)
                            .frame(height: max(2, CGFloat(entry.value / maxValue) * height))
                    }
                }
            }
            .frame(height: height)

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
