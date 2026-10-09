package br.church.paz.android.ui.features.profile

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.model.AddressRequest
import br.church.paz.shared.domain.model.CepLookupOutcome
import br.church.paz.shared.domain.model.UpdateProfileRequest
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.domain.repository.OnboardingRepository
import br.church.paz.shared.domain.repository.UserRepository
import br.church.paz.shared.push.getFcmToken
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.storage.FirebaseStorage
import com.google.firebase.storage.StorageException
import com.google.firebase.storage.StorageMetadata
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import java.io.ByteArrayOutputStream
import java.util.UUID

class EditProfileViewModel(
    private val userRepository: UserRepository,
    private val onboardingRepository: OnboardingRepository,
    private val authRepository: AuthRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(EditProfileUiState(isLoading = true))
    val uiState: StateFlow<EditProfileUiState> = _uiState.asStateFlow()

    private val _effect = Channel<EditProfileEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    /** Baseline snapshot captured right after [loadProfile] completes, used to derive `isDirty`. */
    private var original: ProfileSnapshot? = null

    /** Last 8-digit CEP a lookup actually ran for — avoids refetching on every keystroke or
     * re-entry of the same CEP. */
    private var lastLookedUpCep: String? = null

    init {
        loadProfile()
    }

    private fun snapshot(state: EditProfileUiState) =
        ProfileSnapshot(
            name = state.name.trim(),
            phone = state.phone.filter(Char::isDigit),
            birthDate = state.birthDate,
            pictureUrl = state.pictureUrl,
            zipCode = state.zipCode.filter(Char::isDigit),
            street = state.street.trim(),
            number = state.number.trim(),
            complement = state.complement.trim(),
            neighborhood = state.neighborhood.trim(),
            city = state.city.trim(),
            state = state.state.trim(),
        )

    private fun refreshDirty() {
        val baseline = original ?: return
        _uiState.update { it.copy(isDirty = snapshot(it) != baseline) }
    }

    // Sources truth from GET /users/me, NOT the cached login-time user: the
    // social-login response only ever carries id/name/email/picture/role, so
    // phone/birth_date/address are always absent from it — reading from the
    // cache here would make freshly-saved fields look like they never saved.
    private fun loadProfile() {
        viewModelScope.launch {
            runCatching { userRepository.getProfile() }
                .onSuccess { user ->
                    val zipDigits =
                        user.addressDetails
                            ?.zipCode
                            .orEmpty()
                            .filter(Char::isDigit)
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            name = user.name,
                            phone = formatPhoneDigits(user.phone.orEmpty().filter(Char::isDigit)),
                            birthDate = user.birthDate,
                            pictureUrl = user.picture,
                            street = user.addressDetails?.street.orEmpty(),
                            number = user.addressDetails?.number.orEmpty(),
                            complement = user.addressDetails?.complement.orEmpty(),
                            neighborhood = user.addressDetails?.neighborhood.orEmpty(),
                            city = user.addressDetails?.city.orEmpty(),
                            state = user.addressDetails?.state.orEmpty(),
                            zipCode = formatCepDigits(zipDigits),
                        )
                    }
                    if (zipDigits.length == 8) lastLookedUpCep = zipDigits
                    original = snapshot(_uiState.value)
                }.onFailure { e ->
                    _uiState.update { it.copy(isLoading = false, error = e.message ?: "Erro ao carregar perfil") }
                }
        }
    }

    fun onNameChanged(v: String) {
        _uiState.update { it.copy(name = v, error = null) }
        refreshDirty()
    }

    fun onPhoneChanged(raw: String) {
        _uiState.update { it.copy(phone = formatPhoneDigits(raw.filter(Char::isDigit)), error = null) }
        refreshDirty()
    }

    fun onBirthDateChanged(isoDate: String) {
        _uiState.update { it.copy(birthDate = isoDate) }
        refreshDirty()
    }

    fun onStreetChanged(v: String) {
        _uiState.update { it.copy(street = v) }
        refreshDirty()
    }

    fun onNumberChanged(v: String) {
        _uiState.update { it.copy(number = v) }
        refreshDirty()
    }

    fun onComplementChanged(v: String) {
        _uiState.update { it.copy(complement = v) }
        refreshDirty()
    }

    fun onNeighborhoodChanged(v: String) {
        _uiState.update { it.copy(neighborhood = v) }
        refreshDirty()
    }

    fun onCityChanged(v: String) {
        _uiState.update { it.copy(city = v) }
        refreshDirty()
    }

    fun onStateChanged(v: String) {
        _uiState.update { it.copy(state = v) }
        refreshDirty()
    }

    fun onZipCodeChanged(raw: String) {
        val oldDigits = _uiState.value.zipCode.filter(Char::isDigit)
        var digits = raw.filter(Char::isDigit)
        if (raw.length < _uiState.value.zipCode.length && digits.length == oldDigits.length && digits.isNotEmpty()) {
            digits = digits.dropLast(1)
        }
        digits = digits.take(8)
        _uiState.update { it.copy(zipCode = formatCepDigits(digits), cepError = null) }
        refreshDirty()

        if (digits.length != 8 || digits == lastLookedUpCep) return

        // Clear stale address fields first — otherwise a failed/slow lookup for the new CEP
        // leaves the PREVIOUS CEP's address visible, which reads as "didn't update".
        _uiState.update {
            it.copy(street = "", neighborhood = "", city = "", state = "", number = "", complement = "")
        }
        lookupCep(digits)
    }

    private fun lookupCep(cep: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLookingUpCep = true) }
            when (val outcome = onboardingRepository.lookupCep(cep)) {
                is CepLookupOutcome.Found -> {
                    // Only record the lookup as "done" on success — on failure, leave it
                    // unset so re-entering the same 8 digits retries instead of being
                    // silently deduped against a CEP that never actually resolved.
                    lastLookedUpCep = cep
                    _uiState.update {
                        it.copy(
                            isLookingUpCep = false,
                            street = outcome.result.street,
                            neighborhood = outcome.result.neighborhood,
                            city = outcome.result.city,
                            state = outcome.result.state,
                        )
                    }
                }
                is CepLookupOutcome.NotFound ->
                    _uiState.update { it.copy(isLookingUpCep = false, cepError = "CEP não encontrado") }
                else ->
                    _uiState.update { it.copy(isLookingUpCep = false, cepError = "Não foi possível buscar o CEP") }
            }
            refreshDirty()
        }
    }

    fun onPictureSelected(
        context: Context,
        uri: Uri,
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isUploadingPicture = true, error = null) }
            // No live Firebase session to upload with, and no silent recovery available
            // here — surface as an explicit effect rather than smuggling the message
            // through an exception's `.message` and relying on `messageFor`'s fallback
            // branch to display it.
            val firebaseUid = FirebaseAuth.getInstance().currentUser?.uid
            if (firebaseUid == null) {
                _uiState.update { it.copy(isUploadingPicture = false) }
                runCatching {
                    val fcmToken = getFcmToken()
                    authRepository.logout(fcmToken = fcmToken)
                }
                _effect.send(EditProfileEffect.SessionExpired)
                return@launch
            }
            runCatching {
                val jpegBytes = reencodeToJpeg(context, uri, maxDimension = 1920)
                val ref =
                    FirebaseStorage
                        .getInstance()
                        .reference
                        .child("media/profile-pictures/$firebaseUid/${UUID.randomUUID()}.jpg")
                val metadata = StorageMetadata.Builder().setContentType("image/jpeg").build()
                ref.putBytes(jpegBytes, metadata).await()
                ref.downloadUrl.await().toString()
            }.onSuccess { url ->
                _uiState.update { it.copy(isUploadingPicture = false, pictureUrl = url) }
                refreshDirty()
            }.onFailure { e ->
                _uiState.update { it.copy(isUploadingPicture = false, error = messageFor(e)) }
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

        val zipDigits = state.zipCode.filter(Char::isDigit)
        val hasAddress = state.street.isNotBlank() || zipDigits.isNotBlank()
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
                                // Backend column is varchar(8) — strip the display mask before
                                // sending, since the masked `#####-###` value would silently
                                // truncate/corrupt it.
                                zipCode = zipDigits,
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

    /** Routes both the header back button and the system back gesture through the same
     * discard check — the screen shows a confirmation dialog when dirty, else navigates
     * back immediately. */
    fun onRequestDiscard() {
        if (_uiState.value.isDirty) {
            viewModelScope.launch { _effect.send(EditProfileEffect.RequestDiscardConfirmation) }
        } else {
            onBack()
        }
    }

    private fun messageFor(e: Throwable): String {
        val code = (e as? StorageException)?.errorCode
        return when (code) {
            StorageException.ERROR_NOT_AUTHENTICATED, StorageException.ERROR_NOT_AUTHORIZED ->
                "Sessão expirada — entre novamente para enviar a foto"
            StorageException.ERROR_RETRY_LIMIT_EXCEEDED, StorageException.ERROR_CANCELED ->
                "Envio da foto cancelado. Tente novamente"
            StorageException.ERROR_QUOTA_EXCEEDED ->
                "Não foi possível enviar a foto agora. Tente novamente mais tarde"
            else -> e.message ?: "Não foi possível enviar a foto. Verifique sua conexão e tente novamente"
        }
    }
}

