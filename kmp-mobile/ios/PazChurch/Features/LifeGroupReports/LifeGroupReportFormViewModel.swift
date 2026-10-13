import Foundation
import Observation
import Shared

/// Seam over the two Kotlin repositories the weekly report form needs, so the view model is
/// unit-testable with a Swift fake (no Kotlin protocol conformance required).
protocol LifeGroupReportFormDataSource {
    /// `GET /life-groups/me` (each group carries `relationship`: leader | co_leader | supervisor | member).
    func myLifeGroups() async throws -> [LifeGroup]
    /// `GET /life-groups` (every group); only called for roles that see all groups (admin, pastor).
    func allLifeGroups() async throws -> [LifeGroup]
    /// Role of the signed-in user (drives the picker: admin/pastor see every group).
    func currentRole() async throws -> UserRole?
    /// `POST /forms/life-group-reports`.
    func submit(_ form: LifeGroupReportForm) async throws
}

struct KotlinLifeGroupReportFormDataSource: LifeGroupReportFormDataSource {
    let churchRepository: ChurchRepository
    let formsRepository: FormsRepository
    let authRepository: AuthRepository

    func myLifeGroups() async throws -> [LifeGroup] {
        try await churchRepository.getMyLifeGroups()
    }

    func allLifeGroups() async throws -> [LifeGroup] {
        try await churchRepository.getAllLifeGroups(search: nil)
    }

    func currentRole() async throws -> UserRole? {
        try await authRepository.currentUser()?.role
    }

    func submit(_ form: LifeGroupReportForm) async throws {
        _ = try await formsRepository.submitLifeGroupReport(form: form)
    }
}

/// Reads the HTTP status off a repository failure (Ktor `ClientRequestException` bridged from `:shared`).
private func reportFormHTTPStatus(_ error: Error) -> Int? {
    guard let kotlinException = (error as NSError).kotlinException as? KotlinThrowable else { return nil }
    return kotlinException.httpStatusCodeOrNull()?.intValue
}

/// Weekly life-group report submit form. Validation, normalisation and the wire payload live in
/// `:shared` (`LifeGroupReportDraft` / `LifeGroupReportRules`), so Android and iOS behave identically;
/// this class only holds the raw field strings and the load/submit state.
@MainActor
@Observable
class LifeGroupReportFormViewModel {
    var isLoading = true
    var loadError: String?
    /// Groups the viewer may report for: led/co-led ones, or every group for admin/pastor.
    var groups: [LifeGroup] = []
    /// Non-nil when the viewer cannot report for any group (e.g. supervisor only): the form is hidden.
    var noGroupsMessage: String?
    /// Church day (America/Sao_Paulo, ISO `yyyy-MM-dd`): default and upper bound of the date.
    var today = ""

    var lifeGroupId: Int32?
    var date = ""
    var committedMembers = ""
    var committedMembersPresent = ""
    var kids0To11 = ""
    var guests = ""
    var mdas = ""
    var offering = ""
    var committedAtTadel = ""
    var committedAtCulto = ""
    var leaderAttended = ""
    var disciplesCount = ""
    var disciplesDiscipledThisWeek = ""
    var pastoringActivityType = ""
    var pastoringActivityOther = ""
    var trainingActivityType = ""
    var trainingActivityOther = ""

    /// Set by the first submit attempt; from then on errors stay live while the user edits.
    var showsValidation = false
    var isSubmitting = false
    /// Friendly message of the last failed submit (400/403/404/409/422/network).
    var submitError: String?
    var isSubmitted = false

    private let dataSource: LifeGroupReportFormDataSource
    private let preselectedLifeGroupId: Int32?
    private let now: () -> Date

    init(
        dataSource: LifeGroupReportFormDataSource,
        preselectedLifeGroupId: Int32? = nil,
        now: @escaping () -> Date = { Date() }
    ) {
        self.dataSource = dataSource
        self.preselectedLifeGroupId = preselectedLifeGroupId
        self.now = now
    }

    var canChooseGroup: Bool {
        groups.count > 1 || (!groups.isEmpty && selectedGroup == nil)
    }

    var selectedGroup: LifeGroup? {
        groups.first { $0.id == lifeGroupId }
    }

    /// The raw form state as the shared draft.
    var draft: LifeGroupReportDraft {
        LifeGroupReportDraft(
            date: date,
            lifeGroupId: lifeGroupId.map { KotlinInt(value: $0) },
            committedMembers: committedMembers,
            committedMembersPresent: committedMembersPresent,
            kids0To11: kids0To11,
            guests: guests,
            mdas: mdas,
            offering: offering,
            committedAtTadel: committedAtTadel,
            committedAtCulto: committedAtCulto,
            leaderAttended: leaderAttended,
            disciplesCount: disciplesCount,
            disciplesDiscipledThisWeek: disciplesDiscipledThisWeek,
            pastoringActivityType: pastoringActivityType,
            pastoringActivityOther: pastoringActivityOther,
            trainingActivityType: trainingActivityType,
            trainingActivityOther: trainingActivityOther
        )
    }

    /// Validation to display: nil until the first submit attempt, live afterwards.
    var currentValidation: LifeGroupReportValidation? {
        showsValidation ? draft.validate(today: today) : nil
    }

    func load() async {
        isLoading = true
        loadError = nil
        do {
            let role = try await dataSource.currentRole()
            let mine = try await dataSource.myLifeGroups()
            var all: [LifeGroup] = []
            if LifeGroupReportRules.shared.seesAllGroups(role: role) {
                all = try await dataSource.allLifeGroups()
            }
            let resolved = LifeGroupReportRules.shared.resolveGroups(
                role: role,
                myGroups: mine,
                allGroups: all,
                preselectedId: preselectedLifeGroupId.map { KotlinInt(value: $0) }
            )
            groups = resolved.groups
            noGroupsMessage = resolved.emptyMessage
            today = LifeGroupReportRules.shared.todayInSaoPaulo(
                epochMillis: Int64(now().timeIntervalSince1970 * 1000)
            )
            date = today
            lifeGroupId = resolved.initialGroupId?.int32Value
        } catch is CancellationError {
            isLoading = false
            return
        } catch {
            if Task.isCancelled {
                isLoading = false
                return
            }
            loadError = error.localizedDescription
        }
        isLoading = false
    }

    func submit() async {
        guard !isSubmitting else { return }
        showsValidation = true
        submitError = nil
        guard let form = draft.toForm(today: today) else { return }
        isSubmitting = true
        do {
            try await dataSource.submit(form)
            isSubmitted = true
        } catch is CancellationError {
            // Keep the form as-is; the user can retry.
        } catch {
            if !Task.isCancelled {
                submitError = LifeGroupReportRules.shared.submitErrorMessage(
                    statusCode: reportFormHTTPStatus(error).map { KotlinInt(value: Int32($0)) },
                    serverMessage: error.localizedDescription
                )
            }
        }
        isSubmitting = false
    }

    /// ISO `yyyy-MM-dd` <-> `Date` in the device calendar (the picker works in local time; only the
    /// calendar day is read back, so no timezone shift is introduced).
    static func date(fromISO iso: String) -> Date? {
        isoFormatter.date(from: iso)
    }

    static func iso(from date: Date) -> String {
        isoFormatter.string(from: date)
    }

    private static let isoFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()
}
