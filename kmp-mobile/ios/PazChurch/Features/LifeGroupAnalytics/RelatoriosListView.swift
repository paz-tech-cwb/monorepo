import Shared
import SwiftUI

/// Top-level "Relatórios" tab — visible to admins/pastors only. Lists every
/// available report with a short explanation of what it shows, rather than
/// dropping straight into a single report screen, so the tab can grow to
/// hold more reports later without changing its navigation shape.
struct RelatoriosListView: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: PazSpacing.md) {
                    Spacer().frame(height: PazSpacing.sm)

                    NavigationLink {
                        LifeGroupAnalyticsView(
                            lifeGroupId: nil,
                            analyticsRepository: IosAppContainer.shared.lifeGroupAnalyticsRepository
                        )
                    } label: {
                        ReportCard(
                            icon: "chart.bar.fill",
                            title: "Life Groups Frequency and Distribution",
                            description: "Veja quantos membros compareceram a cada reunião, a taxa de presença por mês, e como os Life Groups estão distribuídos por dia, horário, bairro e cidade."
                        )
                    }
                    .buttonStyle(.plain)

                    Spacer().frame(height: PazSpacing.xl)
                }
                .padding(.horizontal, PazSpacing.lg)
            }
            .background(PazMeshBackground())
            .navigationTitle("Relatórios")
            .navigationBarTitleDisplayMode(.large)
            .toolbarBackground(.hidden, for: .navigationBar)
        }
    }
}

private struct ReportCard: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: PazSpacing.md) {
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(PazColors.accent.opacity(0.12))
                    .frame(width: 44, height: 44)
                Image(systemName: icon)
                    .font(.system(size: 18))
                    .foregroundColor(PazColors.accent)
            }
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(PazTypography.titleSmall)
                    .foregroundColor(PazColors.ink)
                Text(description)
                    .font(PazTypography.bodySmall)
                    .foregroundColor(.gray)
            }
            Spacer()
        }
        .padding(PazSpacing.lg)
        .glassCard(radius: PazSpacing.cardRadiusCompact)
    }
}
