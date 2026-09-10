import Observation
import Shared

enum LifeGroupDistributionTab: String, CaseIterable, Identifiable {
    case day, hour, neighborhood, city

    var id: String { rawValue }

    var label: String {
        switch self {
        case .day: return "Dia"
        case .hour: return "Horário"
        case .neighborhood: return "Bairro"
        case .city: return "Cidade"
        }
    }
}

@MainActor
@Observable
class LifeGroupAnalyticsViewModel {
    var year: Int
    var month: Int32?
    var lifeGroupId: Int32?
    var lifeGroups: [(id: Int32, name: String)] = []

    var attendanceRows: [LifeGroupAttendancePoint] = []
    var byDay: [LifeGroupDistributionBucket] = []
    var byHour: [LifeGroupDistributionBucket] = []
    var byNeighborhood: [LifeGroupDistributionBucket] = []
    var byCity: [LifeGroupDistributionBucket] = []
    var distributionTab: LifeGroupDistributionTab = .day

    var isLoading = true
    var error: String?

    /// True when this screen was opened from a specific life group's own
    /// "Relatórios" entry point — locked to that one group, with no picker
    /// to browse other groups. The picker (and the underlying scope
    /// fetch) is only meaningful when opened unscoped from the top-level
    /// Relatórios tab or the Home shortcut.
    let isLockedToSingleGroup: Bool
    let lockedGroupName: String?

    private let analyticsRepository: LifeGroupAnalyticsRepository

    var distributionForSelectedTab: [LifeGroupDistributionBucket] {
        switch distributionTab {
        case .day: return byDay
        case .hour: return byHour
        case .neighborhood: return byNeighborhood
        case .city: return byCity
        }
    }

    init(
        lifeGroupId: Int32?,
        lifeGroupName: String? = nil,
        analyticsRepository: LifeGroupAnalyticsRepository
    ) {
        self.lifeGroupId = lifeGroupId
        self.isLockedToSingleGroup = lifeGroupId != nil
        self.lockedGroupName = lifeGroupName
        self.analyticsRepository = analyticsRepository
        self.year = Int(Calendar.current.component(.year, from: Date()))
    }

    /// Exactly the groups this viewer can see analytics for — their own
    /// group, their sector/area's groups, or every group when unrestricted
    /// (admin/pastor) — never the whole church's list for a scoped leader.
    /// Skipped entirely when locked to a single group — there's nothing to
    /// pick between and no reason to spend the request.
    func loadLifeGroups() async {
        guard !isLockedToSingleGroup else { return }
        do {
            let scope = try await analyticsRepository.getScope()
            lifeGroups = scope.lifeGroups.map { (id: $0.id, name: $0.name) }
        } catch {
            // Best-effort: the filter dropdown just stays empty on failure.
        }
    }

    /// Resets every filter back to its default (current year, all months,
    /// all groups the picker can reach) and reloads.
    func clearFilters() {
        year = Int(Calendar.current.component(.year, from: Date()))
        month = nil
        if !isLockedToSingleGroup { lifeGroupId = nil }
        Task { await load() }
    }

    func load() async {
        isLoading = true
        error = nil
        do {
            let monthArg = month.map { KotlinInt(value: $0) }
            let lifeGroupIdArg = lifeGroupId.map { KotlinInt(value: $0) }

            async let attendance = analyticsRepository.getAttendance(
                year: Int32(year),
                month: monthArg,
                lifeGroupId: lifeGroupIdArg,
                granularity: month != nil ? "meeting" : "month"
            )
            async let distribution = analyticsRepository.getDistribution(lifeGroupId: lifeGroupIdArg)

            let attendanceResult = try await attendance
            let distributionResult = try await distribution

            attendanceRows = attendanceResult.rows
            byDay = distributionResult.byDay
            byHour = distributionResult.byHour
            byNeighborhood = distributionResult.byNeighborhood
            byCity = distributionResult.byCity
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}
