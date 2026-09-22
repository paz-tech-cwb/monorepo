import Shared
import SwiftUI

/// Mirrors casa-de-paz-report.tsx's five stat cards exactly — growth badges
/// come straight from the backend's `growth` object (server-computed
/// (current - previous) / previous, null when there's no previous-period
/// data), never recomputed on-device.
struct CasaDePazStatCards: View {
    let summary: CasaDePazAnalyticsSummary

    var body: some View {
        VStack(spacing: 12) {
            PazStatCard(
                title: "Vidas Alcançadas",
                value: "\(summary.totals.lives)",
                subtitle: "crianças + convidados",
                icon: "heart.fill",
                growth: summary.growth.lives?.doubleValue
            )
            PazStatCard(
                title: "Casas de Paz",
                value: "\(summary.totals.houses)",
                subtitle: "realizadas no período",
                icon: "house.fill",
                growth: summary.growth.houses?.doubleValue
            )
            CasaDePazPresencasCard(
                kids: Int(summary.totals.kids),
                guests: Int(summary.totals.guests),
                guestsGrowth: summary.growth.guests?.doubleValue
            )
            PazStatCard(
                title: "Conversões",
                value: "\(summary.totals.conversions)",
                subtitle: "decisões registradas",
                icon: "person.fill.badge.plus",
                growth: summary.growth.conversions?.doubleValue
            )
            PazStatCard(
                title: "Taxa de Conversão",
                value: "\(Int((summary.totals.conversionRate * 100).rounded()))%",
                subtitle: "conversões sobre convidados",
                icon: "chart.line.uptrend.xyaxis"
            )
        }
    }
}

/// "Presenças" card — matches admin-ui's casa-de-paz-report.tsx breakdown-row
/// layout for this card (Crianças / Convidados rows) instead of a single
/// headline number, because the growth badge is `growth.guests` (guest
/// growth), not a combined growth. A single "kids+guests" headline paired
/// with a guests-only badge reads as "+N% presences," which is misleading —
/// the breakdown rows put the Convidados count directly above its own badge
/// so the number the badge describes is always visible next to it.
struct CasaDePazPresencasCard: View {
    let kids: Int
    let guests: Int
    let guestsGrowth: Double?

    var body: some View {
        VStack(alignment: .leading, spacing: PazSpacing.xs) {
            HStack {
                Text("Presenças")
                    .font(PazTypography.bodySmall)
                    .foregroundStyle(PazColors.slate)
                Spacer()
                Image(systemName: "person.3.fill")
                    .foregroundStyle(PazColors.slate)
            }

            breakdownRow(label: "Crianças", value: "\(kids)")

            HStack(spacing: PazSpacing.xs) {
                Text("Convidados")
                    .font(PazTypography.bodySmall)
                    .foregroundStyle(PazColors.slate)
                Spacer()
                Text("\(guests)")
                    .font(PazTypography.bodyMedium)
                    .foregroundStyle(PazColors.ink)
                if let guestsGrowth {
                    PazGrowthBadge(growth: guestsGrowth)
                }
            }
        }
        .padding(PazSpacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassCard(radius: PazSpacing.cardRadiusCompact)
    }

    private func breakdownRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(PazTypography.bodySmall)
                .foregroundStyle(PazColors.slate)
            Spacer()
            Text(value)
                .font(PazTypography.bodyMedium)
                .foregroundStyle(PazColors.ink)
        }
    }
}
