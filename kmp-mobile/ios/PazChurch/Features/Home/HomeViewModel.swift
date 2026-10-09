import Observation
import Shared
import SwiftUI

@MainActor
@Observable
class HomeViewModel {
    var homeContent: HomeContent?
    var userName = ""
    var isLoading = true
    var error: String?
    // Any leadership role (role.isLeader) — gates the "Relatórios de Grupos
    // de Vida" shortcut card.
    var canManage = false
    /// Shown only when `getMyLifeGroups()` succeeded AND came back empty —
    /// an error fetching the viewer's groups must never be read as "no
    /// group", since that would wrongly nudge an existing member to
    /// "discover" a group they already belong to.
    var showLifeGroupDiscoveryCTA = false

    // Full upcoming agenda (recurrence-expanded, paginated), loaded lazily
    // the first time the home agenda section is expanded.
    var isAgendaExpanded = false
    var isLoadingFullAgenda = false
    var fullAgendaEvents: [AgendaEvent] = []
    var fullAgendaLoadError: String?

    private let homeRepository: HomeRepository
    private let authRepository: AuthRepository
    private let agendaRepository: AgendaRepository
    private let churchRepository: ChurchRepository

    init(
        homeRepository: HomeRepository,
        authRepository: AuthRepository,
        agendaRepository: AgendaRepository,
        churchRepository: ChurchRepository
    ) {
        self.homeRepository = homeRepository
        self.authRepository = authRepository
        self.agendaRepository = agendaRepository
        self.churchRepository = churchRepository
    }

    /// Called by the view's .task modifier — no Task wrapper needed.
    /// Being @MainActor, calling a nonisolated async function (KMP) automatically
    /// hops to a background thread and returns here when done.
    func load() async {
        isLoading = true
        error = nil
        do {
            let content = try await homeRepository.getHomeContent()
            let banners = content.banners.count
            let agenda = content.agenda.count
            homeContent = content
            let user = try await authRepository.currentUser()
            userName = user?.name.split(separator: " ").first.map(String.init) ?? ""
            canManage = user?.role.isLeader == true
            isLoading = false
        } catch {
            print("[HomeVM] load() FAILED — \(type(of: error)): \(error)")
            isLoading = false
            self.error = error.localizedDescription
        }

        do {
            let myGroups = try await churchRepository.getMyLifeGroups()
            showLifeGroupDiscoveryCTA = myGroups.isEmpty
        } catch {
            // Best-effort: on failure, leave the CTA hidden rather than risk
            // showing it to a member who actually has a group.
            showLifeGroupDiscoveryCTA = false
        }
    }

    func onRetry() {
        Task { await load() }
    }

    /// Toggles the home agenda section between the next-7-days preview and
    /// the full upcoming (recurrence-expanded) agenda, loading the latter
    /// lazily on first expand via the same paginated AgendaRepository the
    /// full Agenda list screen uses.
    func onToggleAgendaExpanded() {
        isAgendaExpanded.toggle()
        if isAgendaExpanded, fullAgendaEvents.isEmpty {
            Task { await loadFullAgenda() }
        }
    }

    func loadFullAgenda() async {
        isLoadingFullAgenda = true
        fullAgendaLoadError = nil
        do {
            fullAgendaEvents = try await agendaRepository.getEvents(page: 1, limit: 50)
            isLoadingFullAgenda = false
        } catch {
            print("[HomeVM] loadFullAgenda() FAILED — \(type(of: error)): \(error)")
            isLoadingFullAgenda = false
            fullAgendaLoadError = error.localizedDescription
        }
    }
}
