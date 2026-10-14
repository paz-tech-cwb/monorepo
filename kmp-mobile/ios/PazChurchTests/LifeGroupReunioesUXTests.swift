import Shared
import XCTest
@testable import PazChurch

// MARK: - Builders and fakes

private enum UXTestError: Error { case unset, offline }

private func kotlinError(_ status: Int32, _ code: String?, message: String? = nil) -> Error {
    NSError(
        domain: "KotlinException", code: 0,
        userInfo: ["KotlinException": LifeGroupMeetingException(statusCode: status, code: code, serverMessage: message)]
    )
}

private func uxGroup(_ id: Int32, _ name: String, relationship: String? = nil, supervised: Bool = false) -> LifeGroup {
    LifeGroup(
        id: id, name: name, leaderId: nil, leader: nil, leaderPhone: nil,
        coLeaderId: nil, coLeaderName: nil, coLeaderPhone: nil,
        sectorId: nil, location: nil, latitude: nil, longitude: nil, meetingDay: "Quarta-feira", meetingTime: nil,
        membersCount: 5, kidsCount: 0, members: nil, relationship: relationship, isSupervised: supervised
    )
}

private func uxEntries(_ present: [Bool]) -> [LifeGroupAttendanceEntry] {
    present.enumerated().map {
        LifeGroupAttendanceEntry(userId: Int32($0.offset + 1), name: "Membro \($0.offset + 1)", present: $0.element)
    }
}

private func uxAttendance(_ present: [Bool], isDraft: Bool) -> LifeGroupMeetingAttendance {
    LifeGroupMeetingAttendance(
        id: isDraft ? nil : "att-1", meetingDate: "2026-09-08",
        presentCount: Int32(present.filter { $0 }.count), membersCount: Int32(present.count),
        entries: uxEntries(present), isDraft: isDraft, isExtra: false,
        defaultPresent: isDraft ? KotlinBoolean(bool: true) : nil
    )
}

private func uxReport() -> LifeGroupWeeklyReport {
    LifeGroupWeeklyReport(
        id: "rep-1", date: "2026-09-08", lifeGroupId: 7, committedMembers: 3, committedMembersPresent: 3,
        kids0To11: 2, guests: 1, mdas: 1, offering: "150.50", committedAtTadel: 1, committedAtCulto: 2,
        leaderAttended: ["tadel"], disciplesCount: 2, disciplesDiscipledThisWeek: 1,
        pastoringActivityType: [], pastoringActivityOther: nil, trainingActivityType: [], trainingActivityOther: nil,
        submittedByName: nil, createdAt: nil
    )
}

private func uxMeeting(
    attendance att: LifeGroupMeetingAttendance?, report rep: LifeGroupWeeklyReport? = nil, canEdit: Bool
) -> LifeGroupMeeting {
    LifeGroupMeeting(
        lifeGroupId: 7, meetingDate: "2026-09-08", attendance: att, report: rep,
        committedMembers: att.map { KotlinInt(int: $0.membersCount) },
        committedMembersPresent: att.map { KotlinInt(int: $0.presentCount) },
        canWrite: true, canEdit: canEdit, editDeadline: "2026-09-22", reportBlockedReason: nil
    )
}

@MainActor
private final class UXMeetingService: LifeGroupMeetingService {
    var result: Result<LifeGroupMeeting, Error> = .failure(UXTestError.unset)

    func getMeeting(lifeGroupId: Int32, date: String, extraMeeting: Bool?) async throws -> LifeGroupMeeting {
        try result.get()
    }

    func saveAttendance(
        lifeGroupId: Int32, date: String, entries: [LifeGroupAttendanceEntry], extraMeeting: Bool?
    ) async throws -> LifeGroupMeeting {
        try result.get()
    }

    func saveReport(lifeGroupId: Int32, date: String, report: LifeGroupMeetingReportInput) async throws
        -> LifeGroupMeeting {
        try result.get()
    }
}

private struct UXDraftStore: LifeGroupMeetingDraftStoring {
    func read(userId: String, lifeGroupId: Int32, date: String) async throws -> LifeGroupMeetingDraft? {
        nil
    }

    func save(userId: String, lifeGroupId: Int32, date: String, draft: LifeGroupMeetingDraft) async throws {}
    func clear(userId: String, lifeGroupId: Int32, date: String) async throws {}
}

private struct UXHistorySource: LifeGroupMeetingHistorySource {
    var failure: Error?

