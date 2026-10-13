import Foundation
import Observation
import Shared

/// The combined "Reunião" screen of one (life group, date): a presence section and a report section,
/// saved independently (presence first, report second). Unsaved edits are mirrored to a local draft keyed
/// by (user, group, date) and restored on the next open. Mirrors the Android view model; every rule
/// (dirty checks, draft building, validation, copy) comes from the shared `LifeGroupMeetingRules`.
@MainActor
@Observable
final class LifeGroupMeetingViewModel {
    let lifeGroupId: Int32
    let meetingDate: String

    var isLoading = true
    var loadError: String?
    /// The server said the date is not the group's weekday: the user must flip "Reunião extra" first.
    var needsExtraChoice = false
    var isExtra = false
    var meeting: LifeGroupMeeting?
    /// Presence toggles being edited (server entries plus any restored local draft).
    var entries: [LifeGroupAttendanceEntry] = []
    var reportDraft = LifeGroupMeetingReportDraft.empty
    var reportErrors: [LifeGroupMeetingReportField: String] = [:]
    var isSavingAttendance = false
    var isSavingReport = false
    var attendanceError: String?
    var attendanceNotice: String?
    var reportError: String?
    var reportNotice: String?
    var draftRestored = false

    private let service: LifeGroupMeetingService
    private let draftStore: LifeGroupMeetingDraftStoring
    private let currentUserId: () async -> String?
    private var userId: String?
    /// Last local-draft write; exposed so tests can await it.
    private(set) var persistTask: Task<Void, Never>?

    init(
        lifeGroupId: Int32,
        meetingDate: String,
        service: LifeGroupMeetingService,
        draftStore: LifeGroupMeetingDraftStoring,
        currentUserId: @escaping () async -> String?
    ) {
        self.lifeGroupId = lifeGroupId
        self.meetingDate = meetingDate
        self.service = service
        self.draftStore = draftStore
        self.currentUserId = currentUserId
    }

    // MARK: - Derived state

    /// Past the edit window for this user (admins bypass it server side through `canEdit`).
    var isReadOnly: Bool {
        meeting.map { !$0.canEdit } ?? false
    }

    var isAttendanceSaved: Bool {
        meeting?.isAttendanceSaved ?? false
    }

    var isReportSaved: Bool {
        meeting?.isReportSaved ?? false
    }

    var attendanceDirty: Bool {
        meeting.map { LifeGroupMeetingRules.shared.isAttendanceDirty(meeting: $0, entries: entries) } ?? false
    }

    var reportDirty: Bool {
        meeting.map { LifeGroupMeetingRules.shared.isReportDirty(meeting: $0, reportDraft: reportDraft) } ?? false
    }

    /// The "Reunião extra" switch: shown until the first save, then the type is fixed.
    var showExtraToggle: Bool {
        needsExtraChoice || (meeting?.attendance?.isDraft == true && isExtra && !isReadOnly)
    }

    var isExtraLocked: Bool {
        meeting?.attendance?.isDraft == false
    }

    var isBusy: Bool {
        isSavingAttendance || isSavingReport
    }

    var canSaveAttendance: Bool {
        meeting?.attendance != nil && !isReadOnly && !entries
            .isEmpty && !isBusy && (!isAttendanceSaved || attendanceDirty)
    }

    var reportBlockedReason: MeetingReportBlockedReason? {
        meeting?.reportBlockedReason
    }

    /// The report can be typed and saved: presence saved and not edited since, and the group can file reports.
    var canEditReport: Bool {
        meeting != nil && !isReadOnly && reportBlockedReason == nil && isAttendanceSaved && !attendanceDirty
    }

    /// A never-touched form must not be saveable (it would file an all-zero report): the first save needs an edit.
    var canSaveReport: Bool {
        canEditReport && !isBusy && reportDirty
    }

    /// Why the report cannot be edited right now (nil when it can, or when the screen is read-only).
    var reportLockedMessage: String? {
        guard meeting != nil, !isReadOnly else { return nil }
        if let blocked = reportBlockedReason {
            return LifeGroupMeetingRules.shared.reportBlockedMessage(reason: blocked)
        }
        if meeting?.attendance == nil, meeting?.report != nil {
            return LifeGroupMeetingRules.shared.legacyReportMessage()
        }
        if !isAttendanceSaved {
            return "Salve a presença para liberar o relatório."
        }
        if attendanceDirty {
            return "Salve as alterações da presença antes de enviar o relatório."
        }
        return nil
    }

