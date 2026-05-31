package br.church.paz.android.ui.features.profile

data class EditProfileUiState(
    val name: String = "",
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val error: String? = null,
    val saveSuccess: Boolean = false,
)

sealed class EditProfileEffect {
    data object SaveSuccess : EditProfileEffect()
    data object NavigateBack : EditProfileEffect()
}
