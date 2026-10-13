import Shared
import XCTest
@testable import PazChurch

// MARK: - Fakes and builders

@MainActor
private final class FakeMeetingService: LifeGroupMeetingService {
    var calls: [String] = []
    var extraFlags: [Bool?] = []
    var getResults: [Result<LifeGroupMeeting, Error>] = []
    var attendanceResult: Result<LifeGroupMeeting, Error> = .failure(TestError.unset)
    var reportResult: Result<LifeGroupMeeting, Error> = .failure(TestError.unset)

    func getMeeting(lifeGroupId: Int32, date: String, extraMeeting: Bool?) async throws -> LifeGroupMeeting {
        calls.append("get")
        extraFlags.append(extraMeeting)
        return try (getResults.count > 1 ? getResults.removeFirst() : getResults[0]).get()
    }

    func saveAttendance(
        lifeGroupId: Int32, date: String, entries: [LifeGroupAttendanceEntry], extraMeeting: Bool?
    ) async throws -> LifeGroupMeeting {
        calls.append("saveAttendance")
        extraFlags.append(extraMeeting)
        return try attendanceResult.get()
    }

    func saveReport(
        lifeGroupId: Int32,
        date: String,
        report: LifeGroupMeetingReportInput
    ) async throws -> LifeGroupMeeting {
        calls.append("saveReport")
        return try reportResult.get()
    }
}

@MainActor
private final class FakeDraftStore: LifeGroupMeetingDraftStoring {
    var drafts: [String: LifeGroupMeetingDraft] = [:]

    private func key(_ user: String, _ group: Int32, _ date: String) -> String {
        "\(user)_\(group)_\(date)"
    }

    func read(userId: String, lifeGroupId: Int32, date: String) async throws -> LifeGroupMeetingDraft? {
        drafts[key(userId, lifeGroupId, date)]
    }

    func save(userId: String, lifeGroupId: Int32, date: String, draft: LifeGroupMeetingDraft) async throws {
        drafts[key(userId, lifeGroupId, date)] = draft
    }

    func clear(userId: String, lifeGroupId: Int32, date: String) async throws {
        drafts[key(userId, lifeGroupId, date)] = nil
    }
}

private enum TestError: Error { case unset, offline }

private struct FakeHistorySource: LifeGroupMeetingHistorySource {
    var attendance: [LifeGroupAttendance] = []
    var reportsResult: Result<[LifeGroupWeeklyReport], Error> = .success([])

    func attendanceHistory(lifeGroupId: Int32) async throws -> [LifeGroupAttendance] {
        attendance
    }

    func reports(lifeGroupId: Int32) async throws -> [LifeGroupWeeklyReport] {
        try reportsResult.get()
    }
}

private func meetingError(_ status: Int32, _ code: String?) -> Error {
    NSError(
        domain: "KotlinException", code: 0,
        userInfo: ["KotlinException": LifeGroupMeetingException(statusCode: status, code: code, serverMessage: nil)]
    )
}

private func entries(_ present: [Bool]) -> [LifeGroupAttendanceEntry] {
    present.enumerated().map { LifeGroupAttendanceEntry(
        userId: Int32($0.offset + 1),
        name: "Membro \($0.offset + 1)",
        present: $0.element
    ) }
}

private func attendance(
    _ present: [Bool], isDraft: Bool, isExtra: Bool = false
) -> LifeGroupMeetingAttendance {
    LifeGroupMeetingAttendance(
        id: isDraft ? nil : "att-1", meetingDate: "2026-10-07",
        presentCount: Int32(present.filter { $0 }.count), membersCount: Int32(present.count),
        entries: entries(present), isDraft: isDraft, isExtra: isExtra,
        defaultPresent: isDraft ? KotlinBoolean(bool: true) : nil
    )
}

private func report() -> LifeGroupWeeklyReport {
    LifeGroupWeeklyReport(
        id: "rep-1", date: "2026-10-07", lifeGroupId: 7, committedMembers: 3, committedMembersPresent: 3,
        kids0To11: 2, guests: 1, mdas: 1, offering: "150.50", committedAtTadel: 1, committedAtCulto: 2,
        leaderAttended: ["tadel"], disciplesCount: 2, disciplesDiscipledThisWeek: 1,
        pastoringActivityType: [], pastoringActivityOther: nil, trainingActivityType: [], trainingActivityOther: nil,
        submittedByName: nil, createdAt: nil
    )
}

