package br.church.paz.android.ui.features.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.model.CepLookupOutcome
import br.church.paz.shared.domain.model.OnboardingStep
import br.church.paz.shared.domain.repository.OnboardingRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class OnboardingUiState(
    val currentStep: OnboardingStep = OnboardingStep.Video,
    val remainingSteps: List<OnboardingStep> = emptyList(),
    val isLoadingMissingSteps: Boolean = true,
    val isSubmitting: Boolean = false,
    val isLookingUpCep: Boolean = false,
    val cepResult: CepLookupOutcome? = null,
    val errorMessage: String? = null,
    /**
     * Set only when the initial [OnboardingRepository.missingSteps] fetch fails. Distinct from
     * [errorMessage] (per-step submission errors shown inline): this one blocks the whole flow
     * behind a retry state, so a network failure can never silently skip onboarding.
     */
    val loadErrorMessage: String? = null,
    val isFinished: Boolean = false,
)

/**
 * @param pendingBirthDateLogin When non-null, this onboarding session was launched to satisfy a
 * [br.church.paz.shared.domain.repository.BirthDateRequiredException] raised during sign-in
 * (the identity provider matched no existing member without a birth date). In that case there is
 * no authenticated session yet, so the Birthday step's submission must complete the pending
 * sign-in instead of calling [OnboardingRepository.submitBirthday] directly. Once that retry
 * succeeds, the real remaining steps are re-fetched from the now-authenticated repository.
 */
class OnboardingViewModel(
    private val repository: OnboardingRepository,
    private val pendingBirthDateLogin: (suspend (String) -> Result<Unit>)? = null,
) : ViewModel() {
    private val _uiState = MutableStateFlow(OnboardingUiState())
    val uiState: StateFlow<OnboardingUiState> = _uiState.asStateFlow()

    init {
        if (pendingBirthDateLogin != null) {
            // No session exists yet — Birthday is known to be missing, and the rest of the
            // missing steps (if any) are only knowable once the pending login completes.
            _uiState.update {
                it.copy(remainingSteps = listOf(OnboardingStep.Birthday), isLoadingMissingSteps = false)
            }
        } else {
            loadMissingSteps()
        }
    }

    /** Retries the initial missing-steps fetch after it failed with [OnboardingUiState.loadErrorMessage]. */
    fun retryLoad() = loadMissingSteps()

    private fun loadMissingSteps() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingMissingSteps = true, loadErrorMessage = null) }
            runCatching { repository.missingSteps() }
                .onSuccess { missing ->
                    _uiState.update {
                        it.copy(remainingSteps = missing, isLoadingMissingSteps = false)
                    }
                }.onFailure { e ->
                    _uiState.update {
                        it.copy(
                            isLoadingMissingSteps = false,
                            loadErrorMessage =
                                e.message ?: "Não foi possível carregar seu cadastro. Tente novamente.",
                        )
                    }
                }
        }
    }

    fun onVideoFinished() = advance()

    fun onSkipCurrentStep() = advance()

    fun onBirthdaySubmitted(birthDate: String) {
        val loginRetry = pendingBirthDateLogin
        if (loginRetry == null) {
            submit { repository.submitBirthday(birthDate) }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, errorMessage = null) }
            loginRetry(birthDate)
                .onSuccess {
                    // Now authenticated — the real remaining steps are only knowable here.
                    // A failure to re-fetch must not re-ask for the birthday we just saved,
                    // so fall back to "nothing else missing" rather than to an error.
                    val missing = runCatching { repository.missingSteps() }.getOrDefault(emptyList())
                    _uiState.update { it.copy(isSubmitting = false, remainingSteps = missing) }
                    advance()
                }.onFailure { e ->
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            errorMessage = e.message ?: "Não foi possível confirmar. Tente novamente.",
                        )
                    }
                }
        }
    }

    fun onWhatsappSubmitted(phone: String) = submit { repository.submitWhatsapp(phone) }

    fun onAddressSubmitted(
        street: String,
        number: String,
        complement: String?,
        neighborhood: String,
        city: String,
        state: String,
        zipCode: String,
    ) = submit {
        repository.submitAddress(street, number, complement, neighborhood, city, state, zipCode)
    }

    fun onLookupCep(cep: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLookingUpCep = true) }
            val result = repository.lookupCep(cep)
            _uiState.update { it.copy(cepResult = result, isLookingUpCep = false) }
        }
    }

    fun onDismissError() {
        _uiState.update { it.copy(errorMessage = null) }
    }

    private fun submit(action: suspend () -> Result<Unit>) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            action()
                .onSuccess {
                    _uiState.update { it.copy(isSubmitting = false, cepResult = null) }
                    advance()
                }.onFailure { e ->
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            errorMessage = e.message ?: "Não foi possível salvar. Tente novamente.",
                        )
                    }
                }
        }
    }

    private fun advance() {
        val remaining = _uiState.value.remainingSteps
        if (remaining.isEmpty()) {
            _uiState.update { it.copy(isFinished = true, errorMessage = null) }
            return
        }
        val next = remaining.first()
        _uiState.update {
            it.copy(
                currentStep = next,
                remainingSteps = remaining.drop(1),
                cepResult = null,
                errorMessage = null,
            )
        }
    }
}
