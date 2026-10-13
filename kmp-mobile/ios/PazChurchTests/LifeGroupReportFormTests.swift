import Shared
import XCTest
@testable import PazChurch

private final class FakeFormDataSource: LifeGroupReportFormDataSource {
    var groups: [LifeGroup] = []
    var allGroups: [LifeGroup] = []
    var role: UserRole? = .lifeGroupLeader
    private(set) var allGroupsRequested = false
    var loadFailure: Error?
    var submitFailure: Error?
    private(set) var submitted: [LifeGroupReportForm] = []

    func myLifeGroups() async throws -> [LifeGroup] {
        if let loadFailure {
            throw loadFailure
        }
        return groups
    }

    func allLifeGroups() async throws -> [LifeGroup] {
        allGroupsRequested = true
        return allGroups
    }

    func currentRole() async throws -> UserRole? {
        role
    }

    func submit(_ form: LifeGroupReportForm) async throws {
        if let submitFailure {
            throw submitFailure
        }
        submitted.append(form)
    }
}

final class LifeGroupReportFormTests: XCTestCase {
    /// 2026-10-12T02:30:00Z == 2026-10-11 23:30 in America/Sao_Paulo (UTC-3).
    private let lateEveningSaoPaulo = Date(timeIntervalSince1970: 1_791_772_200)

    private func group(_ id: Int32, _ relationship: String?, supervised: Bool = false) -> LifeGroup {
        LifeGroup(
            id: id, name: "Grupo \(id)", leaderId: nil, leader: nil, leaderPhone: nil,
            coLeaderId: nil, coLeaderName: nil, coLeaderPhone: nil,
            sectorId: nil, location: nil, latitude: nil, longitude: nil, meetingDay: nil, meetingTime: nil,
            membersCount: 5, kidsCount: 0, members: nil, relationship: relationship, isSupervised: supervised
        )
    }

    @MainActor
    private func makeViewModel(
        _ source: FakeFormDataSource,
        preselected: Int32? = nil
    ) -> LifeGroupReportFormViewModel {
        LifeGroupReportFormViewModel(
            dataSource: source,
            preselectedLifeGroupId: preselected,
            now: { self.lateEveningSaoPaulo }
        )
    }

    @MainActor
    private func fillValid(_ vm: LifeGroupReportFormViewModel) {
        vm.committedMembers = "10"
        vm.committedMembersPresent = "8"
        vm.kids0To11 = "3"
        vm.guests = "2"
        vm.mdas = "1"
        vm.offering = "150,5"
        vm.committedAtTadel = "4"
        vm.committedAtCulto = "5"
        vm.leaderAttended = "Tadel, Culto"
        vm.disciplesCount = "6"
        vm.disciplesDiscipledThisWeek = "2"
        vm.pastoringActivityType = "Visita"
        vm.pastoringActivityOther = "  Hospital "
    }

    // MARK: - Picker / preselection

    @MainActor
    func testSingleLedGroupIsPreselectedAndOnlyLedGroupsAreOffered() async {
        let source = FakeFormDataSource()
        source.groups = [group(7, "leader"), group(8, "supervisor", supervised: true), group(9, "member")]
        let vm = makeViewModel(source)
        await vm.load()

        XCTAssertFalse(vm.isLoading)
        XCTAssertEqual(vm.groups.map(\.id), [7])
        XCTAssertFalse(vm.canChooseGroup)
        XCTAssertEqual(vm.lifeGroupId, 7)
        XCTAssertNil(vm.noGroupsMessage)
    }

    @MainActor
    func testAdminAndPastorAreOfferedEveryGroupWithNonePreselected() async {
        for role in [UserRole.admin, UserRole.pastor] {
            let source = FakeFormDataSource()
            source.role = role
            source.groups = [group(7, "leader")]
            source.allGroups = [group(9, nil), group(7, "leader"), group(8, nil)]

            let vm = makeViewModel(source)
            await vm.load()
            XCTAssertEqual(vm.groups.map(\.id), [7, 8, 9])
            XCTAssertTrue(vm.canChooseGroup)
            XCTAssertNil(vm.lifeGroupId)
            XCTAssertNil(vm.noGroupsMessage)

            let fromGroup = makeViewModel(source, preselected: 9)
            await fromGroup.load()
            XCTAssertEqual(fromGroup.lifeGroupId, 9)
        }
    }

