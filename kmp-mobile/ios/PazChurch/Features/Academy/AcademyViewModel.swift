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
    var latestStudy: LifeGroupStudy?

    private let academyRepository: AcademyRepository
    private let lifeGroupStudyRepository: LifeGroupStudyRepository

    init(academyRepository: AcademyRepository, lifeGroupStudyRepository: LifeGroupStudyRepository) {
        self.academyRepository = academyRepository
        self.lifeGroupStudyRepository = lifeGroupStudyRepository
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

        // Estudo do Life requires life-group membership server-side (canView) — a plain
        // 403 here (visitor, or a member not yet in a life group) shouldn't surface as a
        // page-level error, so this failure is silently ignored.
        guard isAuthenticated else {
            latestStudy = nil
            return
        }
        latestStudy = try? await lifeGroupStudyRepository.getStudies(page: 1, limit: 1).items.first
    }

    func onRetry(isAuthenticated: Bool) {
        Task { await load(isAuthenticated: isAuthenticated) }
    }

    func onCourseTapped(_ course: Course) {
        // navigate to video player — handled by parent NavigationStack
    }
}