/** Immutable snapshot of every user-editable field, normalized (trimmed, digits-only for
 * phone/CEP) so mask formatting differences never register as a dirty change. */
private data class ProfileSnapshot(
    val name: String,
    val phone: String,
    val birthDate: String?,
    val pictureUrl: String?,
    val zipCode: String,
    val street: String,
    val number: String,
    val complement: String,
    val neighborhood: String,
    val city: String,
    val state: String,
)

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

/** `#####-###` mask — mirrors [formatPhoneDigits]'s delete-aware approach via the caller
 * in [EditProfileViewModel.onZipCodeChanged]. */
private fun formatCepDigits(digits: String): String {
    val d = digits.take(8)
    return if (d.length > 5) "${d.take(5)}-${d.substring(5)}" else d
}

/** Downscales and re-encodes an arbitrary picked image (the Android photo picker can hand
 * back large/non-JPEG files) to JPEG with longest side capped at [maxDimension] — mirrors the
 * `maxWidthOrHeight: 1920` compression admin-ui applies before upload. */
private fun reencodeToJpeg(
    context: Context,
    uri: Uri,
    maxDimension: Int,
): ByteArray {
    val decoded = decodeBoundedBitmap(context, uri, maxDimension)

    val longestSide = maxOf(decoded.width, decoded.height)
    val scale = if (longestSide > maxDimension) maxDimension.toFloat() / longestSide else 1f
    val resized =
        if (scale < 1f) {
            val scaled =
                Bitmap.createScaledBitmap(decoded, (decoded.width * scale).toInt(), (decoded.height * scale).toInt(), true)
            decoded.recycle()
            scaled
        } else {
            decoded
        }

    val bytes =
        ByteArrayOutputStream().use { stream ->
            resized.compress(Bitmap.CompressFormat.JPEG, 85, stream)
            stream.toByteArray()
        }
    resized.recycle()
    return bytes
}