    @MainActor
    func testLeaderNeverRequestsTheFullGroupList() async {
        let source = FakeFormDataSource()
        source.role = .lifeGroupLeader
        source.groups = [group(7, "leader")]
        source.allGroups = [group(7, "leader"), group(8, nil)]
        let vm = makeViewModel(source)
        await vm.load()
        XCTAssertEqual(vm.groups.map(\.id), [7])
        XCTAssertFalse(source.allGroupsRequested)
    }

    @MainActor
    func testSeveralGroupsRequireChoiceUnlessOpenedFromOne() async {
        let source = FakeFormDataSource()
        source.groups = [group(7, "leader"), group(8, "co_leader"), group(9, "supervisor")]

        let none = makeViewModel(source)
        await none.load()
        XCTAssertTrue(none.canChooseGroup)
        XCTAssertNil(none.lifeGroupId)

        let fromDetail = makeViewModel(source, preselected: 8)
        await fromDetail.load()
        XCTAssertEqual(fromDetail.lifeGroupId, 8)

        // A group the viewer only supervises is not preselected.
        let notAllowed = makeViewModel(source, preselected: 9)
        await notAllowed.load()
        XCTAssertNil(notAllowed.lifeGroupId)
    }

    @MainActor
    func testSupervisorOnlyGetsReadOnlyMessage() async {
        let source = FakeFormDataSource()
        source.groups = [group(8, "supervisor", supervised: true)]
        let vm = makeViewModel(source)
        await vm.load()
        XCTAssertTrue(vm.groups.isEmpty)
        XCTAssertTrue(vm.noGroupsMessage?.contains("consultar") == true)
    }

    @MainActor
    func testLoadFailureThenRetry() async {
        let source = FakeFormDataSource()
        source.loadFailure = NSError(domain: "t", code: 1, userInfo: [NSLocalizedDescriptionKey: "offline"])
        let vm = makeViewModel(source)
        await vm.load()
        XCTAssertEqual(vm.loadError, "offline")

        source.loadFailure = nil
        source.groups = [group(7, "leader")]
        await vm.load()
        XCTAssertNil(vm.loadError)
        XCTAssertEqual(vm.lifeGroupId, 7)
    }

    // MARK: - Date

    @MainActor
    func testDateDefaultsToTodayInSaoPauloNotUTC() async {
        let source = FakeFormDataSource()
        source.groups = [group(7, "leader")]
        let vm = makeViewModel(source)
        await vm.load()
        XCTAssertEqual(vm.today, "2026-10-11")
        XCTAssertEqual(vm.date, "2026-10-11")
    }

    @MainActor
    func testISODateRoundTrip() throws {
        let date = try XCTUnwrap(LifeGroupReportFormViewModel.date(fromISO: "2026-10-05"))
        XCTAssertEqual(LifeGroupReportFormViewModel.iso(from: date), "2026-10-05")
        XCTAssertNil(LifeGroupReportFormViewModel.date(fromISO: "05/10/2026"))
    }

    // MARK: - Validation

    @MainActor
    func testInvalidSubmitShowsErrorsAndDoesNotCallBackend() async {
        let source = FakeFormDataSource()
        source.groups = [group(7, "leader"), group(8, "leader")]
        let vm = makeViewModel(source)
        await vm.load()
        XCTAssertNil(vm.currentValidation)

        vm.guests = "-1"
        vm.date = "2026-10-12" // future in Sao Paulo
        await vm.submit()

        let validation = try? XCTUnwrap(vm.currentValidation)
        XCTAssertNotNil(validation?.errorFor(field: .lifeGroup))
        XCTAssertNotNil(validation?.errorFor(field: .guests))
        XCTAssertEqual(validation?.errorFor(field: .date), "A data não pode ser futura.")
        XCTAssertNil(validation?.errorFor(field: .mdas))
        XCTAssertTrue(source.submitted.isEmpty)
        XCTAssertFalse(vm.isSubmitted)

        // Errors stay live and clear as the user fixes the fields.
        vm.lifeGroupId = 8
        vm.guests = "2"
        vm.date = "2026-10-11"
        XCTAssertEqual(vm.currentValidation?.isValid, true)
    }