    /// Live numbers shown read-only in the report; the server derives `committed_*` from the saved attendance.
    var committedMembers: Int {
        entries.count
    }

    var committedMembersPresent: Int {
        Int(LifeGroupMeetingRules.shared.presentCount(entries: entries))
    }

    var allPresent: Bool {
        LifeGroupMeetingRules.shared.allPresent(entries: entries)
    }

    var presenceSummary: String {
        LifeGroupMeetingRules.shared.presenceSummary(entries: entries)
    }

    // MARK: - Load

    func load() async {
        isLoading = true
        loadError = nil
        if userId == nil {
            userId = await currentUserId()
        }
        let draft = await readDraft()
        await fetch(extra: isExtra || draft?.extraMeeting == true, draft: draft)
    }

    private func readDraft() async -> LifeGroupMeetingDraft? {
        guard let userId else { return nil }
        return try? await draftStore.read(userId: userId, lifeGroupId: lifeGroupId, date: meetingDate)
    }

    private func fetch(extra: Bool, draft: LifeGroupMeetingDraft?) async {
        do {
            let loaded = try await service.getMeeting(
                lifeGroupId: lifeGroupId, date: meetingDate, extraMeeting: extra ? true : nil
            )
            applyLoaded(loaded, draft: draft, extra: extra)
        } catch {
            if Task.isCancelled {
                return
            }
            if extra, LifeGroupMeetingErrorMapping.isExtraFlagRejected(error) {
                // A stored draft (or earlier choice) says "extra", but the group's day changed: the server
                // now refuses the flag. Drop it and refetch instead of looping on the same 400 forever.
                await fetch(
                    extra: false,
                    draft: draft.map { $0.doCopy(attendance: $0.attendance, report: $0.report, extraMeeting: false) }
                )
                if meeting == nil {
                    await clearStoredDraft()
                } else {
                    persistDraft()
                }
                return
            }
            if LifeGroupMeetingErrorMapping.requiresExtraChoice(error) {
                isLoading = false
                loadError = nil
                needsExtraChoice = true
                isExtra = false
                meeting = nil
                entries = []
            } else {
                isLoading = false
                loadError = LifeGroupMeetingErrorMapping.message(error)
            }
        }
    }

    private func applyLoaded(_ loaded: LifeGroupMeeting, draft: LifeGroupMeetingDraft?, extra: Bool) {
        let serverEntries = loaded.attendance?.entries ?? []
        // A closed edit window is read-only: a stale local draft must not resurface as editable input.
        let usableDraft = loaded.canEdit ? draft : nil
        let baselineReport = loaded.report.map { LifeGroupMeetingReportDraft.companion.fromReport(report: $0) }
            ?? LifeGroupMeetingReportDraft.empty
        isLoading = false
        loadError = nil
        needsExtraChoice = false
        isExtra = loaded.attendance.map { $0.isDraft ? extra : $0.isExtra } ?? extra
        meeting = loaded
        entries = LifeGroupMeetingRules.shared.applyDraftEntries(entries: serverEntries, draft: usableDraft?.attendance)
        reportDraft = usableDraft?.report ?? baselineReport
        reportErrors = [:]
        attendanceError = nil
        reportError = nil
        draftRestored = usableDraft.map { $0.attendance != nil || $0.report != nil } ?? false
    }

    // MARK: - Extra meeting

    func setExtraMeeting(_ extra: Bool) async {
        guard !isExtraLocked, !isBusy, isExtra != extra else { return }
        isExtra = extra
        isLoading = true
        loadError = nil
        let stored = await readDraft()
        await fetch(
            extra: extra,
            draft: stored.map { $0.doCopy(attendance: $0.attendance, report: $0.report, extraMeeting: extra) }
        )
        if meeting == nil {
            await clearStoredDraft()
        } else {
            persistDraft()
        }
    }

    // MARK: - Presence

