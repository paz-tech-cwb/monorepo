import Observation
import Shared

/// Reads the HTTP status off a repository failure (bridged from Ktor's `ClientRequestException`
/// via `httpStatusCodeOrNull()` in the shared module). Same approach as the analytics and study
/// view models (their copies are private to those files).
private func lifeGroupReportsHTTPStatus(_ error: Error) -> Int? {
    guard let kotlinException = (error as NSError).kotlinException as? KotlinThrowable else { return nil }
    return kotlinException.httpStatusCodeOrNull()?.intValue
}

/// Pure display helpers and state mapping for the weekly report screens (unit-tested).
enum LifeGroupReportsPresentation {
    /// What a failed load maps to: `noAccess` (a dedicated empty message) or an error + retry.
    struct Failure: Equatable {
        var noAccess: Bool
        var error: String?
    }

    /// List: only 403 means "outside the viewer's scope".
    static func listFailure(statusCode: Int?, message: String) -> Failure {
        statusCode == 403
            ? Failure(noAccess: true, error: nil)
            : Failure(noAccess: false, error: message)
    }

    /// Detail: the backend answers 404 (not 403) for out-of-scope ids to avoid id probing, so both
    /// mean "not found or no access".
    static func detailFailure(statusCode: Int?, message: String) -> Failure {
        statusCode == 403 || statusCode == 404
            ? Failure(noAccess: true, error: nil)
            : Failure(noAccess: false, error: message)
    }

    /// Newest first (ISO dates, so string order == date order).
    static func newestFirst(_ reports: [LifeGroupWeeklyReport]) -> [LifeGroupWeeklyReport] {
        reports.sorted { $0.date > $1.date }
    }

    /// "150.50" -> "R$ 150,50".
    static func formatOffering(_ offering: String) -> String {
        "R$ " + offering.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: ".", with: ",")
    }

    /// Comma list of activity values plus the free-text "other"; "—" when both are empty.
    static func activitySummary(types: [String], other: String?) -> String {
        let extra = other.flatMap { $0.trimmingCharacters(in: .whitespaces).isEmpty ? nil : $0 }
        let parts = types + (extra.map { [$0] } ?? [])
        return parts.isEmpty ? "—" : parts.joined(separator: ", ")
    }
}

@MainActor
@Observable
class LifeGroupReportsViewModel {
    /// Newest first.
    var reports: [LifeGroupWeeklyReport] = []
    var isLoading = true
    var isRefreshing = false
    var error: String?
    /// The backend answered 403: the group is outside the viewer's scope.
    var noAccess = false

    private let lifeGroupId: Int32
    private let repository: LifeGroupReportRepository

    init(lifeGroupId: Int32, repository: LifeGroupReportRepository) {
        self.lifeGroupId = lifeGroupId
        self.repository = repository
    }

    /// First load (skeleton) when nothing was shown yet; later calls (pull-to-refresh, retry
    /// after content) keep the current content visible.
    func load() async {
        let showSkeleton = reports.isEmpty
        isLoading = showSkeleton
        isRefreshing = !showSkeleton
        error = nil
        noAccess = false
        do {
            let result = try await repository.getReports(lifeGroupId: lifeGroupId)
            reports = LifeGroupReportsPresentation.newestFirst(result)
        } catch is CancellationError {
            isRefreshing = false
            return
        } catch {
            // A Kotlin CancellationException surfaces as an NSError: keep current state.
            if Task.isCancelled {
                isRefreshing = false
                return
            }
            let failure = LifeGroupReportsPresentation.listFailure(
                statusCode: lifeGroupReportsHTTPStatus(error),
                message: error.localizedDescription
            )
            noAccess = failure.noAccess
            self.error = failure.error
        }
        isLoading = false
        isRefreshing = false
    }
}

@MainActor
@Observable
class LifeGroupReportDetailViewModel {
    var report: LifeGroupWeeklyReport?
    var isLoading = true
    var error: String?
    /// 403/404: report out of the viewer's scope.
    var noAccess = false

    private let reportId: String
    private let repository: LifeGroupReportRepository

    init(reportId: String, repository: LifeGroupReportRepository) {
        self.reportId = reportId
        self.repository = repository
    }

    func load() async {
        if report == nil { isLoading = true }
        error = nil
        noAccess = false
        do {
            report = try await repository.getReport(reportId: reportId)
        } catch is CancellationError {
            return
        } catch {
            if Task.isCancelled { return }
            let failure = LifeGroupReportsPresentation.detailFailure(
                statusCode: lifeGroupReportsHTTPStatus(error),
                message: error.localizedDescription
            )
            noAccess = failure.noAccess
            self.error = failure.error
        }
        isLoading = false
    }
}
