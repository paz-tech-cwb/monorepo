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
        self.analyticsRepository = analyticsRepository
        self.year = Int(Calendar.current.component(.year, from: Date()))
    }

    func loadOverview() async {
        do {
            let result = try await analyticsRepository.getOverview()
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
        async let distributionOutcome = fetchDistribution(lifeGroupIdArg: lifeGroupIdArg)
        let (attendance, distribution) = await (attendanceOutcome, distributionOutcome)

        guard !Task.isCancelled else { return }

        switch attendance {
        case .success(let result):
            attendanceRows = result.rows
        case .failure(let err):
            attendanceError = inlineErrorMessage(for: err)
        }

        switch distribution {
        case .success(let result):
            byDay = result.byDay
            byHour = result.byHour
            byNeighborhood = result.byNeighborhood
            byCity = result.byCity
        case .failure(let err):
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

    private func fetchDistribution(lifeGroupIdArg: KotlinInt?) async -> Result<LifeGroupDistributionAnalytics, Error> {
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
