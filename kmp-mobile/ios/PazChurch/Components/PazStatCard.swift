import SwiftUI

/// A single metric card shared by the Life Group and Casa de Paz reports —
/// title + icon header, a large value (with an optional "/ total" secondary
/// value), a subtitle, and an optional growth badge. Mirrors the Android
/// `PazStatCard` composable.
struct PazStatCard: View {
    let title: String
    let value: String
    let subtitle: String
    let icon: String
    var secondaryValue: String?
    /// Percent change vs. the previous period, already computed server-side.
    /// `nil` means "no previous-period data" — render no badge at all.
    var growth: Double?

    var body: some View {
        VStack(alignment: .leading, spacing: PazSpacing.xs) {
            HStack {
                Text(title)
                    .font(PazTypography.bodySmall)
                    .foregroundStyle(PazColors.slate)
                Spacer()
                Image(systemName: icon)
                    .foregroundStyle(PazColors.slate)
            }

            HStack(alignment: .lastTextBaseline, spacing: 4) {
                Text(value)
                    .font(PazTypography.titleLarge)
                    .foregroundStyle(PazColors.ink)
                if let secondaryValue {
                    Text("/ \(secondaryValue)")
                        .font(PazTypography.bodyMedium)
                        .foregroundStyle(PazColors.slate)
                }
            }

            HStack(spacing: PazSpacing.xs) {
                Text(subtitle)
                    .font(PazTypography.bodySmall)
                    .foregroundStyle(PazColors.slate)
                    .lineLimit(2)
                if let growth {
                    PazGrowthBadge(growth: growth)
                }
            }
        }
        .padding(PazSpacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassCard(radius: PazSpacing.cardRadiusCompact)
    }
}

/// Percentage growth badge — green for positive, red for negative, neutral
/// gray for exactly zero ("estável"). Callers must only pass a non-null
/// value; `nil` growth (no previous-period data) should render no badge.
struct PazGrowthBadge: View {
    let growth: Double

    private var percent: Int {
        Int((growth * 100).rounded())
    }

    private var label: String {
        if percent > 0 { return "+\(percent)%" }
        if percent < 0 { return "\(percent)%" }
        return "estável"
    }

    private var color: Color {
        if percent > 0 { return PazColors.success }
        if percent < 0 { return PazColors.error }
        return PazColors.slate
    }

    var body: some View {
        Text(label)
            .font(PazTypography.bodySmall)
            .foregroundStyle(color)
            .padding(.horizontal, PazSpacing.xs)
            .padding(.vertical, 2)
            .background(color.opacity(0.12))
            .clipShape(Capsule())
    }
}
