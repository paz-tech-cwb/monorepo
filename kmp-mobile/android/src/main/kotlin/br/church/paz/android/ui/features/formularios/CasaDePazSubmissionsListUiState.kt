package br.church.paz.android.ui.features.formularios

import br.church.paz.shared.domain.model.CasaDePazCycle
import br.church.paz.shared.domain.model.CasaDePazReportSection

data class CasaDePazSubmissionsListUiState(
    val cycles: List<CasaDePazCycle> = emptyList(),
    val selectedCycleId: String? = null,
    val sections: List<CasaDePazReportSection> = emptyList(),
    val collapsedDates: Set<String> = emptySet(),
    val sectorNames: Map<Int, String> = emptyMap(),
    val isCyclePickerVisible: Boolean = false,
    val cyclePickerQuery: String = "",
    val isLoading: Boolean = true,
    val error: String? = null,
) {
    val selectedCycleName: String?
        get() = cycles.firstOrNull { it.id == selectedCycleId }?.name
}

sealed class CasaDePazSubmissionsListEffect {
    data class NavigateToDetail(
        val submissionId: String,
    ) : CasaDePazSubmissionsListEffect()

    data object NavigateBack : CasaDePazSubmissionsListEffect()
}
