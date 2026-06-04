import Observation
import Shared
import SwiftUI

@MainActor
@Observable
class ProfileViewModel {
    var user: User?
    var isLoading = true

    private let authRepository: AuthRepository

    init(authRepository: AuthRepository) {
        self.authRepository = authRepository
        loadProfile()
    }

    private func loadProfile() {
        Task {
            do {
                let user = try await authRepository.currentUser() as? Shared.User
                self.user = user
                self.isLoading = false

                if user == nil {
                    // Navigate to login
                }
            } catch {
                self.isLoading = false
            }
        }
    }

    func onEditProfile() {
        // Navigate to EditProfile
    }

    func onLogout() {
        // Show logout confirmation
    }
}
