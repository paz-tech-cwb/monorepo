package br.church.paz.android.ui.features.casadepazanalytics

import br.church.paz.shared.domain.model.CasaDePazAnalyticsSummary

data class CasaDePazAnalyticsUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    // "YYYY-MM-DD" — free from/to date range, defaulting to the same window
    // the backend defaults to when the params are omitted (6 months back,
    // start of month, through today), matching admin-ui exactly.
    val from: String,
    val to: String,
    val summary: CasaDePazAnalyticsSummary? = null,
    val error: String? = null,
)

sealed class CasaDePazAnalyticsEffect {
    data object NavigateBack : CasaDePazAnalyticsEffect()
}