    func attendanceHistory(lifeGroupId: Int32) async throws -> [LifeGroupAttendance] {
        if let failure { throw failure }
        return []
    }

    func reports(lifeGroupId: Int32) async throws -> [LifeGroupWeeklyReport] {
        []
    }
}

private struct UXEntrySource: LifeGroupMeetingEntrySource {
    var role: UserRole?
    var mine: [LifeGroup] = []
    var all: [LifeGroup] = []
    var failure: Error?

    func currentRole() async -> UserRole? {
        role
    }

    func myGroups() async throws -> [LifeGroup] {
        if let failure { throw failure }
        return mine
    }

    func allGroups() async throws -> [LifeGroup] {
        all
    }
}

private final class UXFlakyEntrySource: LifeGroupMeetingEntrySource {
    var failing = false
    var myGroupsCalls = 0
    let mine: [LifeGroup]

    init(mine: [LifeGroup]) {
        self.mine = mine
    }

    func currentRole() async -> UserRole? { .member }

    func myGroups() async throws -> [LifeGroup] {
        myGroupsCalls += 1
        if failing { throw UXTestError.offline }
        return mine
    }

    func allGroups() async throws -> [LifeGroup] { [] }
}

private final class UXAnalyticsRepository: NSObject, LifeGroupAnalyticsRepository {
    var overviewCalls: [Int32?] = []
    var distributionCalls = 0
    var attendanceCalls: [Int32?] = []
    var rows: [LifeGroupAttendancePoint] = []

    func getAttendance(year: Int32, month: KotlinInt?, lifeGroupId: KotlinInt?, granularity: String?) async throws
        -> LifeGroupAttendanceAnalytics {
        attendanceCalls.append(lifeGroupId?.int32Value)
        return LifeGroupAttendanceAnalytics(granularity: "month", year: year, month: month, rows: rows)
    }

    func getDistribution(lifeGroupId: KotlinInt?) async throws -> LifeGroupDistributionAnalytics {
        distributionCalls += 1
        return LifeGroupDistributionAnalytics(byDay: [], byHour: [], byNeighborhood: [], byCity: [])
    }

    func getOverview(lifeGroupId: KotlinInt?) async throws -> LifeGroupOverview {
        overviewCalls.append(lifeGroupId?.int32Value)
        return LifeGroupOverview(
            totalKids: 0, avgMembersPerGroup: 0, groupsBySector: [], membersInGroup: 0, membersTotal: 0, lifeGroups: []
        )
    }
}

// MARK: - Error mapping (shared LifeGroupMeetingErrors)

@MainActor
final class LifeGroupMeetingErrorKindTests: XCTestCase {
    func testGroupNotFoundOnlyWithTheExplicitCode() {
        let error = kotlinError(404, "group_not_found")
        XCTAssertEqual(LifeGroupMeetingErrorMapping.kind(error), .groupNotFound)
        XCTAssertTrue(LifeGroupMeetingErrorMapping.message(error).hasPrefix("Grupo não encontrado"))
        XCTAssertFalse(LifeGroupMeetingErrorMapping.isRetryable(error))
    }

    func testPlain404AndServerErrorsAreUnavailableWithRetry() {
        for error in [
            kotlinError(404, nil, message: "Cannot GET /api/life-groups/2/meetings/2026-09-08"),
            kotlinError(503, nil), kotlinError(502, nil), kotlinError(501, nil),
        ] {
            XCTAssertEqual(LifeGroupMeetingErrorMapping.kind(error), .serverUnavailable)
            XCTAssertEqual(
                LifeGroupMeetingErrorMapping.message(error),
                "Recurso indisponível no servidor. Tente novamente mais tarde."
            )
            XCTAssertTrue(LifeGroupMeetingErrorMapping.isRetryable(error))
        }
    }

    func testNoPermissionHasNoRetryAndOfflineDoes() {
        let forbidden = kotlinError(403, nil)
        XCTAssertEqual(LifeGroupMeetingErrorMapping.kind(forbidden), .noPermission)
        XCTAssertFalse(LifeGroupMeetingErrorMapping.isRetryable(forbidden))
        XCTAssertEqual(LifeGroupMeetingErrorMapping.kind(UXTestError.offline), .offline)
        XCTAssertTrue(LifeGroupMeetingErrorMapping.isRetryable(UXTestError.offline))
    }

    func testHistoryMessageUsesTheErrorCodeWhenPresent() {
        XCTAssertEqual(
            LifeGroupMeetingErrorMapping.historyMessage(statusCode: 404, code: "group_not_found"),
            LifeGroupMeetingErrors.shared.MESSAGE_GROUP_NOT_FOUND
        )
    }