private func meeting(
    attendance att: LifeGroupMeetingAttendance?, report rep: LifeGroupWeeklyReport? = nil,
    canEdit: Bool = true, blocked: MeetingReportBlockedReason? = nil
) -> LifeGroupMeeting {
    LifeGroupMeeting(
        lifeGroupId: 7, meetingDate: "2026-10-07", attendance: att, report: rep,
        committedMembers: att.map { KotlinInt(int: $0.membersCount) },
        committedMembersPresent: att.map { KotlinInt(int: $0.presentCount) },
        canEdit: canEdit, editDeadline: "2026-10-21", reportBlockedReason: blocked
    )
}

private func validReportDraft() -> LifeGroupMeetingReportDraft {
    LifeGroupMeetingReportDraft.empty
        .setting(.offering, to: "150,50")
        .setting(.kids0To11, to: "2")
}

// MARK: - Meeting view model

@MainActor
final class LifeGroupMeetingViewModelTests: XCTestCase {
    private func makeViewModel(
        service: FakeMeetingService, store: FakeDraftStore? = nil, userId: String? = "u1"
    ) -> LifeGroupMeetingViewModel {
        LifeGroupMeetingViewModel(
            lifeGroupId: 7, meetingDate: "2026-10-07", service: service, draftStore: store ?? FakeDraftStore(),
            currentUserId: { userId }
        )
    }

    private func draftMeetingService() -> FakeMeetingService {
        let service = FakeMeetingService()
        service.getResults = [.success(meeting(attendance: attendance([true, true, true], isDraft: true)))]
        return service
    }

    func testLoadShowsAllPresentDraftWithoutRestoredBanner() async {
        let vm = makeViewModel(service: draftMeetingService())
        await vm.load()
        XCTAssertFalse(vm.isLoading)
        XCTAssertEqual(vm.entries.count, 3)
        XCTAssertTrue(vm.allPresent)
        XCTAssertFalse(vm.draftRestored)
        XCTAssertFalse(vm.isAttendanceSaved)
        XCTAssertEqual(vm.presenceSummary, "3 de 3 presentes")
    }

    func testLocalDraftIsRestoredOverServerData() async {
        let store = FakeDraftStore()
        store.drafts["u1_7_2026-10-07"] = LifeGroupMeetingDraft(
            attendance: [LifeGroupMeetingDraftEntry(userId: 2, present: false)],
            report: validReportDraft(), extraMeeting: false
        )
        let vm = makeViewModel(service: draftMeetingService(), store: store)
        await vm.load()
        XCTAssertTrue(vm.draftRestored)
        XCTAssertEqual(vm.entries.map(\.present), [true, false, true])
        XCTAssertEqual(vm.reportDraft.offering, "150,50")
    }

    func testDraftsAreKeyedByUser() async {
        let store = FakeDraftStore()
        store.drafts["other_7_2026-10-07"] = LifeGroupMeetingDraft(
            attendance: [LifeGroupMeetingDraftEntry(userId: 1, present: false)], report: nil, extraMeeting: false
        )
        let vm = makeViewModel(service: draftMeetingService(), store: store)
        await vm.load()
        XCTAssertFalse(vm.draftRestored)
        XCTAssertTrue(vm.allPresent)
    }

    func testTogglesPersistDraftAndRevertingClearsIt() async {
        let store = FakeDraftStore()
        let vm = makeViewModel(service: draftMeetingService(), store: store)
        await vm.load()
        vm.togglePresent(userId: 1)
        await vm.persistTask?.value
        XCTAssertNotNil(store.drafts["u1_7_2026-10-07"]?.attendance)
        vm.togglePresent(userId: 1)
        await vm.persistTask?.value
        XCTAssertNil(store.drafts["u1_7_2026-10-07"])
    }

    func testAllPresentSwitchMarksEveryoneAbsentThenPresent() async {
        let vm = makeViewModel(service: draftMeetingService())
        await vm.load()
        vm.setAllPresent(false)
        XCTAssertEqual(vm.committedMembersPresent, 0)
        XCTAssertEqual(vm.committedMembers, 3)
        vm.setAllPresent(true)
        XCTAssertTrue(vm.allPresent)
    }

