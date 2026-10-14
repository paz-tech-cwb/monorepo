import Foundation
import Shared

// Thin Swift seams over the shared KMP repositories/stores so the view models can be unit-tested with
// fakes (Kotlin suspend interfaces are awkward to implement from Swift). All business rules live in
// `LifeGroupMeetingRules`/`LifeGroupMeetingErrors` (shared), never here.

/// `GET/PUT /api/life-groups/:id/meetings/:date`.
protocol LifeGroupMeetingService {
    func getMeeting(lifeGroupId: Int32, date: String, extraMeeting: Bool?) async throws -> LifeGroupMeeting
    func saveAttendance(
        lifeGroupId: Int32, date: String, entries: [LifeGroupAttendanceEntry], extraMeeting: Bool?
    ) async throws -> LifeGroupMeeting
    func saveReport(lifeGroupId: Int32, date: String, report: LifeGroupMeetingReportInput) async throws
        -> LifeGroupMeeting
}

/// Local, per (user, group, date) store of unsaved edits.
protocol LifeGroupMeetingDraftStoring {
    func read(userId: String, lifeGroupId: Int32, date: String) async throws -> LifeGroupMeetingDraft?
    func save(userId: String, lifeGroupId: Int32, date: String, draft: LifeGroupMeetingDraft) async throws
    func clear(userId: String, lifeGroupId: Int32, date: String) async throws
}

/// Existing history endpoints (attendance records + weekly reports) joined by date.
protocol LifeGroupMeetingHistorySource {
    func attendanceHistory(lifeGroupId: Int32) async throws -> [LifeGroupAttendance]
    func reports(lifeGroupId: Int32) async throws -> [LifeGroupWeeklyReport]
}

struct KotlinLifeGroupMeetingService: LifeGroupMeetingService {
    let repository: LifeGroupMeetingRepository

    func getMeeting(lifeGroupId: Int32, date: String, extraMeeting: Bool?) async throws -> LifeGroupMeeting {
        try await repository.getMeeting(
            lifeGroupId: lifeGroupId, date: date, extraMeeting: extraMeeting.map { KotlinBoolean(bool: $0) }
        )
    }

    func saveAttendance(
        lifeGroupId: Int32, date: String, entries: [LifeGroupAttendanceEntry], extraMeeting: Bool?
    ) async throws -> LifeGroupMeeting {
        try await repository.saveAttendance(
            lifeGroupId: lifeGroupId, date: date, entries: entries,
            extraMeeting: extraMeeting.map { KotlinBoolean(bool: $0) }
        )
    }

    func saveReport(
        lifeGroupId: Int32,
        date: String,
        report: LifeGroupMeetingReportInput
    ) async throws -> LifeGroupMeeting {
        try await repository.saveReport(lifeGroupId: lifeGroupId, date: date, report: report)
    }
}

struct KotlinLifeGroupMeetingDraftStore: LifeGroupMeetingDraftStoring {
    let store: MeetingDraftStore

    func read(userId: String, lifeGroupId: Int32, date: String) async throws -> LifeGroupMeetingDraft? {
        try await store.read(userId: userId, lifeGroupId: lifeGroupId, date: date)
    }

    func save(userId: String, lifeGroupId: Int32, date: String, draft: LifeGroupMeetingDraft) async throws {
        try await store.save(userId: userId, lifeGroupId: lifeGroupId, date: date, draft: draft)
    }

    func clear(userId: String, lifeGroupId: Int32, date: String) async throws {
        try await store.clear(userId: userId, lifeGroupId: lifeGroupId, date: date)
    }
}

struct KotlinLifeGroupMeetingHistorySource: LifeGroupMeetingHistorySource {
    let attendanceRepository: LifeGroupAttendanceRepository
    let reportRepository: LifeGroupReportRepository

    func attendanceHistory(lifeGroupId: Int32) async throws -> [LifeGroupAttendance] {
        try await attendanceRepository.getHistory(lifeGroupId: lifeGroupId)
    }

    func reports(lifeGroupId: Int32) async throws -> [LifeGroupWeeklyReport] {
        try await reportRepository.getReports(lifeGroupId: lifeGroupId)
    }
}

/// Bridges Swift errors to the shared pt-BR copy (`LifeGroupMeetingErrors`).
enum LifeGroupMeetingErrorMapping {
    /// The Kotlin exception behind a bridged `NSError`; any other failure (offline, decoding...) becomes a
    /// plain exception, which the shared mapper reports as a connectivity problem.
    static func throwable(_ error: Error) -> KotlinThrowable {
        if let kotlin = (error as NSError).kotlinException as? KotlinThrowable {
            return kotlin
        }
        return KotlinException(message: error.localizedDescription)
    }

    static func kind(_ error: Error) -> LifeGroupMeetingErrors.Kind {
        LifeGroupMeetingErrors.shared.kind(error: throwable(error))
    }

    static func message(_ error: Error) -> String {
        LifeGroupMeetingErrors.shared.message(error: throwable(error))
    }

    /// Retrying cannot help for a missing group or a missing permission; everything else may recover
    /// (server redeployed, network back).
    static func isRetryable(_ error: Error) -> Bool {
        LifeGroupMeetingErrors.shared.isRetryable(error: throwable(error))
    }

    /// Copy for a failed history/list request (attendance and reports endpoints have no meetings-API
    /// error body): the HTTP status decides, no status means offline.
    static func historyMessage(_ error: Error) -> String {
        let t = throwable(error)
        return historyMessage(statusCode: t.anyHttpStatusCodeOrNull()?.intValue, code: t.httpErrorCodeOrNull())
    }

