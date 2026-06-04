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
        // KMP suspend functions must be called from a detached task so the
        // Kotlin coroutine can resume without competing for the MainActor.
        let repo = homeRepository
        let auth = authRepository
        Task.detached(priority: .userInitiated) { [weak self] in
            do {
                let content = try await repo.getHomeContent()
                let user    = try await auth.currentUser() as? Shared.User
                await MainActor.run {
                    self?.homeContent = content
                    self?.userName = user?.name.split(separator: " ").first.map(String.init) ?? "Membro"
                    self?.isLoading = false
                }
            } catch {
                await MainActor.run {
                    self?.isLoading = false
                    self?.error = error.localizedDescription
                }
            }
        }
    }

    func onRetry() {
        isLoading = true
        error = nil
        loadHome()
    }
}
