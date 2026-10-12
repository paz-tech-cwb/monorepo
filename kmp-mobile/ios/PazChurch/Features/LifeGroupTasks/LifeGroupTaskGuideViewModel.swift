import Observation
import Shared

@MainActor
@Observable
class LifeGroupTaskGuideViewModel {
    var task: LifeGroupTask?
    var isLoading = true
    var error: String?
    var isDeclining = false
    var declineError: String?
    var showDeclineConfirm = false
    /// Set after a successful decline: nil while still assigned, otherwise whether the
    /// backend re-rolled the task to someone else.
    var declinedReassigned: Bool?

    private let assignmentId: String
    private let repository: LifeGroupTaskRepository

    init(assignmentId: String, repository: LifeGroupTaskRepository) {
        self.assignmentId = assignmentId
        self.repository = repository
    }

    var isDeclined: Bool { declinedReassigned != nil }

    func load() async {
        // Keep the current content visible while pull-to-refresh re-fetches.
        if task == nil { isLoading = true }
        error = nil
        do {
            task = try await repository.getMyTask(assignmentId: assignmentId)
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func declineTapped() {
        declineError = nil
        showDeclineConfirm = true
    }

    func confirmDecline() async {
        guard !isDeclining else { return }
        isDeclining = true
        declineError = nil
        do {
            let result = try await repository.declineTask(assignmentId: assignmentId)
            declinedReassigned = result.reassigned
        } catch {
            declineError = error.localizedDescription
        }
        isDeclining = false
    }
}