    static func historyMessage(statusCode: Int?, code: String? = nil) -> String {
        LifeGroupMeetingErrors.shared.messageForHttpStatus(statusCode: statusCode.map { KotlinInt(value: Int32($0)) }, code: code)
    }

    static func requiresExtraChoice(_ error: Error) -> Bool {
        LifeGroupMeetingErrors.shared.requiresExtraChoice(error: throwable(error))
    }

    static func isExtraFlagRejected(_ error: Error) -> Bool {
        LifeGroupMeetingErrors.shared.isExtraFlagRejected(error: throwable(error))
    }

    static func isEditWindowClosed(_ error: Error) -> Bool {
        LifeGroupMeetingErrors.shared.isEditWindowClosed(error: throwable(error))
    }
}

/// The 13 free-form report fields, so the form can edit the (immutable) Kotlin draft generically.
enum LifeGroupMeetingReportFormField: CaseIterable {
    case kids0To11, guests, mdas, offering, committedAtTadel, committedAtCulto, leaderAttended
    case disciplesCount, disciplesDiscipledThisWeek
    case pastoringActivityType, pastoringActivityOther, trainingActivityType, trainingActivityOther

    var validationField: LifeGroupMeetingReportField {
        switch self {
        case .kids0To11: .kids0To11
        case .guests: .guests
        case .mdas: .mdas
        case .offering: .offering
        case .committedAtTadel: .committedAtTadel
        case .committedAtCulto: .committedAtCulto
        case .leaderAttended: .leaderAttended
        case .disciplesCount: .disciplesCount
        case .disciplesDiscipledThisWeek: .disciplesDiscipledThisWeek
        case .pastoringActivityType: .pastoringActivityType
        case .pastoringActivityOther: .pastoringActivityOther
        case .trainingActivityType: .trainingActivityType
        case .trainingActivityOther: .trainingActivityOther
        }
    }
}

extension LifeGroupMeetingReportDraft {
    static var empty: LifeGroupMeetingReportDraft {
        LifeGroupMeetingReportDraft(
            kids0To11: "", guests: "", mdas: "", offering: "", committedAtTadel: "", committedAtCulto: "",
            leaderAttended: "", disciplesCount: "", disciplesDiscipledThisWeek: "", pastoringActivityType: "",
            pastoringActivityOther: "", trainingActivityType: "", trainingActivityOther: ""
        )
    }

    func value(of field: LifeGroupMeetingReportFormField) -> String {
        switch field {
        case .kids0To11: kids0To11
        case .guests: guests
        case .mdas: mdas
        case .offering: offering
        case .committedAtTadel: committedAtTadel
        case .committedAtCulto: committedAtCulto
        case .leaderAttended: leaderAttended
        case .disciplesCount: disciplesCount
        case .disciplesDiscipledThisWeek: disciplesDiscipledThisWeek
        case .pastoringActivityType: pastoringActivityType
        case .pastoringActivityOther: pastoringActivityOther
        case .trainingActivityType: trainingActivityType
        case .trainingActivityOther: trainingActivityOther
        }
    }

    /// A copy with one field replaced.
    func setting(_ field: LifeGroupMeetingReportFormField, to value: String) -> LifeGroupMeetingReportDraft {
        func pick(_ f: LifeGroupMeetingReportFormField, _ current: String) -> String {
            field == f ? value : current
        }
        return doCopy(
            kids0To11: pick(.kids0To11, kids0To11),
            guests: pick(.guests, guests),
            mdas: pick(.mdas, mdas),
            offering: pick(.offering, offering),
            committedAtTadel: pick(.committedAtTadel, committedAtTadel),
            committedAtCulto: pick(.committedAtCulto, committedAtCulto),
            leaderAttended: pick(.leaderAttended, leaderAttended),
            disciplesCount: pick(.disciplesCount, disciplesCount),
            disciplesDiscipledThisWeek: pick(.disciplesDiscipledThisWeek, disciplesDiscipledThisWeek),
            pastoringActivityType: pick(.pastoringActivityType, pastoringActivityType),
            pastoringActivityOther: pick(.pastoringActivityOther, pastoringActivityOther),
            trainingActivityType: pick(.trainingActivityType, trainingActivityType),
            trainingActivityOther: pick(.trainingActivityOther, trainingActivityOther)
        )
    }
}

/// ISO `yyyy-MM-dd` <-> `Date` for the "Nova reunião" picker (calendar days, never times).
enum LifeGroupMeetingDates {
    private static var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.locale = Locale(identifier: "en_US_POSIX")
        return calendar
    }

    /// Noon of that calendar day in the device calendar (noon avoids DST edge cases).
    static func date(fromISO iso: String) -> Date? {
        guard DeepLinkDestination.isSafeDate(iso) else { return nil }
        let parts = iso.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        let components = DateComponents(year: parts[0], month: parts[1], day: parts[2], hour: 12)
        return calendar.date(from: components)
    }

    static func iso(from date: Date) -> String {
        let c = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }

    /// Today's day in the church timezone (America/Sao_Paulo), the same day the backend uses.
    static func todayInSaoPaulo(now: Date = Date()) -> String {
        LifeGroupMeetingRules.shared.todayInSaoPaulo(epochMillis: Int64(now.timeIntervalSince1970 * 1000))
    }
}
