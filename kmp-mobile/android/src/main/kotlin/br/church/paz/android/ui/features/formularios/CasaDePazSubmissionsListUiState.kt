package br.church.paz.android.ui.features.formularios

import br.church.paz.shared.domain.model.CasaDePazReportSubmission

data class CasaDePazSubmissionsListUiState(
    val submissions: List<CasaDePazReportSubmission> = emptyList(),
    val sectorNames: Map<Int, String> = emptyMap(),
    val isLoading: Boolean = true,
    val error: String? = null,
)

sealed class CasaDePazSubmissionsListEffect {
    data class NavigateToDetail(
        val submissionId: String,
    ) : CasaDePazSubmissionsListEffect()

    data object NavigateBack : CasaDePazSubmissionsListEffect()
}
