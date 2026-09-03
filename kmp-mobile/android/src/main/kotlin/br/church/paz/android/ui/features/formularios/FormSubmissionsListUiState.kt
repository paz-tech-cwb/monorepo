package br.church.paz.android.ui.features.formularios

import br.church.paz.shared.domain.model.ServiceReportSubmission

data class FormSubmissionsListUiState(
    val submissions: List<ServiceReportSubmission> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null,
)

sealed class FormSubmissionsListEffect {
    data class NavigateToDetail(val submissionId: String) : FormSubmissionsListEffect()
    data object NavigateBack : FormSubmissionsListEffect()
}
