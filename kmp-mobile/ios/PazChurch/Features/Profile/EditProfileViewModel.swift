import FirebaseStorage
import Observation
import Shared
import SwiftUI

@MainActor
@Observable
class EditProfileViewModel {
    var name = ""
    var phone = ""
    var birthDate: Date?
    var pictureUrl: String?
    var isUploadingPicture = false

    var cep = ""
    var street = ""
    var number = ""
    var complement = ""
    var neighborhood = ""
    var city = ""
    var state = ""
    var isLookingUpCep = false

    var isLoading = true
    var isSaving = false
    var error: String?
    var saveSuccess = false

    private let userRepository: UserRepository
    private let authRepository: AuthRepository
    private let onboardingRepository: OnboardingRepository

    private let isoFormatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withFullDate]
        return f
    }()

    init(
        userRepository: UserRepository,
        authRepository: AuthRepository,
        onboardingRepository: OnboardingRepository
    ) {
        self.userRepository = userRepository
        self.authRepository = authRepository
        self.onboardingRepository = onboardingRepository
        loadProfile()
    }

    // Sources truth from GET /users/me, NOT the cached login-time user: the
    // social-login response only ever carries id/name/email/picture/role, so
    // phone/birth_date/address are always absent from it — reading from the
    // cache here would make freshly-saved fields look like they never saved.
    private func loadProfile() {
        Task {
            do {
                let user = try await userRepository.getProfile()
                self.name = user.name
                self.phone = user.phone ?? ""
                self.pictureUrl = user.picture
                if let birthStr = user.birthDate {
                    self.birthDate = isoFormatter.date(from: birthStr)
                }
                if let address = user.addressDetails {
                    self.cep = address.zipCode ?? ""
                    self.street = address.street ?? ""
                    self.number = address.number ?? ""
                    self.complement = address.complement ?? ""
                    self.neighborhood = address.neighborhood ?? ""
                    self.city = address.city ?? ""
                    self.state = address.state ?? ""
                }
                self.isLoading = false
            } catch {
                self.error = error.localizedDescription
                self.isLoading = false
            }
        }
    }

    func onCepChanged(_ newValue: String) {
        let digits = String(newValue.filter(\.isNumber).prefix(8))
        cep = digits
        if digits.count == 8 { lookupCep(digits) }
    }

    private func lookupCep(_ cep: String) {
        Task {
            isLookingUpCep = true
            let outcome = try? await onboardingRepository.lookupCep(cep: cep)
            if let found = outcome as? CepLookupOutcomeFound {
                street = found.result.street
                neighborhood = found.result.neighborhood
                city = found.result.city
                state = found.result.state
            }
            isLookingUpCep = false
        }
    }

    func onPictureSelected(data: Data) {
        Task {
            isUploadingPicture = true
            error = nil
            do {
                let storage = Storage.storage()
                let ref = storage.reference().child("profile-pictures/\(UUID().uuidString).jpg")
                _ = try await ref.putDataAsync(data)
                let url = try await ref.downloadURL()
                pictureUrl = url.absoluteString
                isUploadingPicture = false
            } catch {
                self.error = "Erro ao enviar foto: \(error.localizedDescription)"
                isUploadingPicture = false
            }
        }
    }

    func onSave() {
        let trimmedName = name.trimmingCharacters(in: .whitespaces)
        if trimmedName.isEmpty {
            error = "Nome não pode ser vazio"
            return
        }

        let hasAddress = !street.trimmingCharacters(in: .whitespaces).isEmpty || !cep.isEmpty
        if hasAddress, street.trimmingCharacters(in: .whitespaces).isEmpty
            || number.trimmingCharacters(in: .whitespaces).isEmpty
            || neighborhood.trimmingCharacters(in: .whitespaces).isEmpty
            || city.trimmingCharacters(in: .whitespaces).isEmpty
            || state.trimmingCharacters(in: .whitespaces).isEmpty {
            error = "Preencha todos os campos obrigatórios do endereço, ou deixe todos em branco"
            return
        }

        isSaving = true
        error = nil

        let rawPhone = phone.isEmpty ? nil : phone.filter(\.isNumber)
        let birthStr = birthDate.map { isoFormatter.string(from: $0) }
        let address: AddressRequest? = hasAddress
            ? AddressRequest(
                street: street.trimmingCharacters(in: .whitespaces),
                number: number.trimmingCharacters(in: .whitespaces),
                complement: complement.trimmingCharacters(in: .whitespaces).isEmpty
                    ? nil : complement.trimmingCharacters(in: .whitespaces),
                neighborhood: neighborhood.trimmingCharacters(in: .whitespaces),
                city: city.trimmingCharacters(in: .whitespaces),
                state: state.trimmingCharacters(in: .whitespaces),
                zipCode: cep,
                country: "Brasil"
            )
            : nil

        Task {
            do {
                let request = UpdateProfileRequest(
                    name: trimmedName,
                    picture: pictureUrl,
                    phone: rawPhone,
                    birthDate: birthStr,
                    address: address
                )
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
