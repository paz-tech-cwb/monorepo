import Observation
import Shared
import SwiftUI

@MainActor
@Observable
class CertificatesViewModel {
    var isLoading = true
    var certificates: [CourseCertificateEntry] = []
    var error: String?

    private let courseRepository: CourseRepository

    init(courseRepository: CourseRepository) {
        self.courseRepository = courseRepository
    }

    func load() async {
        isLoading = true
        error = nil
        do {
            certificates = try await courseRepository.listCertificates()
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}
