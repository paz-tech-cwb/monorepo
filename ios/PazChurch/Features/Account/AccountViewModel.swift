import Observation
import Shared
import SwiftUI

@MainActor
@Observable
class AccountViewModel {
    var user: User?
    var isLoading = true

    private let userRepository: UserRepository
    private let authRepository: AuthRepository

    init(userRepository: UserRepository, authRepository: AuthRepository) {
        self.userRepository = userRepository
        self.authRepository = authRepository
    }

    func reload() async {
        isLoading = true
        do {
            user = try await authRepository.currentUser() as? Shared.User
        } catch {
            user = nil
        }
        isLoading = false
    }
}
