import SwiftUI
import Combine
import Shared

@MainActor
class HomeViewModel: ObservableObject {
    @Published var homeContent: HomeContent?
    @Published var userName = ""
    @Published var isLoading = true
    @Published var error: String?

    private let homeRepository: HomeRepository
    private let authRepository: AuthRepository

    init(homeRepository: HomeRepository, authRepository: AuthRepository) {
        self.homeRepository = homeRepository
        self.authRepository = authRepository
        loadHome()
    }

    private func loadHome() {
        Task {
            do {
                let content = try await homeRepository.getHomeContent() as? HomeContent
                self.homeContent = content

                let user = try await authRepository.currentUser() as? Shared.User
                self.userName = user?.name.split(separator: " ").first.map(String.init) ?? "Membro"

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
        loadHome()
    }
}
