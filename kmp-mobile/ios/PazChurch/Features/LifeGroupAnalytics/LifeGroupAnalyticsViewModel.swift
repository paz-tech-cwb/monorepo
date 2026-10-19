import Observation
import Shared

enum LifeGroupDistributionTab: String, CaseIterable, Identifiable {
    case day, hour, neighborhood, city

    var id: String {
        rawValue
    }

    var label: String {
        switch self {
        case .day: "Dia"
        case .hour: "Horário"
        case .neighborhood: "Bairro"
        case .city: "Cidade"
        }
    }
}

/// Reads the actual HTTP status code off a repository failure (bridged from Ktor's
/// `ClientRequestException` via `httpStatusCodeOrNull()` in the shared module), instead of
/// string-matching on `localizedDescription`, which is fragile. Mirrors
/// LifeGroupStudyViewModels.swift's `Error.httpStatusCode`.
private extension Error {
    var httpStatusCode: Int? {
        guard let kotlinException = (self as NSError).kotlinException as? KotlinThrowable else { return nil }
        return kotlinException.httpStatusCodeOrNull()?.intValue
    }
}

@MainActor
@Observable
class LifeGroupAnalyticsViewModel {
    var year: Int
    var month: Int32?
    var lifeGroupId: Int32?
    /// True when opened for one specific group (e.g. from the group's detail): the screen is
    /// locked to that group and the group picker is hidden, so a leader cannot widen it.
    let isScopedToGroup: Bool
    /// Populated from the scoped `overview.lifeGroups`, not the unscoped
    /// `ChurchRepository.getAllLifeGroups()`, so this dropdown can never
    /// offer a group that 403s on attendance/distribution.
    var lifeGroups: [(id: Int32, name: String)] = []

    var attendanceRows: [LifeGroupAttendancePoint] = []
    var byDay: [LifeGroupDistributionBucket] = []
    var byHour: [LifeGroupDistributionBucket] = []
    var byNeighborhood: [LifeGroupDistributionBucket] = []
    var byCity: [LifeGroupDistributionBucket] = []
    var distributionTab: LifeGroupDistributionTab = .day

    /// Loaded best-effort alongside attendance/distribution — a failure here
    /// must never break the rest of the report, so it stays a separate
    /// optional, not folded into the screen's main `error` state.
    var overview: LifeGroupOverview?

    /// True ONLY for the genuine first load, before any content has ever
    /// rendered. Every subsequent filter-triggered reload uses `isRefreshing`
    /// instead, so the filter row (and any already-rendered content) stays
    /// mounted.
    var isLoading = true
    var isRefreshing = false
    /// Reserved for a truly unexpected failure outside the per-section
    /// attendance/distribution handling below — kept separate from the
    /// section-scoped errors so a single unexpected exception doesn't need
    /// to be force-fit into one of them.
    var error: String?
    /// Attendance and distribution are independent endpoints (and
    /// independent charts) — each tracks its own inline error (including a
    /// 403, as defense in depth for root cause B, since the dropdown is now
    /// scoped) so a failure on one never hides the other's successfully
    /// loaded content, or the always-independent `overview` section.
    var attendanceError: String?
    var distributionError: String?

    private let analyticsRepository: LifeGroupAnalyticsRepository
    private var hasLoadedOnce = false
    /// Cancelled before starting a new load — rapid successive filter taps
    /// (enabled by root cause C's fix keeping the filter row tappable
    /// mid-reload) can otherwise fire overlapping loads that resolve out of
    /// order, so only the latest filter selection's response is ever
    /// applied.
    private var loadTask: Task<Void, Never>?

    var distributionForSelectedTab: [LifeGroupDistributionBucket] {
        switch distributionTab {
        case .day: byDay
        case .hour: byHour
        case .neighborhood: byNeighborhood
        case .city: byCity
        }
    }

    init(
        lifeGroupId: Int32?,
        analyticsRepository: LifeGroupAnalyticsRepository
    ) {
        self.lifeGroupId = lifeGroupId
        self.isScopedToGroup = lifeGroupId != nil
        self.analyticsRepository = analyticsRepository
        self.year = Int(Calendar.current.component(.year, from: Date()))
    }

    /// Totals of THIS group's attendance rows (the single-group "Relatórios" tab): the overview cards are
    /// church-wide, so this is the only summary that is safe to show when scoped to one group.
    var attendanceSummary: LifeGroupAttendanceSummary {
        LifeGroupAnalyticsKt.summarizeAttendance(attendanceRows)
    }

