import Shared
import XCTest
@testable import PazChurch

final class LifeGroupReportsTests: XCTestCase {
    // MARK: - Gate matrix (canViewGroupReports)

    func testGateGroupLeadershipAlwaysSees() {
        for role in [UserRole.member, .lifeGroupLeader, .guest, .discipler] {
            XCTAssertTrue(LifeGroupDetailView.canViewGroupReports(role: role, isGroupLeadership: true), "\(role)")
        }
        XCTAssertTrue(LifeGroupDetailView.canViewGroupReports(role: nil, isGroupLeadership: true))
    }

    func testGateScopedLeadershipRolesSeeEveryGroup() {
        for role in [UserRole.admin, .pastor, .areaLeader, .sectorLeader] {
            XCTAssertTrue(LifeGroupDetailView.canViewGroupReports(role: role, isGroupLeadership: false), "\(role)")
        }
    }

    func testGateOthersNeverSee() {
        // A life_group_leader of ANOTHER group no longer sees the entries.
        for role in [UserRole.lifeGroupLeader, .member, .guest, .discipler] {
            XCTAssertFalse(LifeGroupDetailView.canViewGroupReports(role: role, isGroupLeadership: false), "\(role)")
        }
        XCTAssertFalse(LifeGroupDetailView.canViewGroupReports(role: nil, isGroupLeadership: false))
    }

    // MARK: - Failure mapping

    func testListFailureMapping() {
        XCTAssertEqual(
            LifeGroupReportsPresentation.listFailure(statusCode: 403, message: "x"),
            .init(noAccess: true, error: nil)
        )
        XCTAssertEqual(
            LifeGroupReportsPresentation.listFailure(statusCode: 404, message: "boom"),
            .init(noAccess: false, error: "boom")
        )
        XCTAssertEqual(
            LifeGroupReportsPresentation.listFailure(statusCode: nil, message: "offline"),
            .init(noAccess: false, error: "offline")
        )
    }

    func testDetailFailureMapping() {
        for code in [403, 404] {
            XCTAssertEqual(
                LifeGroupReportsPresentation.detailFailure(statusCode: code, message: "x"),
                .init(noAccess: true, error: nil)
            )
        }
        XCTAssertEqual(
            LifeGroupReportsPresentation.detailFailure(statusCode: 500, message: "boom"),
            .init(noAccess: false, error: "boom")
        )
    }

    // MARK: - Formatting

    func testFormatOfferingAndActivitySummary() {
        XCTAssertEqual(LifeGroupReportsPresentation.formatOffering("150.50"), "R$ 150,50")
        XCTAssertEqual(LifeGroupReportsPresentation.activitySummary(types: ["A", "B"], other: nil), "A, B")
        XCTAssertEqual(LifeGroupReportsPresentation.activitySummary(types: ["A"], other: "Outro"), "A, Outro")
        XCTAssertEqual(LifeGroupReportsPresentation.activitySummary(types: [], other: "  "), "—")
        XCTAssertEqual(LifeGroupReportsPresentation.activitySummary(types: [], other: nil), "—")
    }

    // MARK: - View model state mapping (fake repository)

    private func report(_ id: String, _ date: String) -> LifeGroupWeeklyReport {
        LifeGroupWeeklyReport(
            id: id, date: date, lifeGroupId: 1, committedMembers: 8, committedMembersPresent: 6, kids0To11: 1,
            guests: 2, mdas: 0, offering: "10.00", committedAtTadel: 0, committedAtCulto: 0, leaderAttended: [],
            disciplesCount: 0, disciplesDiscipledThisWeek: 0, pastoringActivityType: [], pastoringActivityOther: nil,
            trainingActivityType: [], trainingActivityOther: nil, submittedByName: "Ana", createdAt: nil
        )
    }

    func testNewestFirstSortsByDateDescending() {
        let sorted = LifeGroupReportsPresentation.newestFirst([
            report("a", "2026-01-01"), report("c", "2026-03-01"), report("b", "2026-02-01"),
        ])
        XCTAssertEqual(sorted.map(\.id), ["c", "b", "a"])
    }