    func togglePresent(userId: Int32) {
        // Edits while a save is in flight would be overwritten by the response: ignore them.
        guard !isReadOnly, !isBusy else { return }
        entries = LifeGroupMeetingRules.shared.togglePresent(entries: entries, userId: userId)
        attendanceNotice = nil
        attendanceError = nil
        persistDraft()
    }

    /// "Todos presentes": on marks everyone present, off marks everyone absent.
    func setAllPresent(_ present: Bool) {
        guard !isReadOnly, !isBusy else { return }
        entries = LifeGroupMeetingRules.shared.setAllPresent(entries: entries, present: present)
        attendanceNotice = nil
        attendanceError = nil
        persistDraft()
    }

    func saveAttendance() async {
        guard let current = meeting, canSaveAttendance else { return }
        if let message = LifeGroupMeetingRules.shared.attendanceError(entries: entries) {
            attendanceError = message
            return
        }
        isSavingAttendance = true
        attendanceError = nil
        attendanceNotice = nil
        do {
            let saved = try await service.saveAttendance(
                lifeGroupId: lifeGroupId,
                date: meetingDate,
                entries: entries,
                extraMeeting: LifeGroupMeetingRules.shared.extraFlagForSave(
                    attendance: current.attendance,
                    extraSelected: isExtra
                )?.boolValue
            )
            isSavingAttendance = false
            meeting = saved
            if let savedEntries = saved.attendance?.entries {
                entries = savedEntries
            }
            if let savedExtra = saved.attendance?.isExtra {
                isExtra = savedExtra
            }
            attendanceNotice = "Presença salva."
            draftRestored = false
            persistDraft()
        } catch {
            isSavingAttendance = false
            if Task.isCancelled {
                return
            }
            attendanceError = LifeGroupMeetingErrorMapping.message(error)
            if LifeGroupMeetingErrorMapping.isEditWindowClosed(error) {
                await load()
            }
        }
    }

    // MARK: - Report

    func updateReport(_ field: LifeGroupMeetingReportFormField, to value: String) {
        guard canEditReport, !isBusy else { return }
        reportDraft = reportDraft.setting(field, to: value)
        reportErrors = [:]
        reportError = nil
        reportNotice = nil
        persistDraft()
    }

    func saveReport() async {
        guard canSaveReport else { return }
        let validation = reportDraft.validate()
        guard validation.isValid, let input = reportDraft.toInput() else {
            reportErrors = validation.errors
            reportError = validation.firstError
            reportNotice = nil
            return
        }
        isSavingReport = true
        reportError = nil
        reportErrors = [:]
        reportNotice = nil
        do {
            let saved = try await service.saveReport(lifeGroupId: lifeGroupId, date: meetingDate, report: input)
            isSavingReport = false
            meeting = saved
            if let report = saved
                .report {
                reportDraft = LifeGroupMeetingReportDraft.companion.fromReport(report: report)
            }
            reportNotice = "Relatório salvo."
            draftRestored = false
            persistDraft()
        } catch {
            isSavingReport = false
            if Task.isCancelled {
                return
            }
            reportError = LifeGroupMeetingErrorMapping.message(error)
            if LifeGroupMeetingErrorMapping.isEditWindowClosed(error) {
                await load()
            }
        }
    }

    func dismissDraftBanner() {
        draftRestored = false
    }

    // MARK: - Local draft

    private func clearStoredDraft() async {
        guard let userId else { return }
        try? await draftStore.clear(userId: userId, lifeGroupId: lifeGroupId, date: meetingDate)
    }

    /// Mirrors the unsaved edits to the local draft store (or removes the draft when nothing is unsaved).
    private func persistDraft() {
        guard let current = meeting, current.canEdit, let userId else { return }
        let draft = LifeGroupMeetingRules.shared.buildDraft(
            meeting: current, entries: entries, reportDraft: reportDraft, extraMeeting: isExtra
        )
        let store = draftStore
        let (group, date) = (lifeGroupId, meetingDate)
        let previous = persistTask
        previous?.cancel()
        persistTask = Task {
            // Best effort and ordered: a failed local write must never break the screen.
            _ = await previous?.value
            if let draft {
                try? await store.save(userId: userId, lifeGroupId: group, date: date, draft: draft)
            } else {
                try? await store.clear(userId: userId, lifeGroupId: group, date: date)
            }
        }
    }
}
