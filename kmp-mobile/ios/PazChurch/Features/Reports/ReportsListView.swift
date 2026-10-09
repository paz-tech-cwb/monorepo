import Shared
import SwiftUI

/// Small hub screen reached from Account → Minha Igreja → Relatórios.
/// Three entries: Casa de Paz (→ the restructured Casa de Paz reports hub), Life Group
/// (→ the existing analytics screen), and Análise Casa de Paz (→ the existing Casa de Paz
/// analytics screen, date-range filters + trend/breakdown charts). Both analytics entries are
/// leader-gated the same way the previous standalone "Relatórios" section on Account was.
struct ReportsListView: View {
    @Environment(AuthenticationCoordinator.self) private var authCoordinator

    private var isLeader: Bool {
        authCoordinator.currentUser?.role.isLeader == true
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                Spacer().frame(height: 16)

                pazMenuCard {
                    NavigationLink(destination: CasaDePazSubmissionsListView(formsRepository: IosAppContainer.shared
                            .formsRepository)) {
                        PazListRow(title: "Casa de Paz", icon: "house.fill", tint: Color(hex: "E65100"))
                    }
                    .buttonStyle(.plain)
                    if isLeader {
                        pazRowDivider
                        NavigationLink(destination: LifeGroupAnalyticsView(
                            lifeGroupId: nil,
                            analyticsRepository: IosAppContainer.shared.lifeGroupAnalyticsRepository,
                            churchRepository: IosAppContainer.shared.churchRepository
                        )) {
                            PazListRow(title: "Life Group", icon: "chart.bar.fill", tint: Color(hex: "2E7D32"))
                        }
                        .buttonStyle(.plain)
                        pazRowDivider
                        NavigationLink(destination: CasaDePazAnalyticsView(
                            analyticsRepository: IosAppContainer.shared.casaDePazAnalyticsRepository
                        )) {
                            PazListRow(title: "Análise Casa de Paz", icon: "chart.pie.fill", tint: Color(hex: "E65100"))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 20)

                Spacer().frame(height: 32)
            }
        }
        .background(PazMeshBackground())
        .navigationTitle("Relatórios")
        .navigationBarTitleDisplayMode(.large)
        .toolbarBackground(.hidden, for: .navigationBar)
    }
}

#Preview("Light") {
    NavigationStack {
        ReportsListView()
    }
    .environment(AuthenticationCoordinator(authRepository: IosAppContainer.shared.authRepository))
}

#Preview("Dark") {
    NavigationStack {
        ReportsListView()
    }
    .environment(AuthenticationCoordinator(authRepository: IosAppContainer.shared.authRepository))
    .preferredColorScheme(.dark)
}
