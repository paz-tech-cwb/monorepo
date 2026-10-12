import Observation
import Shared

let taskMinPresentMeetingsMax: Int32 = 52
let taskNoteMaxLength = 1000

/// Editable copy of one member's eligibility, diffed against `member` (last saved server state).
struct LifeGroupTaskMemberDraft: Identifiable {
    let member: LifeGroupTaskMember
    var eligible: Bool
    var note: String
    var excludedTemplateIds: Set<Int32>
    /// "Voltar ao automático": deletes the explicit decision on save.
    var resetToAutomatic = false

    var id: Int32 { member.userId }

    init(member: LifeGroupTaskMember) {
        self.member = member
        eligible = member.eligible
        note = member.note ?? ""
        excludedTemplateIds = Set(member.excludedTemplateIds.map { $0.int32Value })
    }

    var noteChanged: Bool { note != (member.note ?? "") }
    var exclusionsChanged: Bool { excludedTemplateIds != Set(member.excludedTemplateIds.map { $0.int32Value }) }
    var isDirty: Bool { resetToAutomatic || eligible != member.eligible || noteChanged || exclusionsChanged }

    /// Source badge text: manual / leader default / automatic / pending (with present count vs minimum).
    var sourceBadgeLabel: String {
        if resetToAutomatic { return "Voltará ao automático ao salvar" }
        switch member.eligibilitySource {
        case .manual: return "Manual"
        case .leader: return "Liderança"
        case .auto: return "Automático · \(member.presentCount) de \(member.minPresentMeetings) presenças"
        case .pending: return "Pendente · \(member.presentCount) de \(member.minPresentMeetings) presenças"
        default: return "Automático"
        }
    }

    var isManual: Bool { member.eligibilitySource == .manual }

    /// The backend requires `eligible` unless resetting, and keeps note/exclusions only on an
    /// explicit row, so any edit sends the draft's eligibility (pinning it as a manual decision).
    func toUpdate() -> LifeGroupTaskMemberUpdate {
        if resetToAutomatic {
            return LifeGroupTaskMemberUpdate(
                userId: member.userId, eligible: nil, note: nil, excludedTemplateIds: nil, resetToAutomatic: true
            )
        }
        return LifeGroupTaskMemberUpdate(
            userId: member.userId,
            eligible: KotlinBoolean(value: eligible),
            note: noteChanged ? note.trimmingCharacters(in: .whitespacesAndNewlines) : nil,
            excludedTemplateIds: exclusionsChanged
                ? excludedTemplateIds.sorted().map { KotlinInt(value: $0) }
                : nil,
            resetToAutomatic: false
        )
    }
}

@MainActor
@Observable
class LifeGroupTaskMembersViewModel {
    var drafts: [LifeGroupTaskMemberDraft] = []
    /// Only templates the group's leader has enabled; disabled ones can't be assigned anyway.
    var templates: [LifeGroupTaskTemplateSummary] = []
    var minPresentMeetings: Int32 = 3
    var savedMinPresentMeetings: Int32 = 3
    var isLoading = true
    var error: String?
    var isSaving = false
    var saveError: String?
    var savedMessage: String?

    private let lifeGroupId: Int32
    private let repository: LifeGroupTaskRepository

    init(lifeGroupId: Int32, repository: LifeGroupTaskRepository) {
        self.lifeGroupId = lifeGroupId
        self.repository = repository
    }

    var hasChanges: Bool {
        minPresentMeetings != savedMinPresentMeetings || drafts.contains(where: \.isDirty)
    }

    /// Initial load / retry shows the skeleton; pull-to-refresh keeps content and discards unsaved edits.
    func load(showSkeleton: Bool = true) async {
        if showSkeleton { isLoading = true }
        error = nil
        do {
            let members = try await repository.getTaskMembers(lifeGroupId: lifeGroupId)
            let settings = try await repository.getTaskSettings(lifeGroupId: lifeGroupId)
            // Templates only feed the optional per-member exclusions: a failure must not block the screen.
            let loadedTemplates = (try? await repository.getTaskTemplates(lifeGroupId: lifeGroupId)) ?? []
            drafts = members.map(LifeGroupTaskMemberDraft.init(member:))
            templates = loadedTemplates.filter(\.isEnabled)
            minPresentMeetings = settings.minPresentMeetings
            savedMinPresentMeetings = settings.minPresentMeetings
            saveError = nil
        } catch is CancellationError {
            // Pull-to-refresh cancelled; keep what is on screen.
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func setEligible(userId: Int32, _ eligible: Bool) {
        // A manual choice replaces any pending "voltar ao automático".
        updateDraft(userId) {
            $0.eligible = eligible
            $0.resetToAutomatic = false
        }
    }

    func setNote(userId: Int32, _ note: String) {
        updateDraft(userId) { $0.note = String(note.prefix(taskNoteMaxLength)) }
    }

    func toggleExclusion(userId: Int32, templateId: Int32) {
        updateDraft(userId) {
            if $0.excludedTemplateIds.contains(templateId) {
                $0.excludedTemplateIds.remove(templateId)
            } else {
                $0.excludedTemplateIds.insert(templateId)
            }
        }
    }

    func resetToAutomatic(userId: Int32) { updateDraft(userId) { $0.resetToAutomatic = true } }
    func undoResetToAutomatic(userId: Int32) { updateDraft(userId) { $0.resetToAutomatic = false } }

    func setMinPresentMeetings(_ value: Int32) {
        minPresentMeetings = min(max(value, 0), taskMinPresentMeetingsMax)
        savedMessage = nil
    }

    private func updateDraft(_ userId: Int32, _ transform: (inout LifeGroupTaskMemberDraft) -> Void) {
        guard let index = drafts.firstIndex(where: { $0.member.userId == userId }) else { return }
        transform(&drafts[index])
        savedMessage = nil
    }

    /// Settings first (they change which members count as automatically eligible), then only
    /// the dirty members; the response replaces the drafts.
    @discardableResult
    func save() async -> Bool {
        guard !isSaving, hasChanges else { return false }
        let updates = drafts.filter(\.isDirty).map { $0.toUpdate() }
        let settingsChanged = minPresentMeetings != savedMinPresentMeetings
        isSaving = true
        saveError = nil
        savedMessage = nil
        do {
            if settingsChanged {
                let saved = try await repository.updateTaskSettings(
                    lifeGroupId: lifeGroupId, minPresentMeetings: minPresentMeetings
                )
                savedMinPresentMeetings = saved.minPresentMeetings
            }
            let members: [LifeGroupTaskMember]
            if updates.isEmpty {
                members = try await repository.getTaskMembers(lifeGroupId: lifeGroupId)
            } else {
                members = try await repository.updateTaskMembers(lifeGroupId: lifeGroupId, updates: updates)
            }
            drafts = members.map(LifeGroupTaskMemberDraft.init(member:))
            minPresentMeetings = savedMinPresentMeetings
            savedMessage = "Alterações salvas"
            isSaving = false
            return true
        } catch {
            saveError = error.localizedDescription
            isSaving = false
            return false
        }
    }
}
