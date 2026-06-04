import SwiftUI
import Observation
import Shared

@MainActor
@Observable
class AcademyViewModel {
    var tracks: [CourseTrack] = []
    var isLoading = true
    var error: String?

    private let academyRepository: AcademyRepository

    init(academyRepository: AcademyRepository) {
        self.academyRepository = academyRepository
        loadAcademy()
    }

    private func loadAcademy() {
        Task {
            do {
                let content = try await academyRepository.getAcademyContent()
                self.tracks = content.tracks
                self.isLoading = false
            } catch {
                self.isLoading = false
                self.error = error.localizedDescription
            }
        }
    }

    func onRetry() {
        isLoading = true
        error = nil
        loadAcademy()
    }

    func onCourseTapped(_ course: Course) {
        // TODO: navigate to video player
    }
}