    func testReportIsLockedUntilAttendanceIsSavedThenSavedSecond() async {
        let service = draftMeetingService()
        let saved = meeting(attendance: attendance([true, true, true], isDraft: false))
        service.attendanceResult = .success(saved)
        service.reportResult = .success(meeting(attendance: saved.attendance, report: report()))
        let vm = makeViewModel(service: service)
        await vm.load()

        XCTAssertFalse(vm.canEditReport)
        XCTAssertEqual(vm.reportLockedMessage, "Salve a presença para liberar o relatório.")
        vm.updateReport(.offering, to: "10")
        XCTAssertEqual(vm.reportDraft.offering, "")
        await vm.saveReport()
        XCTAssertEqual(service.calls, ["get"])

        await vm.saveAttendance()
        XCTAssertTrue(vm.isAttendanceSaved)
        XCTAssertEqual(vm.attendanceNotice, "Presença salva.")
        XCTAssertTrue(vm.canEditReport)

        vm.updateReport(.offering, to: "150,50")
        await vm.saveReport()
        XCTAssertEqual(service.calls, ["get", "saveAttendance", "saveReport"])
        XCTAssertTrue(vm.isReportSaved)
        XCTAssertEqual(vm.reportNotice, "Relatório salvo.")
        XCTAssertEqual(vm.reportDraft.offering, "150.50")
    }

    func testEditingPresenceAfterSaveRelocksReport() async {
        let service = draftMeetingService()
        service.attendanceResult = .success(meeting(attendance: attendance([true, true, true], isDraft: false)))
        let vm = makeViewModel(service: service)
        await vm.load()
        await vm.saveAttendance()
        XCTAssertTrue(vm.canEditReport)
        vm.togglePresent(userId: 3)
        XCTAssertFalse(vm.canEditReport)
        XCTAssertEqual(vm.reportLockedMessage, "Salve as alterações da presença antes de enviar o relatório.")
        XCTAssertTrue(vm.canSaveAttendance)
    }

    func testUntouchedReportFormCannotBeSavedAsAllZeroReport() async {
        let service = draftMeetingService()
        service.attendanceResult = .success(meeting(attendance: attendance([true, true, true], isDraft: false)))
        service.reportResult = .success(meeting(attendance: attendance([true, true, true], isDraft: false), report: report()))
        let vm = makeViewModel(service: service)
        await vm.load()
        await vm.saveAttendance()
        XCTAssertTrue(vm.canEditReport)
        XCTAssertFalse(vm.canSaveReport)
        await vm.saveReport()
        XCTAssertEqual(service.calls, ["get", "saveAttendance"])

        vm.updateReport(.guests, to: "0")
        XCTAssertTrue(vm.canSaveReport)
        await vm.saveReport()
        XCTAssertEqual(service.calls, ["get", "saveAttendance", "saveReport"])
    }

    func testEditsAreIgnoredWhileASaveIsInFlight() async {
        let vm = makeViewModel(service: draftMeetingService())
        await vm.load()
        vm.isSavingAttendance = true
        vm.togglePresent(userId: 1)
        vm.setAllPresent(false)
        XCTAssertTrue(vm.allPresent)
        vm.isSavingAttendance = false
        vm.togglePresent(userId: 1)
        XCTAssertFalse(vm.allPresent)
    }

    func testStoredExtraDraftRejectedByServerIsDroppedAndRefetchedWithoutFlag() async {
        let store = FakeDraftStore()
        store.drafts["u1_7_2026-10-07"] = LifeGroupMeetingDraft(
            attendance: [LifeGroupMeetingDraftEntry(userId: 1, present: false)], report: nil, extraMeeting: true
        )
        let service = FakeMeetingService()
        service.getResults = [
            .failure(meetingError(400, "extra_meeting_on_regular_day")),
            .success(meeting(attendance: attendance([true, true], isDraft: true))),
        ]
        let vm = makeViewModel(service: service, store: store)
        await vm.load()
        XCTAssertNil(vm.loadError)
        XCTAssertNotNil(vm.meeting)
        XCTAssertFalse(vm.isExtra)
        XCTAssertEqual(service.extraFlags.count, 2)
        XCTAssertEqual(service.extraFlags.last ?? nil, nil)
        await vm.persistTask?.value
        XCTAssertNotEqual(store.drafts["u1_7_2026-10-07"]?.extraMeeting, true)
    }

