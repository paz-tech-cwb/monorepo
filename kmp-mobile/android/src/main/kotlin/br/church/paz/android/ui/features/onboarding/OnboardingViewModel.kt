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
    val isFinished: Boolean = false,
)

class OnboardingViewModel(
    private val repository: OnboardingRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(OnboardingUiState())
    val uiState: StateFlow<OnboardingUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            val missing = repository.missingSteps()
            _uiState.update { it.copy(remainingSteps = missing, isLoadingMissingSteps = false) }
        }
    }

    fun onVideoFinished() = advance()

    fun onSkipCurrentStep() = advance()

    fun onBirthdaySubmitted(birthDate: String) = submit { repository.submitBirthday(birthDate) }

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
            _uiState.update { it.copy(isFinished = true) }
            return
        }
        val next = remaining.first()
        _uiState.update {
            it.copy(
                currentStep = next,
                remainingSteps = remaining.drop(1),
                cepResult = null,
            )
        }
    }
}
