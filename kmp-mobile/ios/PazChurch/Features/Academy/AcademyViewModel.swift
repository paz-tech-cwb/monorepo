import Observation
import Shared
import SwiftUI

@MainActor
@Observable
class AcademyViewModel {
    var tracks: [CourseTrack] = []
    var isLoading = true
    var error: String?
    var resumeCourse: Course?

    private let academyRepository: AcademyRepository

    init(academyRepository: AcademyRepository) {
        self.academyRepository = academyRepository
    }

    func load(isAuthenticated: Bool) async {
        isLoading = true
        error = nil
        do {
            let content = try await academyRepository.getAcademyContent()
            tracks = content.tracks
            // resumeCourse populated from last-watched logic when backend supports it
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func onRetry(isAuthenticated: Bool) {
        Task { await load(isAuthenticated: isAuthenticated) }
    }

    func onCourseTapped(_ course: Course) {
        // navigate to video player — handled by parent NavigationStack
    }
}
