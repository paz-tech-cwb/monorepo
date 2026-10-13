package br.church.paz.android.ui.features.formularios

import br.church.paz.shared.domain.model.FormCatalogItem

data class FormulariosUiState(
    val forms: List<FormCatalogItem> = emptyList(),
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val error: String? = null,
)

sealed class FormulariosEffect {
    data class NavigateToForm(
        val formId: String,
    ) : FormulariosEffect()

    data class NavigateToSubmissionsList(
        val formId: String,
    ) : FormulariosEffect()

    /** Weekly life-group report: always the submit screen, even for readers (leaders have can_read). */
    data object NavigateToLifeGroupReportSubmit : FormulariosEffect()

    data object NavigateBack : FormulariosEffect()
}
