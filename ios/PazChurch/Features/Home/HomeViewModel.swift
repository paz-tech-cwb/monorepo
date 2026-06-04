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
    }

    // Called by the view's .task modifier — no Task wrapper needed.
    // Being @MainActor, calling a nonisolated async function (KMP) automatically
    // hops to a background thread and returns here when done.
    func load() async {
        isLoading = true
        error = nil
        do {
            let content = try await homeRepository.getHomeContent()
            homeContent = content
            let user = try await authRepository.currentUser() as? Shared.User
            userName = user?.name.split(separator: " ").first.map(String.init) ?? "Membro"
            isLoading = false
        } catch {
            isLoading = false
            self.error = error.localizedDescription
        }
    }

    func onRetry() {
        Task { await load() }
    }
}
