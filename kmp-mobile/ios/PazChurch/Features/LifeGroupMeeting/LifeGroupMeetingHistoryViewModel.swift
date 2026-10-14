import Foundation
import Observation
import Shared

/// The two tabs of the "Reuniões" screen: the meetings list and the group's stats ("Relatórios").
enum LifeGroupMeetingsTab: String, CaseIterable, Identifiable {
    case meetings, reports

    var id: String {
        rawValue
    }

    var label: String {
        switch self {
        case .meetings: "Reuniões"
        case .reports: "Relatórios"
        }
    }
}

/// What a history row shows: the presence chip only when a presence was saved ("Presença x/y"; a report-only
/// legacy row has none, so it shows only the report chip), the report chip only when the status is known.
struct LifeGroupMeetingRowChips: Equatable {
    var presenceText: String?
    var reportText: String?
    var reportDone: Bool

    init(_ meeting: LifeGroupMeetingSummary) {
        presenceText = meeting.hasAttendance
            ? "Presença \(meeting.presentCount?.intValue ?? 0)/\(meeting.membersCount?.intValue ?? 0)"
            : nil
        reportText = meeting.reportStatusKnown ? (meeting.hasReport ? "Relatório enviado" : "Relatório pendente") : nil
        reportDone = meeting.hasReport
    }
}

/// "Reuniões" of one life group: saved attendance records joined with the weekly reports by date
/// (existing endpoints, no dedicated history endpoint), plus the "Nova reunião" date rules.
@MainActor
@Observable
final class LifeGroupMeetingHistoryViewModel {
    var meetings: [LifeGroupMeetingSummary] = []
    var isLoading = true
    var isRefreshing = false
    var error: String?
    var selectedTab: LifeGroupMeetingsTab = .meetings

    let lifeGroupId: Int32
    /// The group's fixed weekday ("Quarta-feira"), nil for "Sem dia fixo".
    let meetingDay: String?
    /// Role-based (`LifeGroupMeetingRules.canWrite`) from the group detail; false = read-only history, no "Nova reunião".
    let canWrite: Bool
    private let source: LifeGroupMeetingHistorySource
    private let today: () -> String

    init(
        lifeGroupId: Int32,
        meetingDay: String?,
        canWrite: Bool = false,
        source: LifeGroupMeetingHistorySource,
        today: @escaping () -> String = { LifeGroupMeetingDates.todayInSaoPaulo() }
    ) {
        self.lifeGroupId = lifeGroupId
        self.meetingDay = meetingDay
        self.canWrite = canWrite
        self.source = source
        self.today = today
    }

    func load() async {
        await load(showSkeleton: true)
    }

    func refresh() async {
        await load(showSkeleton: meetings.isEmpty)
    }

    private func load(showSkeleton: Bool) async {
        isLoading = showSkeleton
        isRefreshing = !showSkeleton
        error = nil
        do {
            let attendance = try await source.attendanceHistory(lifeGroupId: lifeGroupId)
            // Best effort: without reports the report chip just hides ("status unknown").
            let reports = try? await source.reports(lifeGroupId: lifeGroupId)
            meetings = LifeGroupMeetingRules.shared.mergeHistory(attendance: attendance, reports: reports)
        } catch {
            if !Task.isCancelled {
                self.error = LifeGroupMeetingErrorMapping.historyMessage(error)
            }
        }
        isLoading = false
        isRefreshing = false
    }

    /// The date "Nova reunião" opens with: the latest regular meeting day, or today without a fixed day.
    var defaultNewMeetingDate: String {
        LifeGroupMeetingRules.shared.defaultNewMeetingDate(meetingDay: meetingDay, today: today())
    }

    /// Last selectable day of the date picker (the backend rejects future dates).
    var latestSelectableDate: String {
        today()
    }

    /// True when `date` is not the group's weekday, so the meeting must be saved as an "extra" one.
    func needsExtraMeeting(_ date: String) -> Bool {
        LifeGroupMeetingRules.shared.needsExtraMeeting(meetingDay: meetingDay, date: date)
    }

    /// "Nova reunião": a future or invalid date is ignored (the picker already blocks them).
    func validatedNewMeetingDate(_ date: String) -> String? {
        guard canWrite else { return nil }
        return LifeGroupMeetingRules.shared.isSelectableDate(date: date, today: today()) ? date : nil
    }
}
