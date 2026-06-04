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
        print("[HomeVM] load() started")
        isLoading = true
        error = nil
        do {
            print("[HomeVM] calling getHomeContent()")
            let content = try await homeRepository.getHomeContent()
            let banners = content.banners.count
            let agenda = content.agenda.count
            print("[HomeVM] getHomeContent() succeeded — banners: \(banners), agenda: \(agenda)")
            homeContent = content
            print("[HomeVM] calling currentUser()")
            let user = try await authRepository.currentUser() as? Shared.User
            print("[HomeVM] currentUser() returned: \(user?.name ?? "nil")")
            userName = user?.name.split(separator: " ").first.map(String.init) ?? "Membro"
            isLoading = false
            print("[HomeVM] load() completed successfully")
        } catch {
            print("[HomeVM] load() caught error: \(error)")
            isLoading = false
            self.error = error.localizedDescription
        }
    }

    func onRetry() {
        Task { await load() }
    }
}
