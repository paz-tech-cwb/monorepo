package br.church.paz.android.ui.features.formularios

import br.church.paz.shared.domain.model.FormCatalogItem

data class FormulariosUiState(
    val forms: List<FormCatalogItem> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null,
)

sealed class FormulariosEffect {
    data class NavigateToForm(
        val formId: String,
    ) : FormulariosEffect()

    data object NavigateToSubmissionsList : FormulariosEffect()

    data object NavigateBack : FormulariosEffect()
}
