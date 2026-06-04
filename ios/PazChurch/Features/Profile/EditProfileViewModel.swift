import Observation
import Shared
import SwiftUI

@MainActor
@Observable
class EditProfileViewModel {
    var name = ""
    var isSaving = false
    var error: String?
    var saveSuccess = false

    private let userRepository: UserRepository
    private let authRepository: AuthRepository

    init(userRepository: UserRepository, authRepository: AuthRepository) {
        self.userRepository = userRepository
        self.authRepository = authRepository
        loadProfile()
    }

    private func loadProfile() {
        Task {
            do {
                let user = try await authRepository.currentUser() as? Shared.User
                self.name = user?.name ?? ""
            } catch {
                // Handle error
            }
        }
    }

    func onSave() {
        let trimmedName = name.trimmingCharacters(in: .whitespaces)
        if trimmedName.isEmpty {
            error = "Nome não pode ser vazio"
            return
        }

        isSaving = true
        error = nil

        Task {
            do {
                let request = UpdateProfileRequest(name: trimmedName, picture: nil)
                _ = try await userRepository.updateProfile(request: request)
                saveSuccess = true
                isSaving = false
            } catch {
                self.error = error.localizedDescription
                isSaving = false
            }
        }
    }
}
