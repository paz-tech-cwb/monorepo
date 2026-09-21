package br.church.paz.android.ui.features.profile

data class EditProfileUiState(
    val name: String = "",
    val phone: String = "",
    /** ISO "yyyy-MM-dd", or null when not yet set. */
    val birthDate: String? = null,
    val pictureUrl: String? = null,
    val street: String = "",
    val number: String = "",
    val complement: String = "",
    val neighborhood: String = "",
    val city: String = "",
    val state: String = "",
    val zipCode: String = "",
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val isUploadingPicture: Boolean = false,
    val isLookingUpCep: Boolean = false,
    val error: String? = null,
    val saveSuccess: Boolean = false,
)

sealed class EditProfileEffect {
    data object SaveSuccess : EditProfileEffect()

    data object NavigateBack : EditProfileEffect()
}