    func testLegacyReportWithoutAttendanceExplainsInsteadOfAskingToSavePresence() async {
        let service = FakeMeetingService()
        service.getResults = [.success(meeting(attendance: nil, report: report()))]
        let vm = makeViewModel(service: service)
        await vm.load()
        XCTAssertEqual(vm.reportLockedMessage, LifeGroupMeetingRules.shared.legacyReportMessage())
    }

    func testInvalidReportShowsFieldErrorsWithoutCallingService() async {
        let service = draftMeetingService()
        service.attendanceResult = .success(meeting(attendance: attendance([true, true, true], isDraft: false)))
        let vm = makeViewModel(service: service)
        await vm.load()
        await vm.saveAttendance()
        vm.updateReport(.offering, to: "abc")
        await vm.saveReport()
        XCTAssertEqual(service.calls, ["get", "saveAttendance"])
        XCTAssertNotNil(vm.reportErrors[LifeGroupMeetingReportFormField.offering.validationField])
        XCTAssertNotNil(vm.reportError)
    }

    func testReportBlockedReasonLocksReportEvenWithSavedAttendance() async {
        let service = FakeMeetingService()
        service.getResults = [.success(meeting(
            attendance: attendance([true], isDraft: false),
            blocked: .groupHasNoSector
        ))]
        let vm = makeViewModel(service: service)
        await vm.load()
        XCTAssertFalse(vm.canEditReport)
        XCTAssertEqual(
            vm.reportLockedMessage,
            LifeGroupMeetingRules.shared.reportBlockedMessage(reason: .groupHasNoSector)
        )
    }

    func testSaveErrorsMapToSharedCopy() async {
        let service = draftMeetingService()
        service.attendanceResult = .failure(meetingError(409, "extra_meeting_limit_reached"))
        let vm = makeViewModel(service: service)
        await vm.load()
        await vm.saveAttendance()
        XCTAssertEqual(vm.attendanceError, "Este grupo já atingiu o limite de reuniões extras desta semana.")
        XCTAssertFalse(vm.isSavingAttendance)

        service.attendanceResult = .failure(TestError.offline)
        await vm.saveAttendance()
        XCTAssertEqual(vm.attendanceError, "Não foi possível conectar. Verifique sua conexão e tente novamente.")
    }

    func testLoadErrorMapsAndRetrySucceeds() async {
        let service = FakeMeetingService()
        service.getResults = [
            .failure(meetingError(404, nil)),
            .success(meeting(attendance: attendance([true], isDraft: true))),
        ]
        let vm = makeViewModel(service: service)
        await vm.load()
        XCTAssertEqual(vm.loadError, "Grupo não encontrado. Atualize a tela e tente novamente.")
        await vm.load()
        XCTAssertNil(vm.loadError)
        XCTAssertNotNil(vm.meeting)
    }

    func testEditWindowClosedDuringSaveReloadsReadOnly() async {
        let service = FakeMeetingService()
        service.getResults = [
            .success(meeting(attendance: attendance([true, true], isDraft: true))),
            .success(meeting(attendance: attendance([true, true], isDraft: false), canEdit: false)),
        ]
        service.attendanceResult = .failure(meetingError(403, "edit_window_closed"))
        let vm = makeViewModel(service: service)
        await vm.load()
        await vm.saveAttendance()
        // Same as Android: the reload replaces the error with the read-only banner (isReadOnly).
        XCTAssertEqual(
            LifeGroupMeetingErrorMapping.message(meetingError(403, "edit_window_closed")),
            "O prazo para editar esta reunião terminou. Peça a um administrador."
        )
        XCTAssertNil(vm.attendanceError)
        XCTAssertEqual(service.calls, ["get", "saveAttendance", "get"])
        XCTAssertTrue(vm.isReadOnly)
    }

