package br.church.paz.shared.domain.model

/**
 * A step the member-onboarding flow may still need to collect, in the order
 * it should be presented. `Video` is intentionally first even though
 * [br.church.paz.shared.domain.repository.OnboardingRepository.missingSteps]
 * never reports it — it's shown unconditionally on first login and isn't
 * backed by a persisted field the way the others are.
 */
enum class OnboardingStep {
    Video,
    Birthday,
    Whatsapp,
    Address,
}

/** A successful ViaCEP lookup, mapped down to the fields the address form needs. */
data class CepLookupResult(
    val street: String,
    val neighborhood: String,
    val city: String,
    val state: String,
)

sealed interface CepLookupOutcome {
    data class Found(val result: CepLookupResult) : CepLookupOutcome
    data object NotFound : CepLookupOutcome
    data class Error(val message: String) : CepLookupOutcome
}
