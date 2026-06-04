import Observation
import Shared
import SwiftUI

@MainActor
@Observable
class AccountViewModel {
    var user: User?
    var isDarkMode = false
    var isLoading = true

    private let userRepository: UserRepository
    private let authRepository: AuthRepository

    init(userRepository: UserRepository, authRepository: AuthRepository) {
        self.userRepository = userRepository
        self.authRepository = authRepository
        loadUser()
    }

    private func loadUser() {
        Task {
            do {
                let user = try await authRepository.currentUser() as? Shared.User
                self.user = user
                self.isLoading = false
            } catch {
                self.isLoading = false
            }
        }
    }

    func onToggleDarkMode() {
        isDarkMode.toggle()
        // TODO: persist preference
    }

    func reload() {
        isLoading = true
        loadUser()
    }

    func onLogout() {
        // TODO: show confirmation, clear tokens, navigate to login
    }
}