    func testHistoryMessagesUseTheStatusOnly() {
        // Attendance/reports endpoints have no meetings-API body: a bare 404 must never say "group not found".
        XCTAssertEqual(
            LifeGroupMeetingErrorMapping.historyMessage(statusCode: 404),
            "Recurso indisponível no servidor. Tente novamente mais tarde."
        )
        XCTAssertEqual(
            LifeGroupMeetingErrorMapping.historyMessage(statusCode: 403),
            LifeGroupMeetingErrors.shared.message(error: LifeGroupMeetingException(statusCode: 403, code: nil, serverMessage: nil))
        )
        XCTAssertEqual(
            LifeGroupMeetingErrorMapping.historyMessage(UXTestError.offline),
            LifeGroupMeetingErrors.shared.messageForHttpStatus(statusCode: nil, code: nil)
        )
    }
}

// MARK: - Meeting screen states

@MainActor
final class LifeGroupMeetingStatesTests: XCTestCase {
    private func makeViewModel(_ service: UXMeetingService, canWrite: Bool? = nil) -> LifeGroupMeetingViewModel {
        LifeGroupMeetingViewModel(
            lifeGroupId: 7, meetingDate: "2026-09-08", service: service, draftStore: UXDraftStore(),
            currentUserId: { "u1" }, viewerCanWrite: canWrite
        )
    }

    func testLoadErrorRetryPolicyFollowsTheKind() async {
        let cases: [(Error, Bool, String)] = [
            (kotlinError(404, "group_not_found"), false, "Grupo não encontrado"),
            (kotlinError(404, nil), true, "Recurso indisponível no servidor. Tente novamente mais tarde."),
            (kotlinError(500, nil), true, "servidor"),
            (kotlinError(403, nil), false, "permissão"),
            (UXTestError.offline, true, "conectar"),
        ]
        for (error, retryable, fragment) in cases {
            let service = UXMeetingService()
            service.result = .failure(error)
            let vm = makeViewModel(service)
            await vm.load()
            XCTAssertNotNil(vm.loadError)
            XCTAssertEqual(vm.loadErrorRetryable, retryable, "\(error)")
            XCTAssertTrue(vm.loadError?.contains(fragment) == true, "\(vm.loadError ?? "nil")")
            XCTAssertFalse(vm.isLoading)
        }
    }

    func testRetryAfterTheServerRecoversClearsTheError() async {
        let service = UXMeetingService()
        service.result = .failure(kotlinError(404, nil))
        let vm = makeViewModel(service)
        await vm.load()
        XCTAssertNotNil(vm.loadError)
        service.result = .success(uxMeeting(attendance: uxAttendance([true], isDraft: true), canEdit: true))
        await vm.load()
        XCTAssertNil(vm.loadError)
        XCTAssertTrue(vm.loadErrorRetryable)
    }

    func testPastDateWithoutRecordOpensAsReadOnlyEmptyState() async {
        let service = UXMeetingService()
        service.result = .success(uxMeeting(attendance: uxAttendance([true, true, true], isDraft: true), canEdit: false))
        let vm = makeViewModel(service)
        await vm.load()
        XCTAssertNil(vm.loadError)
        XCTAssertTrue(vm.isReadOnly)
        XCTAssertTrue(vm.isEmptyReadOnly)
        // Never a roster pre-filled with "everybody present".
        XCTAssertFalse(vm.showAttendanceRoster)
        XCTAssertEqual(vm.attendancePillText, "Sem presença")
        XCTAssertEqual(vm.reportPillText, "Sem relatório")
        XCTAssertEqual(LifeGroupMeetingRules.shared.noMeetingToViewMessage(), "Não há reunião registrada nesta data.")
    }

    func testEditableDateWithoutRecordIsNotTheEmptyState() async {
        let service = UXMeetingService()
        service.result = .success(uxMeeting(attendance: uxAttendance([true, false], isDraft: true), canEdit: true))
        let vm = makeViewModel(service)
        await vm.load()
        XCTAssertFalse(vm.isEmptyReadOnly)
        XCTAssertTrue(vm.showAttendanceRoster)
        XCTAssertEqual(vm.attendancePillText, "Presença pendente")
        XCTAssertEqual(vm.reportPillText, "Relatório pendente")
    }

