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
    /// One card per life group (tasks folded in), at most `maxLifeGroupCards`. Empty when the
    /// viewer has no group or the groups fetch failed (quiet degradation, never a home error).
    var lifeGroupCards: [HomeLifeGroupCard] = []
    /// Groups beyond the card cap; "Ver todos (N)" shows `lifeGroupCards.count + hiddenLifeGroupsCount`.
    var hiddenLifeGroupsCount = 0
    /// Tasks-only fallback ("Minhas tarefas"), used ONLY when the groups fetch failed but the
    /// tasks fetch worked, so the pre-existing feature does not regress.
    var legacyTasks: [LifeGroupTask] = []

    static let maxLifeGroupCards = 3
    static let maxTasksPerCard = 3

    /// Numeric id of the signed-in user (leader-first card ordering); nil when unknown.
    private var currentUserId: Int32?

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
            currentUserId = user.flatMap { Int32($0.id) }
            isLoading = false
        } catch {
            print("[HomeVM] load() FAILED — \(type(of: error)): \(error)")
            isLoading = false
            self.error = error.localizedDescription
        }

        // Groups and tasks are independent best-effort fetches: a failure in one never blocks or
        // hides the other, and neither ever surfaces as a home error. A cancelled load (view
        // task cancelled / Kotlin CancellationException bridged as NSError) keeps current state.
        let groupsOutcome = await fetchMyGroups()
        let tasksOutcome = await fetchMyTasks()
        if case .cancelled = groupsOutcome { return }
        if case .cancelled = tasksOutcome { return }
        let resolved = Self.resolveLifeGroups(
            currentUserId: currentUserId,
            groups: groupsOutcome.value,
            tasks: tasksOutcome.value,
            today: Self.todayISODate()
        )
        showLifeGroupDiscoveryCTA = resolved.showDiscoveryCTA
        lifeGroupCards = resolved.cards
        hiddenLifeGroupsCount = resolved.hiddenCount
        legacyTasks = resolved.legacyTasks
    }

    private func fetchMyGroups() async -> FetchOutcome<[LifeGroup]> {
        do {
            return try await .success(churchRepository.getMyLifeGroups())
        } catch is CancellationError {
            return .cancelled
        } catch {
            return Task.isCancelled ? .cancelled : .failed
        }
    }

    private func fetchMyTasks() async -> FetchOutcome<[LifeGroupTask]> {
        do {
            return try await .success(taskRepository.getMyTasks())
        } catch is CancellationError {
            return .cancelled
        } catch {
            return Task.isCancelled ? .cancelled : .failed
        }
    }

    enum FetchOutcome<Value> {
        case success(Value)
        case failed
        case cancelled

        /// The fetched value, or nil when the fetch failed (or was cancelled).
        var value: Value? {
            if case .success(let value) = self { return value }
            return nil
        }
    }

    struct ResolvedLifeGroups {
        var cards: [HomeLifeGroupCard] = []
        var hiddenCount = 0
        var legacyTasks: [LifeGroupTask] = []
        var showDiscoveryCTA = false
    }

    /// Pure mapping of the two fetch results (nil == fetch failed) to what the home screen shows:
    /// cards (shared builder, so Android and iOS cannot drift) when groups loaded; discovery CTA
    /// only when groups loaded AND are empty; legacy tasks-only card only when groups failed but
    /// tasks loaded; tasks failing just leaves cards without a tasks section.
    static func resolveLifeGroups(
        currentUserId: Int32?,
        groups: [LifeGroup]?,
        tasks: [LifeGroupTask]?,
        today: String
    ) -> ResolvedLifeGroups {
        guard let groups else {
            guard let tasks else { return ResolvedLifeGroups() }
            return ResolvedLifeGroups(legacyTasks: upcomingTasks(tasks, today: today))
        }
        let built = HomeLifeGroupCardKt.buildHomeLifeGroupCards(
            currentUserId: currentUserId.map { KotlinInt(value: $0) },
            groups: groups,
            tasks: tasks ?? [],
            today: today,
            maxCards: Int32(maxLifeGroupCards),
            maxTasks: Int32(maxTasksPerCard)
        )
        return ResolvedLifeGroups(
            cards: built.cards,
            hiddenCount: Int(built.hiddenCount),
            showDiscoveryCTA: groups.isEmpty
        )
    }

    /// Status assigned, meetingDate (ISO `yyyy-MM-dd`, so string order == date order) on or after
    /// `today`, soonest first, at most `limit`.
    static func upcomingTasks(_ tasks: [LifeGroupTask], today: String, limit: Int = 3) -> [LifeGroupTask] {
        HomeLifeGroupCardKt.selectUpcomingLifeGroupTasks(tasks: tasks, today: today, limit: Int32(limit))
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
