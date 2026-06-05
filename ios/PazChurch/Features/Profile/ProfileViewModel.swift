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
    }

    func loadUser() async {
        isLoading = true
        do {
            user = try await authRepository.currentUser() as? Shared.User
        } catch {
            user = nil
        }
        isLoading = false
    }

    func onEditProfile() {}

    func onLogout() {}
}
