import SwiftUI
import Combine
import Shared

@MainActor
class AccountViewModel: ObservableObject {
    @Published var user: User?
    @Published var isDarkMode = false
    @Published var isLoading = true

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
                let user = try await authRepository.currentUser()
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

    func onLogout() {
        // TODO: show confirmation, clear tokens, navigate to login
    }
}
