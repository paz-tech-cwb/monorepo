import Observation
import Shared
import SwiftUI

@MainActor
@Observable
class AccountViewModel {
    var user: User?
    var isLoading = true
    // Display-only — name of the member's filial (church). `nil` while
    // loading or if it couldn't be resolved; the screen simply omits the
    // label in that case.
    var churchName: String?

    private let userRepository: UserRepository
    private let authRepository: AuthRepository
    private let churchRepository: ChurchRepository

    init(userRepository: UserRepository, authRepository: AuthRepository, churchRepository: ChurchRepository) {
        self.userRepository = userRepository
        self.authRepository = authRepository
        self.churchRepository = churchRepository
    }

    func reload() async {
        isLoading = true
        do {
            user = try await authRepository.currentUser() as? Shared.User
        } catch {
            user = nil
        }
        isLoading = false
        await loadChurchName()
    }

    // Resolves to the member's primary filial via the backend JWT — no
    // client-side church id plumbing needed. Best-effort; a failure here
    // shouldn't block the rest of the Account screen.
    private func loadChurchName() async {
        churchName = try? await churchRepository.getChurch().name
    }
}
