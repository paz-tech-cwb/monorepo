import Foundation
import Observation
import Shared

/// Drives the post-sign-in member-onboarding flow: an unskippable welcome video followed by
/// up to three skippable profile-completion steps (birthday, WhatsApp, address), each backed
/// by the shared `OnboardingRepository`.
///
/// `pendingBirthDateLogin`, when non-nil, means this session was launched to satisfy a
/// `BirthDateRequiredException` raised during sign-in (see `AuthenticationCoordinator`) — the
/// identity provider matched no existing member without a birth date, so there is no
/// authenticated session yet. In that case the Birthday step's submission must retry the
/// deferred sign-in (via this closure) instead of calling `submitBirthday` directly; once that
/// retry succeeds, the real remaining steps are fetched from the now-authenticated repository.
@MainActor
@Observable
final class OnboardingCoordinator {
    enum Step: Equatable {
        case video
        case birthday
        case whatsapp
        case address
        case finished
    }

    private(set) var currentStep: Step = .video
    private(set) var isLoadingMissingSteps = true
    private(set) var isSubmitting = false
    private(set) var isLookingUpCep = false
    private(set) var cepResult: CepLookupOutcome?
    private(set) var errorMessage: String?
    /// Set only when the initial `missingSteps()` fetch (in `start()`) fails, e.g. due to a
    /// network error. Distinct from `errorMessage`, which reports per-step submission errors
    /// surfaced inline on the step forms; this one blocks the whole flow behind a full-screen
    /// retry state so a network failure can never silently skip onboarding.
    private(set) var loadErrorMessage: String?

    private var remainingSteps: [OnboardingStep] = []
    private let repository: OnboardingRepository
    private let pendingBirthDateLogin: ((String) async -> Result<Void, Error>)?

    init(
        repository: OnboardingRepository,
        pendingBirthDateLogin: ((String) async -> Result<Void, Error>)? = nil
    ) {
        self.repository = repository
        self.pendingBirthDateLogin = pendingBirthDateLogin
    }

    func start() async {
        currentStep = .video
        loadErrorMessage = nil
        if pendingBirthDateLogin != nil {
            // No session exists yet — Birthday is known to be missing, and the rest of the
            // missing steps (if any) are only knowable once the pending login completes.
            remainingSteps = [.birthday]
            isLoadingMissingSteps = false
            return
        }
        isLoadingMissingSteps = true
        do {
            remainingSteps = try await repository.missingSteps()
            isLoadingMissingSteps = false
        } catch {
            // Do NOT fall through to `.finished` on failure — that would silently skip
            // onboarding for a member who still has missing steps, just because of a
            // transient network error. Surface an explicit, retryable error state instead.
            isLoadingMissingSteps = false
            loadErrorMessage = error.localizedDescription
        }
    }

    /// Retries the initial missing-steps fetch after `start()` failed with `loadErrorMessage` set.
    func retryStart() async {
        await start()
    }

    func onVideoFinished() {
        advance()
    }

    func onSkipCurrentStep() {
        cepResult = nil
        errorMessage = nil
        advance()
    }

    func onBirthdaySubmitted(_ birthDate: String) async {
        guard let pendingBirthDateLogin else {
            await submit { try await IosAppContainer.shared.submitOnboardingBirthday(birthDate: birthDate) }
            return
        }
        isSubmitting = true
        errorMessage = nil
        let result = await pendingBirthDateLogin(birthDate)
        switch result {
        case .success:
            do {
                remainingSteps = try await repository.missingSteps()
            } catch {
                remainingSteps = []
            }
            isSubmitting = false
            advance()
        case let .failure(error):
            isSubmitting = false
            errorMessage = error.localizedDescription
        }
    }

    func onWhatsappSubmitted(_ phone: String) async {
        await submit { try await IosAppContainer.shared.submitOnboardingWhatsapp(phone: phone) }
    }

    func onAddressSubmitted(
        street: String,
        number: String,
        complement: String?,
        neighborhood: String,
        city: String,
        state: String,
        zipCode: String
    ) async {
        await submit {
            try await IosAppContainer.shared.submitOnboardingAddress(
                street: street,
                number: number,
                complement: complement,
                neighborhood: neighborhood,
                city: city,
                state: state,
                zipCode: zipCode
            )
        }
    }

    func onLookupCep(_ cep: String) async {
        isLookingUpCep = true
        cepResult = try? await repository.lookupCep(cep: cep)
        isLookingUpCep = false
    }

    func onDismissError() {
        errorMessage = nil
    }

    private func submit(_ action: @escaping () async throws -> Void) async {
        isSubmitting = true
        errorMessage = nil
        do {
            try await action()
            isSubmitting = false
            cepResult = nil
            advance()
        } catch {
            isSubmitting = false
            errorMessage = error.localizedDescription
        }
    }

    private func advance() {
        guard loadErrorMessage == nil else {
            // The initial missing-steps fetch failed; stay put (the view surfaces the retry
            // state for `.video`) instead of silently treating onboarding as finished.
            return
        }
        guard !remainingSteps.isEmpty else {
            currentStep = .finished
            return
        }
        let next = remainingSteps.removeFirst()
        // `OnboardingStep` bridges from Kotlin as a plain class (not a native Swift enum), so
        // it doesn't support `switch`-with-`case` pattern matching — compare with `==` instead
        // (mirrors the existing `currentUser?.role == UserRole.admin` pattern in this codebase).
        if next == OnboardingStep.birthday {
            currentStep = .birthday
        } else if next == OnboardingStep.whatsapp {
            currentStep = .whatsapp
        } else if next == OnboardingStep.address {
            currentStep = .address
        } else {
            currentStep = .finished
        }
    }
}