    func testReadOnlyMeetingBlocksEditsAndIgnoresStaleDraft() async {
        let store = FakeDraftStore()
        store.drafts["u1_7_2026-10-07"] = LifeGroupMeetingDraft(
            attendance: [LifeGroupMeetingDraftEntry(userId: 1, present: false)], report: nil, extraMeeting: false
        )
        let service = FakeMeetingService()
        service.getResults = [.success(meeting(
            attendance: attendance([true, true], isDraft: false),
            report: report(),
            canEdit: false
        ))]
        let vm = makeViewModel(service: service, store: store)
        await vm.load()
        XCTAssertTrue(vm.isReadOnly)
        XCTAssertFalse(vm.draftRestored)
        XCTAssertEqual(vm.entries.map(\.present), [true, true])
        vm.togglePresent(userId: 1)
        vm.setAllPresent(false)
        XCTAssertEqual(vm.entries.map(\.present), [true, true])
        XCTAssertFalse(vm.canSaveAttendance)
        XCTAssertFalse(vm.canEditReport)
        XCTAssertNil(vm.reportLockedMessage)
        XCTAssertEqual(
            LifeGroupMeetingRules.shared.readOnlyMessage(editDeadline: "2026-10-21"),
            "O prazo para editar esta reunião terminou em 21/10/2026. Somente leitura: peça a um administrador para alterar."
        )
    }

    func testExtraMeetingRequiredThenChosenReRequestsWithFlagAndSavesAsExtra() async {
        let service = FakeMeetingService()
        service.getResults = [
            .failure(meetingError(400, "extra_meeting_required")),
            .success(meeting(attendance: attendance([true, true], isDraft: true, isExtra: true))),
        ]
        service.attendanceResult = .success(meeting(attendance: attendance(
            [true, true],
            isDraft: false,
            isExtra: true
        )))
        let vm = makeViewModel(service: service)
        await vm.load()
        XCTAssertTrue(vm.needsExtraChoice)
        XCTAssertTrue(vm.showExtraToggle)
        XCTAssertNil(vm.loadError)
        XCTAssertNil(vm.meeting)

        await vm.setExtraMeeting(true)
        XCTAssertFalse(vm.needsExtraChoice)
        XCTAssertTrue(vm.isExtra)
        XCTAssertEqual(service.extraFlags.last ?? nil, true)

        await vm.saveAttendance()
        XCTAssertEqual(service.extraFlags.last ?? nil, true)
        XCTAssertTrue(vm.isExtraLocked)
        XCTAssertTrue(vm.isExtra)
    }

    func testExtraFlagIsOmittedForRegularMeetings() async {
        let service = draftMeetingService()
        service.attendanceResult = .success(meeting(attendance: attendance([true, true, true], isDraft: false)))
        let vm = makeViewModel(service: service)
        await vm.load()
        await vm.saveAttendance()
        XCTAssertEqual(service.extraFlags, [nil, nil])
    }

    func testExtraChoiceIsRememberedInLocalDraft() async {
        let store = FakeDraftStore()
        let service = FakeMeetingService()
        service.getResults = [
            .failure(meetingError(400, "extra_meeting_required")),
            .success(meeting(attendance: attendance([true], isDraft: true, isExtra: true))),
        ]
        let vm = makeViewModel(service: service, store: store)
        await vm.load()
        await vm.setExtraMeeting(true)
        await vm.persistTask?.value
        XCTAssertEqual(store.drafts["u1_7_2026-10-07"]?.extraMeeting, true)
    }

    func testMissingUserSkipsDraftsButStillLoads() async {
        let store = FakeDraftStore()
        let vm = makeViewModel(service: draftMeetingService(), store: store, userId: nil)
        await vm.load()
        vm.togglePresent(userId: 1)
        await vm.persistTask?.value
        XCTAssertTrue(store.drafts.isEmpty)
        XCTAssertNotNil(vm.meeting)
    }
}

// MARK: - History view model, dates, deep link

@MainActor
final class LifeGroupMeetingHistoryViewModelTests: XCTestCase {
    private func savedAttendance(_ date: String, present: Int32, members: Int32) -> LifeGroupAttendance {
        LifeGroupAttendance(
            id: "a-\(date)", lifeGroupId: 7, meetingDate: date, presentCount: present, membersCount: members,
            entries: [], isDraft: false
        )
    }

