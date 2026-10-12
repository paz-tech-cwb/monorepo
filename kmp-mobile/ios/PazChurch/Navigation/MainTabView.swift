import Shared
import SwiftUI

struct MainTabView: View {
    @Environment(PushNotificationService.self) private var pushService
    @Environment(AuthenticationCoordinator.self) private var authCoordinator

    @State private var selectedTab = 0
    @State private var agendaPath: [DeepLinkDestination] = []
    @State private var accountDestination: DeepLinkDestination?

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

            AcademyView(
                academyRepository: IosAppContainer.shared.academyRepository,
                lifeGroupStudyRepository: IosAppContainer.shared.lifeGroupStudyRepository
            )
            .tabItem { Label("Academia", systemImage: "book.fill") }
            .tag(1)

            AccountView(
                userRepository: IosAppContainer.shared.userRepository,
                authRepository: IosAppContainer.shared.authRepository,
                pendingDestination: $accountDestination
            )
            .tabItem { Label("Conta", systemImage: "person.fill") }
            .tag(2)
        }
        .tint(PazColors.accent)
        // `initial: true`: on a cold start the tap is recorded while the splash is still up,
        // i.e. before this view exists, so a plain onChange would never see the value.
        .onChange(of: pushService.pendingDeepLink, initial: true) { _, newValue in
            guard newValue != nil,
                  let destination = pushService.deepLinkDestination
            else { return }
            handleDeepLink(destination)
        }
    }

    /// MainTabView is the single consumer of the pending push link: it switches the tab and, for
    /// account-stack destinations, hands the destination to AccountView through a binding.
    private func handleDeepLink(_ destination: DeepLinkDestination) {
        if destination.usesHomeStack {
            selectedTab = 0
            agendaPath = [destination]
        } else {
            selectedTab = 2
            if destination.usesAccountStack { accountDestination = destination }
        }
        pushService.consumeDeepLink()
    }

    @ViewBuilder
    private func deepLinkView(for destination: DeepLinkDestination) -> some View {
        switch destination {
        case let .agendaDetail(eventId):
            AgendaDetailDeepLinkView(
                eventId: eventId,
                agendaRepository: IosAppContainer.shared.agendaRepository
            )

        case let .formDetail(formId):
            FormDetailDeepLinkView(
                formId: formId,
                formsRepository: IosAppContainer.shared.formsRepository
            )

        case let .ministryDetail(ministryId):
            MinistryDetailDeepLinkView(
                ministryId: ministryId,
                churchRepository: IosAppContainer.shared.churchRepository
            )

        case let .lifeGroupDetail(lifeGroupId):
            LifeGroupDetailDeepLinkView(
                lifeGroupId: lifeGroupId,
                churchRepository: IosAppContainer.shared.churchRepository
            )

        case let .lifeGroupStudyDetail(studyId):
            LifeGroupStudyDetailView(
                studyId: studyId,
                repository: IosAppContainer.shared.lifeGroupStudyRepository
            )

        case let .lifeGroupAttendanceEditor(lifeGroupId, meetingDate):
            LifeGroupAttendanceEditorDeepLinkView(
                lifeGroupId: lifeGroupId,
                meetingDate: meetingDate,
                repository: IosAppContainer.shared.lifeGroupAttendanceRepository,
                onDismiss: { if !agendaPath.isEmpty { agendaPath.removeLast() } }
            )

        case let .lifeGroupTaskGuide(assignmentId):
            LifeGroupTaskGuideView(
                assignmentId: assignmentId,
                repository: IosAppContainer.shared.lifeGroupTaskRepository
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
                    .background(PazMeshBackground())
            } else {
                ContentUnavailableView(
                    "Evento não encontrado",
                    systemImage: "calendar.badge.exclamationmark"
                )
                .background(PazMeshBackground())
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
