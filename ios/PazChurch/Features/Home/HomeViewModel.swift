import Observation
import Shared
import SwiftUI

@MainActor
@Observable
class HomeViewModel {
    var homeContent: HomeContent?
    var userName = ""
    var isLoading = true
    var error: String?

    private let homeRepository: HomeRepository
    private let authRepository: AuthRepository

    init(homeRepository: HomeRepository, authRepository: AuthRepository) {
        self.homeRepository = homeRepository
        self.authRepository = authRepository
    }

    /// Called by the view's .task modifier — no Task wrapper needed.
    /// Being @MainActor, calling a nonisolated async function (KMP) automatically
    /// hops to a background thread and returns here when done.
    func load() async {
        isLoading = true
        error = nil
        do {
            let content = try await homeRepository.getHomeContent()
            let banners = content.banners.count
            let agenda = content.agenda.count
            homeContent = content
            let user = try await authRepository.currentUser()
            userName = user?.name.split(separator: " ").first.map(String.init) ?? ""
            isLoading = false
        } catch {
            print("[HomeVM] load() FAILED — \(type(of: error)): \(error)")
            isLoading = false
            self.error = error.localizedDescription
        }
    }

    func onRetry() {
        Task { await load() }
    }
}
