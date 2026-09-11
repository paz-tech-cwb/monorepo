import Observation
import Shared

@MainActor
@Observable
class LifeGroupAttendanceHistoryViewModel {
    var records: [LifeGroupAttendance] = []
    var isLoading = true
    var error: String?

    private let lifeGroupId: Int32
    private let repository: LifeGroupAttendanceRepository

    init(lifeGroupId: Int32, repository: LifeGroupAttendanceRepository) {
        self.lifeGroupId = lifeGroupId
        self.repository = repository
    }

    func load() async {
        isLoading = true
        error = nil
        do {
            records = try await repository.getHistory(lifeGroupId: lifeGroupId)
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

@MainActor
@Observable
class LifeGroupAttendanceEditorViewModel {
    var entries: [LifeGroupAttendanceEntry] = []
    var isLoading = true
    var isSaving = false
    var error: String?
    var saveError: String?

    let meetingDate: String
    private let lifeGroupId: Int32
    private let repository: LifeGroupAttendanceRepository

    init(lifeGroupId: Int32, meetingDate: String, repository: LifeGroupAttendanceRepository) {
        self.lifeGroupId = lifeGroupId
        self.meetingDate = meetingDate
        self.repository = repository
    }

    func load() async {
        isLoading = true
        error = nil
        do {
            let attendance = try await repository.getByDate(lifeGroupId: lifeGroupId, date: meetingDate)
            entries = attendance.entries
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func togglePresent(userId: Int32) {
        entries = entries.map { entry in
            entry.userId == userId
                ? LifeGroupAttendanceEntry(userId: entry.userId, name: entry.name, present: !entry.present)
                : entry
        }
    }

    @discardableResult
    func save() async -> Bool {
        guard !isSaving else { return false }
        isSaving = true
        saveError = nil
        do {
            _ = try await repository.save(lifeGroupId: lifeGroupId, date: meetingDate, entries: entries)
            isSaving = false
            return true
        } catch {
            saveError = error.localizedDescription
            isSaving = false
            return false
        }
    }
}