    // MARK: - Payload

    @MainActor
    func testValidSubmitBuildsExactPayload() async throws {
        let source = FakeFormDataSource()
        source.groups = [group(7, "leader")]
        let vm = makeViewModel(source)
        await vm.load()
        fillValid(vm)

        await vm.submit()

        let form = try XCTUnwrap(source.submitted.first)
        XCTAssertEqual(form.date, "2026-10-11")
        XCTAssertEqual(form.lifeGroupId, 7)
        XCTAssertEqual(form.committedMembers, 10)
        XCTAssertEqual(form.committedMembersPresent, 8)
        XCTAssertEqual(form.kids0To11, 3)
        XCTAssertEqual(form.guests, 2)
        XCTAssertEqual(form.mdas, 1)
        XCTAssertEqual(form.offering, "150.50")
        XCTAssertEqual(form.committedAtTadel, 4)
        XCTAssertEqual(form.committedAtCulto, 5)
        XCTAssertEqual(form.leaderAttended, ["Tadel", "Culto"])
        XCTAssertEqual(form.disciplesCount, 6)
        XCTAssertEqual(form.disciplesDiscipledThisWeek, 2)
        XCTAssertEqual(form.pastoringActivityType, ["Visita"])
        XCTAssertEqual(form.pastoringActivityOther, "Hospital")
        XCTAssertEqual(form.trainingActivityType, [])
        XCTAssertNil(form.trainingActivityOther)
        XCTAssertTrue(vm.isSubmitted)
        XCTAssertFalse(vm.isSubmitting)
        XCTAssertNil(vm.submitError)
    }

    @MainActor
    func testOfferingAcceptsCommaOrDotAndBlankMeansZero() {
        XCTAssertEqual(LifeGroupReportRules.shared.normalizeOffering(raw: "150,50"), "150.50")
        XCTAssertEqual(LifeGroupReportRules.shared.normalizeOffering(raw: "150.5"), "150.50")
        XCTAssertEqual(LifeGroupReportRules.shared.normalizeOffering(raw: "1.234,56"), "1234.56")
        XCTAssertEqual(LifeGroupReportRules.shared.normalizeOffering(raw: ""), "0.00")
        XCTAssertNil(LifeGroupReportRules.shared.normalizeOffering(raw: "abc"))
    }

    @MainActor
    func testSubmitFailureShowsFriendlyMessageAndKeepsForm() async {
        let source = FakeFormDataSource()
        source.groups = [group(7, "leader")]
        source.submitFailure = NSError(domain: "t", code: 1, userInfo: [NSLocalizedDescriptionKey: "boom"])
        let vm = makeViewModel(source)
        await vm.load()
        fillValid(vm)

        await vm.submit()

        XCTAssertFalse(vm.isSubmitted)
        XCTAssertFalse(vm.isSubmitting)
        XCTAssertTrue(vm.submitError?.contains("conexão") == true)
        XCTAssertEqual(vm.committedMembers, "10")
    }

    func testStatusCodesMapToFriendlyMessages() {
        let rules = LifeGroupReportRules.shared
        XCTAssertTrue(rules.submitErrorMessage(statusCode: KotlinInt(value: 400), serverMessage: nil)
            .contains("Confira"))
        XCTAssertTrue(rules.submitErrorMessage(statusCode: KotlinInt(value: 403), serverMessage: nil)
            .contains("permissão"))
        XCTAssertTrue(rules.submitErrorMessage(statusCode: KotlinInt(value: 409), serverMessage: nil)
            .contains("Já existe"))
        XCTAssertTrue(rules.submitErrorMessage(statusCode: KotlinInt(value: 422), serverMessage: nil).contains("setor"))
    }
}
