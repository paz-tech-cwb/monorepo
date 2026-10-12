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
    /// Upcoming assigned life group tasks ("Minhas tarefas"). Empty hides the card,
    /// including when the best-effort fetch failed.
    var myTasks: [LifeGroupTask] = []

    private let homeRepository: HomeRepository
    private let authRepository: AuthRepository
    private let churchRepository: ChurchRepository
    private let taskRepository: LifeGroupTaskRepository

    init(
        homeRepository: HomeRepository,
        authRepository: AuthRepository,
        churchRepository: ChurchRepository,
        taskRepository: LifeGroupTaskRepository
    ) {
        self.homeRepository = homeRepository
        self.authRepository = authRepository
        self.churchRepository = churchRepository
        self.taskRepository = taskRepository
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

        // Best-effort: a failure hides the card and never surfaces as a home error.
        do {
            let tasks = try await taskRepository.getMyTasks()
            myTasks = Self.upcomingTasks(tasks, today: Self.todayISODate())
        } catch is CancellationError {
            // View task cancelled: keep the current card instead of clearing it.
            return
        } catch {
            myTasks = []
        }
    }

    /// Status assigned, meetingDate (ISO `yyyy-MM-dd`, so string order == date order) on or after
    /// `today`, soonest first, at most `limit`.
    static func upcomingTasks(_ tasks: [LifeGroupTask], today: String, limit: Int = 3) -> [LifeGroupTask] {
        Array(
            tasks
                .filter { $0.status == .assigned && $0.meetingDate >= today }
                .sorted { $0.meetingDate < $1.meetingDate }
                .prefix(limit)
        )
    }

    private static func todayISODate() -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: Date())
    }

    func onRetry() {
        Task { await load() }
    }
}
