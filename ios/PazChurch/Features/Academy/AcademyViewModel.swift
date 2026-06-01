import SwiftUI
import Combine
import Shared

@MainActor
class AcademyViewModel: ObservableObject {
    @Published var academyContent: AcademyContent?
    @Published var selectedCategory: String?
    @Published var isLoading = true
    @Published var error: String?

    private let academyRepository: AcademyRepository

    init(academyRepository: AcademyRepository) {
        self.academyRepository = academyRepository
        loadAcademy()
    }

    private func loadAcademy() {
        Task {
            do {
                let content = try await academyRepository.getAcademyContent() as? AcademyContent
                self.academyContent = content
                self.isLoading = false
            } catch {
                self.isLoading = false
                self.error = error.localizedDescription
            }
        }
    }

    var categories: [String] {
        (academyContent?.videos ?? [])
            .compactMap { $0.category }
            .removingDuplicates()
    }

    var filteredVideos: [AcademyVideo] {
        let videos = academyContent?.videos ?? []
        if let selected = selectedCategory {
            return videos.filter { $0.category == selected }
        }
        return videos
    }

    func onRetry() {
        isLoading = true
        error = nil
        loadAcademy()
    }
}

extension Array where Element: Equatable {
    func removingDuplicates() -> [Element] {
        var result: [Element] = []
        for value in self {
            if !result.contains(value) {
                result.append(value)
            }
        }
        return result
    }
}
