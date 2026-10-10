import FirebaseAuth
import FirebaseStorage
import Observation
import Shared
import SwiftUI
import UIKit

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
    var cepError: String?

    var isLoading = true
    var isSaving = false
    var error: String?
    var saveSuccess = false
    /// Set when there is no live Firebase Auth session to upload with and no silent
    /// recovery is possible — the view observes this and forces a full logout via
    /// `AuthenticationCoordinator`, since there is no other path back to a valid session.
    var sessionExpired = false

    /// Baseline snapshot captured right after `loadProfile()` completes — compared against
    /// current field values to drive the discard-changes confirmation on back navigation.
    private var original: ProfileSnapshot?
    /// The last 8-digit CEP a lookup was actually run for — guards against re-fetching on
    /// every keystroke or when the user re-enters the same CEP they already looked up.
    private var lastLookedUpCep: String?

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

    /// True once any field diverges from the baseline captured right after load —
    /// drives the discard-changes confirmation on back navigation.
    var isDirty: Bool {
        guard let original else { return false }
        return currentSnapshot() != original
    }

    private func currentSnapshot() -> ProfileSnapshot {
        ProfileSnapshot(
            name: name.trimmingCharacters(in: .whitespaces),
            phone: phone.filter(\.isNumber),
            birthDate: birthDate.map { isoFormatter.string(from: $0) },
            pictureUrl: pictureUrl,
            cep: cep.filter(\.isNumber),
            street: street.trimmingCharacters(in: .whitespaces),
            number: number.trimmingCharacters(in: .whitespaces),
            complement: complement.trimmingCharacters(in: .whitespaces),
            neighborhood: neighborhood.trimmingCharacters(in: .whitespaces),
            city: city.trimmingCharacters(in: .whitespaces),
            state: state.trimmingCharacters(in: .whitespaces)
        )
    }

    /// Sources truth from GET /users/me, NOT the cached login-time user: the
    /// social-login response only ever carries id/name/email/picture/role, so
    /// phone/birth_date/address are always absent from it — reading from the
    /// cache here would make freshly-saved fields look like they never saved.
    private func loadProfile() {
        Task {
            do {
                let user = try await userRepository.getProfile()
                self.name = user.name
                self.phone = formatPhoneDigits(user.phone?.filter(\.isNumber) ?? "")
                self.pictureUrl = user.picture
                if let birthStr = user.birthDate {
                    self.birthDate = isoFormatter.date(from: birthStr)
                }
                if let address = user.addressDetails {
                    self.cep = formatCepDigits(address.zipCode?.filter(\.isNumber) ?? "")
                    self.street = address.street ?? ""
                    self.number = address.number ?? ""
                    self.complement = address.complement ?? ""
                    self.neighborhood = address.neighborhood ?? ""
                    self.city = address.city ?? ""
                    self.state = address.state ?? ""
                }
                if cep.filter(\.isNumber).count == 8 { lastLookedUpCep = cep.filter(\.isNumber) }
                self.isLoading = false
                self.original = currentSnapshot()
            } catch {
                self.error = error.localizedDescription
                self.isLoading = false
            }
        }
    }

    func onCepChanged(_ newValue: String) {
        cep = applyCepMask(old: cep, new: newValue)
        cepError = nil
        let digits = cep.filter(\.isNumber)
        guard digits.count == 8 else { return }
        guard digits != lastLookedUpCep else { return }

        // Clear stale address fields first — otherwise a failed/slow lookup for the new
        // CEP leaves the PREVIOUS CEP's address visible, which reads as "didn't update".
        street = ""
        neighborhood = ""
        city = ""
        state = ""
        number = ""
        complement = ""

        lookupCep(digits)
    }

    private func lookupCep(_ cep: String) {
        Task {
            isLookingUpCep = true
            let outcome = try? await onboardingRepository.lookupCep(cep: cep)
            switch outcome {
            case let found as CepLookupOutcomeFound:
                street = found.result.street
                neighborhood = found.result.neighborhood
                city = found.result.city
                state = found.result.state
                // Only record the lookup as "done" on success — on failure, leave it
                // unset so re-entering the same 8 digits retries instead of being
                // silently deduped against a CEP that never actually resolved.
                lastLookedUpCep = cep
            case is CepLookupOutcomeNotFound:
                cepError = "CEP não encontrado"
            default:
                cepError = "Não foi possível buscar o CEP"
            }
            isLookingUpCep = false
        }
    }

    func onPictureSelected(data: Data) {
        Task {
            isUploadingPicture = true
            error = nil
            do {
                guard let uid = try await ensureFirebaseSession() else {
                    error = "Sessão expirada. Você será desconectado — entre novamente para continuar"
                    isUploadingPicture = false
                    sessionExpired = true
                    return
                }

                let jpegData = reencodeToJPEG(data, maxDimension: 1920) ?? data
                let storage = Storage.storage()
                let ref = storage.reference().child("media/profile-pictures/\(uid)/\(UUID().uuidString).jpg")
                let metadata = StorageMetadata()
                metadata.contentType = "image/jpeg"
                _ = try await ref.putDataAsync(jpegData, metadata: metadata)
                let url = try await ref.downloadURL()
                pictureUrl = url.absoluteString
                isUploadingPicture = false
            } catch {
                self.error = Self.message(for: error)
                isUploadingPicture = false
            }
        }
    }

    /// Checks for a live Firebase Auth session before uploading — this is a check only,
    /// NOT a re-auth attempt. Returns the Firebase UID to scope the upload path to, or
    /// `nil` if there is no current Firebase user (the exact app-JWT-valid-but-Firebase-
    /// local-auth-state-gone scenario). There is no silent recovery available here beyond
    /// what `AuthenticationCoordinator` already attempts at launch, so callers must treat
    /// `nil` as unrecoverable and force the user through a full logout/re-login.
    private func ensureFirebaseSession() async throws -> String? {
        Auth.auth().currentUser?.uid
    }

    private static func message(for error: Error) -> String {
        let nsError = error as NSError
        guard nsError.domain == StorageErrorDomain,
              let code = StorageErrorCode(rawValue: nsError.code) else {
            return "Erro ao enviar foto: \(error.localizedDescription)"
        }
        switch code {
        case .unauthorized, .unauthenticated:
            return "Sessão expirada — entre novamente para enviar a foto"
        case .retryLimitExceeded, .cancelled:
            return "Envio da foto cancelado. Tente novamente"
        case .quotaExceeded:
            return "Não foi possível enviar a foto agora. Tente novamente mais tarde"
        default:
            return "Não foi possível enviar a foto. Verifique sua conexão e tente novamente"
        }
    }

    func onSave() {
        let trimmedName = name.trimmingCharacters(in: .whitespaces)
        if trimmedName.isEmpty {
            error = "Nome não pode ser vazio"
            return
        }

        let cepDigits = cep.filter(\.isNumber)
        let hasAddress = !street.trimmingCharacters(in: .whitespaces).isEmpty || !cepDigits.isEmpty
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
                // Backend column is varchar(8) — strip the display mask before sending,
                // since the masked `#####-###` value would silently truncate/corrupt it.
                zipCode: cepDigits,
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
                let updatedUser = try await userRepository.updateProfile(request: request)
                // PUT /me's response is the only up-to-date source for the user's picture URL
                // (and everything else just saved) — without refreshing the cached session
                // user here, every screen that reads AuthRepository.currentUser() (Account,
                // Home, etc.) keeps showing the login-time snapshot, including the OLD picture,
                // until the next full sign-in.
                try? await authRepository.updateCachedUser(user: updatedUser)
                saveSuccess = true
                isSaving = false
            } catch {
                self.error = error.localizedDescription
                isSaving = false
            }
        }
    }
}