    func testLegacyReportWithoutAttendanceRendersReadOnlyWithoutPresence() async {
        let service = UXMeetingService()
        service.result = .success(uxMeeting(attendance: nil, report: uxReport(), canEdit: false))
        let vm = makeViewModel(service)
        await vm.load()
        XCTAssertFalse(vm.isEmptyReadOnly)
        XCTAssertFalse(vm.showAttendanceRoster)
        XCTAssertEqual(vm.attendancePillText, "Sem presença")
        XCTAssertEqual(vm.reportPillText, "Relatório enviado")
    }

    func testReadOnlyMeetingWithSavedPresenceKeepsTheRoster() async {
        let service = UXMeetingService()
        service.result = .success(uxMeeting(attendance: uxAttendance([true, false], isDraft: false), canEdit: false))
        let vm = makeViewModel(service)
        await vm.load()
        XCTAssertFalse(vm.isEmptyReadOnly)
        XCTAssertTrue(vm.showAttendanceRoster)
        XCTAssertEqual(vm.attendancePillText, "Presença salva")
    }

    func testSupervisorOpeningARecordlessDateSeesTheEmptyState() async {
        let service = UXMeetingService()
        service.result = .success(uxMeeting(attendance: uxAttendance([true], isDraft: true), canEdit: true))
        let vm = makeViewModel(service, canWrite: false)
        await vm.load()
        XCTAssertTrue(vm.isWriteForbidden)
        XCTAssertTrue(vm.isEmptyReadOnly)
    }
}

// MARK: - Reuniões tabs, history rows, entry resolution

@MainActor
final class LifeGroupMeetingsTabsTests: XCTestCase {
    func testTabsAreReunioesAndRelatorios() {
        XCTAssertEqual(LifeGroupMeetingsTab.allCases.map(\.label), ["Reuniões", "Relatórios"])
    }

    func testHistoryViewModelStartsOnMeetingsAndSwitches() {
        let vm = LifeGroupMeetingHistoryViewModel(
            lifeGroupId: 7, meetingDay: nil, canWrite: true, source: UXHistorySource()
        )
        XCTAssertEqual(vm.selectedTab, .meetings)
        vm.selectedTab = .reports
        XCTAssertEqual(vm.selectedTab, .reports)
    }

    func testRowChips() {
        let both = LifeGroupMeetingRowChips(LifeGroupMeetingSummary(
            date: "2026-10-14", hasAttendance: true, reportStatusKnown: true, hasReport: true,
            presentCount: KotlinInt(int: 9), membersCount: KotlinInt(int: 12)
        ))
        XCTAssertEqual(both.presenceText, "Presença 9/12")
        XCTAssertEqual(both.reportText, "Relatório enviado")
        XCTAssertTrue(both.reportDone)

        let pending = LifeGroupMeetingRowChips(LifeGroupMeetingSummary(
            date: "2026-10-07", hasAttendance: true, reportStatusKnown: true, hasReport: false,
            presentCount: KotlinInt(int: 8), membersCount: KotlinInt(int: 12)
        ))
        XCTAssertEqual(pending.reportText, "Relatório pendente")
        XCTAssertFalse(pending.reportDone)

        // Legacy report-only row: no "Presença pendente" chip, only the report chip.
        let reportOnly = LifeGroupMeetingRowChips(LifeGroupMeetingSummary(
            date: "2026-09-01", hasAttendance: false, reportStatusKnown: true, hasReport: true,
            presentCount: nil, membersCount: nil
        ))
        XCTAssertNil(reportOnly.presenceText)
        XCTAssertEqual(reportOnly.reportText, "Relatório enviado")

        let unknownReport = LifeGroupMeetingRowChips(LifeGroupMeetingSummary(
            date: "2026-09-01", hasAttendance: true, reportStatusKnown: false, hasReport: false,
            presentCount: KotlinInt(int: 1), membersCount: KotlinInt(int: 2)
        ))
        XCTAssertNil(unknownReport.reportText)
    }

    func testHistoryErrorUsesMappedMessage() async {
        // No HTTP answer (offline): the mapped connectivity copy, never a raw localizedDescription.
        let vm = LifeGroupMeetingHistoryViewModel(
            lifeGroupId: 7, meetingDay: nil, canWrite: false,
            source: UXHistorySource(failure: UXTestError.offline)
        )
        await vm.load()
        XCTAssertEqual(vm.error, LifeGroupMeetingErrors.shared.messageForHttpStatus(statusCode: nil, code: nil))
        XCTAssertFalse(vm.isLoading)
    }

    // MARK: Entry

