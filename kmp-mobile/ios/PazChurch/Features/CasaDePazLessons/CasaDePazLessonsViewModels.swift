import Observation
import Shared
import SwiftUI

@MainActor
@Observable
final class CasaDePazLessonsListViewModel {
    var lessons: [CasaDePazLesson] = []
    var isLoading = true
    var error: String?

    private let repository: CasaDePazLessonRepository

    init(repository: CasaDePazLessonRepository) {
        self.repository = repository
    }

    func load() async {
        isLoading = true
        error = nil
        do {
            let result = try await repository.getLessons()
            lessons = ((result as? [CasaDePazLesson]) ?? []).sorted { $0.week < $1.week }
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

@MainActor
@Observable
final class CasaDePazLessonDetailViewModel {
    var lesson: CasaDePazLesson?
    var isLoading = true
    var error: String?

    private let week: Int32
    private let repository: CasaDePazLessonRepository

    init(week: Int32, repository: CasaDePazLessonRepository) {
        self.week = week
        self.repository = repository
    }

    func load() async {
        isLoading = true
        error = nil
        do {
            let result = try await repository.getLessons()
            let lessons = (result as? [CasaDePazLesson]) ?? []
            lesson = lessons.first { $0.week == week }
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}
