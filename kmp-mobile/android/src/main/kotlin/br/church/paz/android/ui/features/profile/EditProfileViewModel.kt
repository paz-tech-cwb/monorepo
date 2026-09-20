package br.church.paz.android.ui.features.profile

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.model.AddressRequest
import br.church.paz.shared.domain.model.CepLookupOutcome
import br.church.paz.shared.domain.model.UpdateProfileRequest
import br.church.paz.shared.domain.repository.OnboardingRepository
import br.church.paz.shared.domain.repository.UserRepository
import com.google.firebase.storage.FirebaseStorage
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import java.util.UUID

class EditProfileViewModel(
    private val userRepository: UserRepository,
    private val onboardingRepository: OnboardingRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(EditProfileUiState(isLoading = true))
    val uiState: StateFlow<EditProfileUiState> = _uiState.asStateFlow()

    private val _effect = Channel<EditProfileEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        loadProfile()
    }

    // Sources truth from GET /users/me, NOT the cached login-time user: the
    // social-login response only ever carries id/name/email/picture/role, so
    // phone/birth_date/address are always absent from it — reading from the
    // cache here would make freshly-saved fields look like they never saved.
    private fun loadProfile() {
        viewModelScope.launch {
            runCatching { userRepository.getProfile() }
                .onSuccess { user ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            name = user.name,
                            phone = user.phone.orEmpty(),
                            birthDate = user.birthDate,
                            pictureUrl = user.picture,
                            street = user.addressDetails?.street.orEmpty(),
                            number = user.addressDetails?.number.orEmpty(),
                            complement = user.addressDetails?.complement.orEmpty(),
                            neighborhood = user.addressDetails?.neighborhood.orEmpty(),
                            city = user.addressDetails?.city.orEmpty(),
                            state = user.addressDetails?.state.orEmpty(),
                            zipCode = user.addressDetails?.zipCode.orEmpty(),
                        )
                    }
                }.onFailure { e ->
                    _uiState.update { it.copy(isLoading = false, error = e.message ?: "Erro ao carregar perfil") }
                }
        }
    }

    fun onNameChanged(v: String) = _uiState.update { it.copy(name = v, error = null) }

    fun onPhoneChanged(raw: String) = _uiState.update { it.copy(phone = formatPhoneDigits(raw.filter(Char::isDigit)), error = null) }

    fun onBirthDateChanged(isoDate: String) = _uiState.update { it.copy(birthDate = isoDate) }

    fun onStreetChanged(v: String) = _uiState.update { it.copy(street = v) }

    fun onNumberChanged(v: String) = _uiState.update { it.copy(number = v) }

    fun onComplementChanged(v: String) = _uiState.update { it.copy(complement = v) }

    fun onNeighborhoodChanged(v: String) = _uiState.update { it.copy(neighborhood = v) }

    fun onCityChanged(v: String) = _uiState.update { it.copy(city = v) }

    fun onStateChanged(v: String) = _uiState.update { it.copy(state = v) }

    fun onZipCodeChanged(v: String) {
        val digits = v.filter(Char::isDigit).take(8)
        _uiState.update { it.copy(zipCode = digits) }
        if (digits.length == 8) lookupCep(digits)
    }

    private fun lookupCep(cep: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLookingUpCep = true) }
            when (val outcome = onboardingRepository.lookupCep(cep)) {
                is CepLookupOutcome.Found ->
                    _uiState.update {
                        it.copy(
                            isLookingUpCep = false,
                            street = outcome.result.street,
                            neighborhood = outcome.result.neighborhood,
                            city = outcome.result.city,
                            state = outcome.result.state,
                        )
                    }
                else -> _uiState.update { it.copy(isLookingUpCep = false) }
            }
        }
    }

    fun onPictureSelected(
        context: Context,
        uri: Uri,
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isUploadingPicture = true, error = null) }
            runCatching {
                val ref = FirebaseStorage.getInstance().reference.child("profile-pictures/${UUID.randomUUID()}.jpg")
                ref.putFile(uri).await()
                ref.downloadUrl.await().toString()
            }.onSuccess { url ->
                _uiState.update { it.copy(isUploadingPicture = false, pictureUrl = url) }
            }.onFailure { e ->
                _uiState.update { it.copy(isUploadingPicture = false, error = e.message ?: "Erro ao enviar foto") }
            }
        }
    }

    fun onSave() {
        val state = _uiState.value
        val name = state.name.trim()
        if (name.isEmpty()) {
            _uiState.update { it.copy(error = "Nome não pode ser vazio") }
            return
        }

        val hasAddress = state.street.isNotBlank() || state.zipCode.isNotBlank()
        if (hasAddress &&
            (
                state.street.isBlank() ||
                    state.number.isBlank() ||
                    state.neighborhood.isBlank() ||
                    state.city.isBlank() ||
                    state.state.isBlank()
            )
        ) {
            _uiState.update { it.copy(error = "Preencha todos os campos obrigatórios do endereço, ou deixe todos em branco") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, error = null) }
            val request =
                UpdateProfileRequest(
                    name = name,
                    picture = state.pictureUrl,
                    phone = state.phone.filter(Char::isDigit).ifBlank { null },
                    birthDate = state.birthDate,
                    address =
                        if (hasAddress) {
                            AddressRequest(
                                street = state.street.trim(),
                                number = state.number.trim(),
                                complement = state.complement.trim().ifBlank { null },
                                neighborhood = state.neighborhood.trim(),
                                city = state.city.trim(),
                                state = state.state.trim(),
                                zipCode = state.zipCode,
                                country = "Brasil",
                            )
                        } else {
                            null
                        },
                )
            runCatching { userRepository.updateProfile(request) }
                .onSuccess {
                    _uiState.update { it.copy(isSaving = false, saveSuccess = true) }
                    _effect.send(EditProfileEffect.SaveSuccess)
                }.onFailure { e ->
                    _uiState.update {
                        it.copy(isSaving = false, error = e.message ?: "Erro ao salvar perfil")
                    }
                }
        }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(EditProfileEffect.NavigateBack) }
    }
}

private fun formatPhoneDigits(digits: String): String {
    val d = digits.take(11)
    val sb = StringBuilder()
    d.forEachIndexed { i, c ->
        when (i) {
            0 -> sb.append('(').append(c)
            1 -> sb.append(c).append(") ")
            2 -> sb.append(c).append(' ')
            6 -> sb.append(c).append('-')
            else -> sb.append(c)
        }
    }
    return sb.toString()
}