/// Immutable snapshot of every user-editable field, normalized (trimmed, digits-only for
/// phone/CEP) so mask formatting differences never register as a dirty change.
private struct ProfileSnapshot: Equatable {
    let name: String
    let phone: String
    let birthDate: String?
    let pictureUrl: String?
    let cep: String
    let street: String
    let number: String
    let complement: String
    let neighborhood: String
    let city: String
    let state: String
}

// MARK: - Masks

private func formatPhoneDigits(_ digits: String) -> String {
    var result = ""
    let d = Array(digits.prefix(11))
    for (i, c) in d.enumerated() {
        switch i {
        case 0: result += "(\(c)"
        case 1: result += "\(c)) "
        case 2: result += "\(c) "
        case 6: result += "\(c)-"
        default: result += "\(c)"
        }
    }
    return result
}

/// `#####-###` mask, delete-aware — mirrors `applyPhoneMask` in `FormFieldRow.swift`.
private func applyCepMask(old: String, new: String) -> String {
    var digits = new.filter(\.isNumber)
    let oldDigits = old.filter(\.isNumber)
    if new.count < old.count, digits.count == oldDigits.count, !digits.isEmpty {
        digits = String(digits.dropLast())
    }
    return formatCepDigits(String(digits.prefix(8)))
}

private func formatCepDigits(_ digits: String) -> String {
    let d = Array(digits.prefix(8))
    guard d.count > 5 else { return String(d) }
    return "\(String(d.prefix(5)))-\(String(d.suffix(d.count - 5)))"
}

// MARK: - Image downscaling

/// Downscales and re-encodes arbitrary image data (HEIC/PNG/etc, as handed back by
/// PhotosPicker) to JPEG with longest side capped at `maxDimension` — mirrors the
/// `maxWidthOrHeight: 1920` compression admin-ui applies before upload.
private func reencodeToJPEG(_ data: Data, maxDimension: CGFloat) -> Data? {
    guard let image = UIImage(data: data) else { return nil }
    let size = image.size
    let longestSide = max(size.width, size.height)
    let scale = longestSide > maxDimension ? maxDimension / longestSide : 1
    let targetSize = CGSize(width: size.width * scale, height: size.height * scale)

    // Default renderer scale is the main screen's scale factor (often 2x/3x), which would
    // render the bitmap at up to 3x `targetSize` in pixels — force scale 1 so the output is
    // exactly `targetSize` pixels, matching the `maxDimension` cap.
    let format = UIGraphicsImageRendererFormat.default()
    format.scale = 1
    let renderer = UIGraphicsImageRenderer(size: targetSize, format: format)
    let resized = renderer.image { _ in
        image.draw(in: CGRect(origin: .zero, size: targetSize))
    }
    return resized.jpegData(compressionQuality: 0.85)
}