    private func reportOn(_ date: String) -> LifeGroupWeeklyReport {
        let base = report()
        return LifeGroupWeeklyReport(
            id: "r-\(date)", date: date, lifeGroupId: 7, committedMembers: base.committedMembers,
            committedMembersPresent: base.committedMembersPresent, kids0To11: 0, guests: 0, mdas: 0, offering: "0.00",
            committedAtTadel: 0, committedAtCulto: 0, leaderAttended: [], disciplesCount: 0,
            disciplesDiscipledThisWeek: 0,
            pastoringActivityType: [], pastoringActivityOther: nil, trainingActivityType: [],
            trainingActivityOther: nil,
            submittedByName: nil, createdAt: nil
        )
    }

    func testHistoryMergesAttendanceAndReportsNewestFirst() async {
        let source = FakeHistorySource(
            attendance: [
                savedAttendance("2026-09-30", present: 4, members: 5),
                savedAttendance("2026-10-07", present: 5, members: 5),
            ],
            reportsResult: .success([reportOn("2026-10-07"), reportOn("2026-10-14")])
        )
        let vm = LifeGroupMeetingHistoryViewModel(
            lifeGroupId: 7,
            meetingDay: "Quarta-feira",
            source: source,
            today: { "2026-10-14" }
        )
        await vm.load()
        XCTAssertEqual(vm.meetings.map(\.date), ["2026-10-14", "2026-10-07", "2026-09-30"])
        XCTAssertEqual(vm.meetings.map(\.hasAttendance), [false, true, true])
        XCTAssertEqual(vm.meetings.map(\.hasReport), [true, true, false])
        XCTAssertTrue(vm.meetings.allSatisfy(\.reportStatusKnown))
    }

    func testReportsFailureHidesReportStatusInsteadOfClaimingPending() async {
        let source = FakeHistorySource(
            attendance: [savedAttendance("2026-10-07", present: 1, members: 2)],
            reportsResult: .failure(TestError.offline)
        )
        let vm = LifeGroupMeetingHistoryViewModel(
            lifeGroupId: 7,
            meetingDay: nil,
            source: source,
            today: { "2026-10-14" }
        )
        await vm.load()
        XCTAssertNil(vm.error)
        XCTAssertEqual(vm.meetings.count, 1)
        XCTAssertFalse(vm.meetings[0].reportStatusKnown)
    }

    func testNewMeetingDefaultsToLatestRegularDayAndRejectsFuture() {
        // 2026-10-14 is a Wednesday.
        let vm = LifeGroupMeetingHistoryViewModel(
            lifeGroupId: 7, meetingDay: "Sábado", source: FakeHistorySource(), today: { "2026-10-14" }
        )
        XCTAssertEqual(vm.defaultNewMeetingDate, "2026-10-10")
        XCTAssertTrue(vm.needsExtraMeeting("2026-10-14"))
        XCTAssertFalse(vm.needsExtraMeeting("2026-10-10"))
        XCTAssertEqual(vm.validatedNewMeetingDate("2026-10-14"), "2026-10-14")
        XCTAssertNil(vm.validatedNewMeetingDate("2026-10-15"))
        XCTAssertNil(vm.validatedNewMeetingDate("garbage"))

        let noFixedDay = LifeGroupMeetingHistoryViewModel(
            lifeGroupId: 7, meetingDay: nil, source: FakeHistorySource(), today: { "2026-10-14" }
        )
        XCTAssertEqual(noFixedDay.defaultNewMeetingDate, "2026-10-14")
        XCTAssertFalse(noFixedDay.needsExtraMeeting("2026-10-13"))
    }

    func testIsoDateRoundTrip() {
        let date = LifeGroupMeetingDates.date(fromISO: "2026-03-08")
        XCTAssertNotNil(date)
        XCTAssertEqual(date.map(LifeGroupMeetingDates.iso(from:)), "2026-03-08")
        XCTAssertNil(LifeGroupMeetingDates.date(fromISO: "2026-3-8"))
    }

    func testPresencaDeepLinkRoutesToTheCombinedMeetingScreenOnTheHomeStack() {
        let destination = DeepLinkDestination.from(userInfo: ["deep_link": "paz://presenca/42/2026-10-05"])
        XCTAssertEqual(destination, .lifeGroupAttendanceEditor(lifeGroupId: "42", meetingDate: "2026-10-05"))
        XCTAssertEqual(destination?.usesHomeStack, true)
        XCTAssertNil(DeepLinkDestination.from(userInfo: ["deep_link": "paz://presenca/42/2026-10-5"]))
    }
}
