import Shared
import SwiftUI

struct MainTabView: View {
    @Environment(PushNotificationService.self) private var pushService
    @Environment(AuthenticationCoordinator.self) private var authCoordinator

    @State private var selectedTab = 0
    @State private var agendaPath: [DeepLinkDestination] = []

    var body: some View {
        TabView(selection: $selectedTab) {
            NavigationStack(path: $agendaPath) {
                HomeView(
                    homeRepository: IosAppContainer.shared.homeRepository,
                    authRepository: IosAppContainer.shared.authRepository
                )
                .navigationDestination(for: DeepLinkDestination.self) { destination in
                    deepLinkView(for: destination)
                }
            }
            .tabItem { Label("Início", systemImage: "house.fill") }
            .tag(0)

            AcademyView(academyRepository: IosAppContainer.shared.academyRepository)
                .tabItem { Label("Academia", systemImage: "book.fill") }
                .tag(1)

            AccountView(
                userRepository: IosAppContainer.shared.userRepository,
                authRepository: IosAppContainer.shared.authRepository
            )
            .tabItem { Label("Conta", systemImage: "person.fill") }
            .tag(2)
        }
        .tint(PazColors.pazPrimaryLight)
        .onChange(of: pushService.pendingDeepLink) { _, newValue in
            guard newValue != nil,
                  let destination = pushService.deepLinkDestination
            else { return }
            handleDeepLink(destination, consume: destination.isAgendaDestination)
        }
    }

    private func handleDeepLink(_ destination: DeepLinkDestination, consume: Bool) {
        switch destination {
        case .agendaDetail:
            selectedTab = 0
            agendaPath = [destination]
        case .formDetail, .ministryDetail, .lifeGroupDetail, .formularios, .memberJourney, .account:
            // Switch tab only — AccountView observes pendingDeepLink and pushes its own path
            selectedTab = 2
        }
        if consume { pushService.consumeDeepLink() }
    }

    @ViewBuilder
    private func deepLinkView(for destination: DeepLinkDestination) -> some View {
        switch destination {
        case .agendaDetail(let eventId):
            AgendaDetailDeepLinkView(
                eventId: eventId,
                agendaRepository: IosAppContainer.shared.agendaRepository
            )
        case .formDetail(let formId):
            FormDetailDeepLinkView(
                formId: formId,
                formsRepository: IosAppContainer.shared.formsRepository
            )
        case .ministryDetail(let ministryId):
            MinistryDetailDeepLinkView(
                ministryId: ministryId,
                churchRepository: IosAppContainer.shared.churchRepository
            )
        case .lifeGroupDetail(let lifeGroupId):
            LifeGroupDetailDeepLinkView(
                lifeGroupId: lifeGroupId,
                churchRepository: IosAppContainer.shared.churchRepository
            )
        default:
            EmptyView()
        }
    }
}

// MARK: - AgendaDetailDeepLinkView

/// Fetches the event list, finds the matching event by ID, then renders AgendaDetailView.
/// Shown only when arriving via a push notification deep link.
private struct AgendaDetailDeepLinkView: View {
    let eventId: String
    let agendaRepository: AgendaRepository

    @State private var event: AgendaEvent?
    @State private var isLoading = true
    @State private var hasFailed = false

    var body: some View {
        Group {
            if let event {
                AgendaDetailView(event: event)
            } else if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(PazColors.background)
            } else {
                ContentUnavailableView(
                    "Evento não encontrado",
                    systemImage: "calendar.badge.exclamationmark"
                )
                .background(PazColors.background)
            }
        }
        .task {
            await fetchEvent()
        }
    }

    private func fetchEvent() async {
        do {
            let events = try await agendaRepository.getEvents(page: 1, limit: 50)
            event = events.first { $0.id == eventId }
        } catch {
            hasFailed = true
        }
        isLoading = false
    }
}


#Preview {
    MainTabView()
        .environment(AuthenticationCoordinator(authRepository: IosAppContainer.shared.authRepository))
        .environment(PushNotificationService.shared)
}
