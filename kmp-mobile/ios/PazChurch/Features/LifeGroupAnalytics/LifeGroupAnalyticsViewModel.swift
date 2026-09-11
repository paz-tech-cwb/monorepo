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

    private let analyticsRepository: LifeGroupAnalyticsRepository
    private let churchRepository: ChurchRepository

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
        analyticsRepository: LifeGroupAnalyticsRepository,
        churchRepository: ChurchRepository
    ) {
        self.lifeGroupId = lifeGroupId
        self.analyticsRepository = analyticsRepository
        self.churchRepository = churchRepository
        self.year = Int(Calendar.current.component(.year, from: Date()))
    }

    func loadLifeGroups() async {
        do {
            let groups = try await churchRepository.getAllLifeGroups()
            lifeGroups = groups.map { (id: $0.id, name: $0.name) }
        } catch {
            // Best-effort: the filter dropdown just stays empty on failure.
        }
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
