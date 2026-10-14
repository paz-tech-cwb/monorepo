import Foundation
import Observation
import Shared

/// Where the entry points outside a group (Formulários list entry and `paz://form/life-group-reports`) get
/// the viewer's role and groups; a seam so the view model is unit-testable with fakes.
protocol LifeGroupMeetingEntrySource {
    func currentRole() async -> UserRole?
    func myGroups() async throws -> [LifeGroup]
    func allGroups() async throws -> [LifeGroup]
}

struct KotlinLifeGroupMeetingEntrySource: LifeGroupMeetingEntrySource {
    let churchRepository: ChurchRepository
    let authRepository: AuthRepository

    func currentRole() async -> UserRole? {
        try? await authRepository.currentUser()?.role
    }

    func myGroups() async throws -> [LifeGroup] {
        try await churchRepository.getMyLifeGroups()
    }

    func allGroups() async throws -> [LifeGroup] {
        try await churchRepository.getAllLifeGroups(search: nil)
    }
}

/// Entry of the Reunião flow from outside a group. Every rule lives in `LifeGroupMeetingRules.resolveEntry`:
/// one led group opens its Reuniões directly; several (or admin/pastor/supervisor) show a picker.
@MainActor
@Observable
final class LifeGroupMeetingEntryViewModel {
    var isLoading = true
    var error: String?
    var entry: LifeGroupMeetingEntry?

    private let source: LifeGroupMeetingEntrySource

    init(source: LifeGroupMeetingEntrySource) {
        self.source = source
    }

    /// The single group to open in place of the picker, nil when the viewer must choose (or has nothing).
    var directGroup: LifeGroupMeetingEntryGroup? {
        guard let entry, let id = entry.directGroupId else { return nil }
        return entry.group(id: id.int32Value)
    }

    var pickerGroups: [LifeGroupMeetingEntryGroup] {
        entry?.groups ?? []
    }

    /// Nothing to open: the explanatory message (nil while loading, on error or when there are groups).
    var emptyMessage: String? {
        entry?.emptyMessage
    }

    func load() async {
        isLoading = true
        error = nil
        do {
            let role = await source.currentRole()
            let mine = try await source.myGroups()
            let isAdminLike = role == .admin || role == .pastor
            let all = isAdminLike ? try await source.allGroups() : []
            entry = LifeGroupMeetingRules.shared.resolveEntry(role: role, myGroups: mine, allGroups: all)
        } catch {
            if Task.isCancelled { return }
            self.error = LifeGroupMeetingErrorMapping.historyMessage(error)
            entry = nil
        }
        isLoading = false
    }
}
