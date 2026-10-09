package br.church.paz.android.ui.features.reports

data class ReportsListUiState(
    val isLoading: Boolean = true,
    val isLeader: Boolean = false,
)

sealed class ReportsListEffect {
    data object NavigateToCasaDePaz : ReportsListEffect()

    data object NavigateToLifeGroupAnalytics : ReportsListEffect()

    data object NavigateToCasaDePazAnalytics : ReportsListEffect()
}