    func testSingleLedGroupOpensDirectly() async {
        let vm = LifeGroupMeetingEntryViewModel(
            source: UXEntrySource(role: .lifeGroupLeader, mine: [uxGroup(2, "Centro", relationship: "leader")])
        )
        await vm.load()
        XCTAssertEqual(vm.directGroup?.group.id, 2)
        XCTAssertEqual(vm.directGroup?.canWrite, true)
        XCTAssertNil(vm.error)
    }

    func testSeveralLedGroupsShowThePicker() async {
        let vm = LifeGroupMeetingEntryViewModel(
            source: UXEntrySource(
                role: .lifeGroupLeader,
                mine: [uxGroup(2, "Centro", relationship: "leader"), uxGroup(3, "Bairro", relationship: "co_leader")]
            )
        )
        await vm.load()
        XCTAssertNil(vm.directGroup)
        XCTAssertEqual(vm.pickerGroups.map(\.group.id), [3, 2])
    }

    func testAdminAlwaysGetsThePickerOverEveryGroup() async {
        let vm = LifeGroupMeetingEntryViewModel(
            source: UXEntrySource(role: .admin, mine: [], all: [uxGroup(1, "Alfa")])
        )
        await vm.load()
        XCTAssertNil(vm.directGroup)
        XCTAssertEqual(vm.pickerGroups.map(\.group.id), [1])
        XCTAssertEqual(vm.pickerGroups.first?.canWrite, true)
    }

    func testSupervisorOnlySeesReadOnlyGroups() async {
        let vm = LifeGroupMeetingEntryViewModel(
            source: UXEntrySource(
                role: .areaLeader,
                mine: [uxGroup(5, "Norte", relationship: "supervisor"), uxGroup(6, "Sul", supervised: true)]
            )
        )
        await vm.load()
        XCTAssertNil(vm.directGroup)
        XCTAssertEqual(vm.pickerGroups.count, 2)
        XCTAssertTrue(vm.pickerGroups.allSatisfy { !$0.canWrite })
    }

    func testNobodyGetsTheExplanatoryMessage() async {
        let vm = LifeGroupMeetingEntryViewModel(source: UXEntrySource(role: .member, mine: []))
        await vm.load()
        XCTAssertNil(vm.directGroup)
        XCTAssertTrue(vm.pickerGroups.isEmpty)
        XCTAssertNotNil(vm.emptyMessage)
    }

    func testLeadingOneGroupAndSupervisingAnotherListsBoth() async {
        let vm = LifeGroupMeetingEntryViewModel(
            source: UXEntrySource(
                role: .member,
                mine: [uxGroup(2, "A", relationship: "leader"), uxGroup(3, "B", relationship: "supervisor")]
            )
        )
        await vm.load()
        XCTAssertNil(vm.directGroup)
        XCTAssertEqual(vm.pickerGroups.map(\.group.id), [2, 3])
        XCTAssertEqual(vm.pickerGroups.map(\.canWrite), [true, false])
    }

    func testEntryLoadsOnceAndAFailedRefreshKeepsTheEntry() async {
        let source = UXFlakyEntrySource(mine: [uxGroup(2, "Centro", relationship: "leader")])
        let vm = LifeGroupMeetingEntryViewModel(source: source)
        await vm.loadIfNeeded()
        await vm.loadIfNeeded()
        XCTAssertEqual(source.myGroupsCalls, 1)
        XCTAssertEqual(vm.directGroup?.group.id, 2)

        source.failing = true
        await vm.load()
        XCTAssertEqual(vm.directGroup?.group.id, 2)
        XCTAssertNil(vm.error)
        XCTAssertFalse(vm.isLoading)
    }

    func testEntryLoadFailureIsMapped() async {
        let vm = LifeGroupMeetingEntryViewModel(
            source: UXEntrySource(role: .member, failure: UXTestError.offline)
        )
        await vm.load()
        XCTAssertEqual(vm.error, LifeGroupMeetingErrors.shared.messageForHttpStatus(statusCode: nil, code: nil))
        XCTAssertNil(vm.entry)
    }
}

// MARK: - Scoped analytics

@MainActor
final class LifeGroupScopedAnalyticsTests: XCTestCase {
    private func point(_ period: String, meetings: Int32, present: Int32, members: Int32) -> LifeGroupAttendancePoint {
        LifeGroupAttendancePoint(
            period: period, meetingsCount: meetings, presentCount: present, membersCount: members, attendanceRate: 0
        )
    }