    @MainActor
    func testListViewModelLoadsSortedReports() async {
        let repo = FakeReportRepository()
        repo.reports = [report("a", "2026-01-01"), report("b", "2026-02-01")]
        let vm = LifeGroupReportsViewModel(lifeGroupId: 1, repository: repo)
        XCTAssertTrue(vm.isLoading)
        await vm.load()
        XCTAssertFalse(vm.isLoading)
        XCTAssertFalse(vm.isRefreshing)
        XCTAssertEqual(vm.reports.map(\.id), ["b", "a"])
        XCTAssertNil(vm.error)
        XCTAssertFalse(vm.noAccess)
        XCTAssertEqual(repo.requestedGroupIds, [1])
    }

    @MainActor
    func testListViewModelEmptyState() async {
        let vm = LifeGroupReportsViewModel(lifeGroupId: 1, repository: FakeReportRepository())
        await vm.load()
        XCTAssertFalse(vm.isLoading)
        XCTAssertTrue(vm.reports.isEmpty)
        XCTAssertNil(vm.error)
        XCTAssertFalse(vm.noAccess)
    }

    @MainActor
    func testListViewModelErrorThenRetrySucceeds() async {
        let repo = FakeReportRepository()
        repo.failure = NSError(domain: "t", code: 1, userInfo: [NSLocalizedDescriptionKey: "offline"])
        let vm = LifeGroupReportsViewModel(lifeGroupId: 1, repository: repo)
        await vm.load()
        XCTAssertEqual(vm.error, "offline")
        XCTAssertFalse(vm.noAccess)
        XCTAssertFalse(vm.isLoading)

        repo.failure = nil
        repo.reports = [report("a", "2026-01-01")]
        await vm.load()
        XCTAssertNil(vm.error)
        XCTAssertEqual(vm.reports.count, 1)
    }

    @MainActor
    func testRefreshKeepsContentOnFailure() async {
        let repo = FakeReportRepository()
        repo.reports = [report("a", "2026-01-01")]
        let vm = LifeGroupReportsViewModel(lifeGroupId: 1, repository: repo)
        await vm.load()
        repo.failure = NSError(domain: "t", code: 1)
        await vm.load()
        XCTAssertFalse(vm.isLoading)
        XCTAssertFalse(vm.isRefreshing)
        XCTAssertEqual(vm.reports.count, 1)
        XCTAssertNil(vm.error)
        XCTAssertNotNil(vm.refreshError)
        XCTAssertFalse(vm.noAccess)
    }

    @MainActor
    func testDetailViewModelLoadsAndFails() async {
        let repo = FakeReportRepository()
        repo.reports = [report("a", "2026-01-01")]
        let vm = LifeGroupReportDetailViewModel(reportId: "a", repository: repo)
        await vm.load()
        XCTAssertEqual(vm.report?.id, "a")
        XCTAssertFalse(vm.isLoading)

        repo.failure = NSError(domain: "t", code: 2, userInfo: [NSLocalizedDescriptionKey: "nope"])
        let failing = LifeGroupReportDetailViewModel(reportId: "a", repository: repo)
        await failing.load()
        XCTAssertNil(failing.report)
        XCTAssertEqual(failing.error, "nope")
        XCTAssertFalse(failing.noAccess)
        XCTAssertFalse(failing.isLoading)
    }
}

private final class FakeReportRepository: NSObject, LifeGroupReportRepository {
    var reports: [LifeGroupWeeklyReport] = []
    var failure: Error?
    private(set) var requestedGroupIds: [Int32] = []

    func getReports(lifeGroupId: Int32) async throws -> [LifeGroupWeeklyReport] {
        requestedGroupIds.append(lifeGroupId)
        if let failure { throw failure }
        return reports
    }

    func getReport(reportId: String) async throws -> LifeGroupWeeklyReport {
        if let failure { throw failure }
        guard let found = reports.first(where: { $0.id == reportId }) else {
            throw NSError(domain: "t", code: 404)
        }
        return found
    }
}