    /// First load of the screen/tab (a no-op afterwards, so switching tabs back and forth does not refetch).
    /// The overview is church-wide (groups by sector, members with/without a group...) and only feeds the
    /// group dropdown and the stat cards: a single-group view needs neither, so it is not even requested.
    func loadInitial() async {
        guard !hasLoadedOnce else { return }
        if isScopedToGroup {
            await load()
        } else {
            // Overview is best-effort and must never block or delay the main attendance/distribution
            // report, so it runs concurrently.
            async let overview: Void = loadOverview()
            async let main: Void = load()
            _ = await (overview, main)
        }
    }

    /// Reloads only when the screen/tab already loaded once (e.g. after a meeting was saved elsewhere).
    func refreshIfLoaded() async {
        guard hasLoadedOnce else { return }
        await load()
    }

    func loadOverview() async {
        do {
            // Always the church-wide overview (nil): it feeds the group dropdown of the unscoped screen.
            let result = try await analyticsRepository.getOverview(lifeGroupId: nil)
            overview = result
            lifeGroups = result.lifeGroups.map { (id: $0.id, name: $0.name) }
        } catch {
            // Best-effort — the stat cards + donuts this feeds are additive to
            // the attendance/distribution charts, so a failure here must not
            // surface as the screen's main error state.
        }
    }

    /// Cancels any previous in-flight load before starting a new one — rapid
    /// successive filter taps can otherwise fire overlapping loads that
    /// resolve out of order, letting a stale response overwrite a newer
    /// filter selection's state.
    func load() async {
        loadTask?.cancel()
        let task = Task { await performLoad() }
        loadTask = task
        await task.value
    }

    private func performLoad() async {
        let isFirstLoad = !hasLoadedOnce
        hasLoadedOnce = true
        if isFirstLoad {
            isLoading = true
        } else {
            isRefreshing = true
        }
        error = nil
        attendanceError = nil
        distributionError = nil

        let monthArg = month.map { KotlinInt(value: $0) }
        let lifeGroupIdArg = lifeGroupId.map { KotlinInt(value: $0) }

        // Attendance and distribution are independent endpoints/charts —
        // each result (success or failure) is tracked separately so a 403
        // (or any other failure) on one never hides the other's
        // successfully-loaded content or the always-independent `overview`
        // section.
        async let attendanceOutcome = fetchAttendance(monthArg: monthArg, lifeGroupIdArg: lifeGroupIdArg)
        // A single group has nothing to distribute (it IS the one group): skip the request.
        async let distributionOutcome = fetchDistribution(lifeGroupIdArg: lifeGroupIdArg, skip: isScopedToGroup)
        let (attendance, distribution) = await (attendanceOutcome, distributionOutcome)

        guard !Task.isCancelled else { return }

        switch attendance {
        case .success(let result):
            attendanceRows = result.rows
        case .failure(let err):
            attendanceError = inlineErrorMessage(for: err)
        }

        switch distribution {
        case nil:
            break
        case .success(let result)?:
            byDay = result.byDay
            byHour = result.byHour
            byNeighborhood = result.byNeighborhood
            byCity = result.byCity
        case .failure(let err)?:
            distributionError = inlineErrorMessage(for: err)
        }

        isLoading = false
        isRefreshing = false
    }

    private func fetchAttendance(
        monthArg: KotlinInt?,
        lifeGroupIdArg: KotlinInt?
    ) async -> Result<LifeGroupAttendanceAnalytics, Error> {
        do {
            let result = try await analyticsRepository.getAttendance(
                year: Int32(year),
                month: monthArg,
                lifeGroupId: lifeGroupIdArg,
                granularity: month != nil ? "meeting" : "month"
            )
            return .success(result)
        } catch {
            return .failure(error)
        }
    }

    private func fetchDistribution(
        lifeGroupIdArg: KotlinInt?,
        skip: Bool
    ) async -> Result<LifeGroupDistributionAnalytics, Error>? {
        if skip { return nil }
        do {
            let result = try await analyticsRepository.getDistribution(lifeGroupId: lifeGroupIdArg)
            return .success(result)
        } catch {
            return .failure(error)
        }
    }

    // Defense in depth: even with the dropdown now scoped to only queryable
    // groups (root cause B), an unexpected 403 here (e.g. scoping drift)
    // must not wipe the whole screen — show an inline message on the
    // affected chart only and keep the rest of the report (and the filters)
    // intact.
    private func inlineErrorMessage(for error: Error) -> String {
        error.httpStatusCode == 403 ? "Sem acesso a este grupo." : error.localizedDescription
    }
}