    func testScopedTabRequestsOnlyThisGroupsAttendance() async {
        let repo = UXAnalyticsRepository()
        repo.rows = [point("2026-09", meetings: 2, present: 15, members: 20), point("2026-10", meetings: 1, present: 5, members: 10)]
        let vm = LifeGroupAnalyticsViewModel(lifeGroupId: 7, analyticsRepository: repo)
        await vm.loadInitial()
        XCTAssertEqual(repo.attendanceCalls, [7])
        // Church-wide overview and the distribution of "all groups" are never requested for one group.
        XCTAssertTrue(repo.overviewCalls.isEmpty)
        XCTAssertEqual(repo.distributionCalls, 0)
        XCTAssertTrue(vm.isScopedToGroup)
        XCTAssertNil(vm.overview)
        let summary = vm.attendanceSummary
        XCTAssertEqual(summary.meetingsCount, 3)
        XCTAssertEqual(summary.presentCount, 20)
        XCTAssertEqual(summary.membersCount, 30)
        XCTAssertEqual(summary.attendancePercent?.intValue, 67)
        XCTAssertEqual(summary.cardTitle, "Frequência do grupo")
        XCTAssertEqual(summary.cardValue, "67%")
        XCTAssertEqual(summary.cardSubtitle, "3 reuniões · 20 presenças de 30")
    }

    func testLoadInitialIsIdempotentSoSwitchingTabsDoesNotRefetch() async {
        let repo = UXAnalyticsRepository()
        let vm = LifeGroupAnalyticsViewModel(lifeGroupId: 7, analyticsRepository: repo)
        await vm.loadInitial()
        await vm.loadInitial()
        XCTAssertEqual(repo.attendanceCalls.count, 1)
    }

    func testUnscopedScreenKeepsTheChurchWideOverview() async {
        let repo = UXAnalyticsRepository()
        let vm = LifeGroupAnalyticsViewModel(lifeGroupId: nil, analyticsRepository: repo)
        await vm.loadInitial()
        XCTAssertFalse(vm.isScopedToGroup)
        XCTAssertEqual(repo.overviewCalls.count, 1)
        XCTAssertNil(repo.overviewCalls[0])
        XCTAssertEqual(repo.distributionCalls, 1)
        XCTAssertEqual(repo.attendanceCalls.count, 1)
    }

    func testEmptyScopedGroupHasNoPercent() async {
        let repo = UXAnalyticsRepository()
        let vm = LifeGroupAnalyticsViewModel(lifeGroupId: 7, analyticsRepository: repo)
        await vm.loadInitial()
        XCTAssertNil(vm.attendanceSummary.attendancePercent)
    }
}

// MARK: - Home layout and group detail gate

final class LifeGroupHomeSectionLayoutTests: XCTestCase {
    func testSingleGroupKeepsTheKickerWithoutHeader() {
        let layout = HomeLifeGroupCardKt.homeLifeGroupsLayout(groupCount: 1)
        XCTAssertFalse(layout.showsSectionHeader)
        XCTAssertTrue(layout.showsRowKicker)
        XCTAssertEqual(layout.dividerCount, 0)
        XCTAssertEqual(HomeLifeGroupsSection.shared.KICKER_SINGLE, "LIFE GROUP")
    }

    func testSeveralGroupsGetOneHeaderAndDividersBetweenRows() {
        let layout = HomeLifeGroupCardKt.homeLifeGroupsLayout(groupCount: 3)
        XCTAssertTrue(layout.showsSectionHeader)
        XCTAssertFalse(layout.showsRowKicker)
        XCTAssertEqual(layout.dividerCount, 2)
        XCTAssertEqual(HomeLifeGroupsSection.shared.HEADER_SEVERAL, "MEUS GRUPOS")
    }

    func testNoGroupsHasNoDividers() {
        XCTAssertEqual(HomeLifeGroupCardKt.homeLifeGroupsLayout(groupCount: 0).dividerCount, 0)
    }

    func testCardCapIsThree() {
        XCTAssertEqual(HomeViewModel.maxLifeGroupCards, 3)
    }

    // MARK: Gate for the single "Reuniões" entry (moved from the removed report list tests)

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
        for role in [UserRole.lifeGroupLeader, .member, .guest, .discipler] {
            XCTAssertFalse(LifeGroupDetailView.canViewGroupReports(role: role, isGroupLeadership: false), "\(role)")
        }
        XCTAssertFalse(LifeGroupDetailView.canViewGroupReports(role: nil, isGroupLeadership: false))
    }
}