/** Two-pass bounded bitmap decode — decoding a full-resolution 12MP+ photo directly (as
 * `BitmapFactory.decodeStream` alone does) can allocate 48-430MB and OOM-kill the process.
 * First pass reads only `outWidth`/`outHeight` (`inJustDecodeBounds`, no pixel allocation),
 * then a power-of-2 `inSampleSize` is computed so the second pass decodes a bitmap already
 * close to [maxDimension] on its longest side, never the original full size. */
private fun decodeBoundedBitmap(
    context: Context,
    uri: Uri,
    maxDimension: Int,
): Bitmap {
    val boundsOptions = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    val boundsStream =
        context.contentResolver.openInputStream(uri)
            ?: error("Não foi possível abrir a imagem selecionada")
    boundsStream.use { BitmapFactory.decodeStream(it, null, boundsOptions) }

    var sampleSize = 1
    val longestSide = maxOf(boundsOptions.outWidth, boundsOptions.outHeight)
    while (longestSide / (sampleSize * 2) >= maxDimension) {
        sampleSize *= 2
    }

    val decodeOptions = BitmapFactory.Options().apply { inSampleSize = sampleSize }
    val input =
        context.contentResolver.openInputStream(uri)
            ?: error("Não foi possível abrir a imagem selecionada")
    return input.use { BitmapFactory.decodeStream(it, null, decodeOptions) } ?: error("Imagem inválida")
}
