package br.church.paz.android.ui.features.lifegroupreports

import br.church.paz.shared.domain.model.LifeGroupWeeklyReport

data class LifeGroupReportsUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    // Newest first.
    val reports: List<LifeGroupWeeklyReport> = emptyList(),
    val error: String? = null,
    // The backend answered 403: the group is outside the viewer's scope.
    val noAccess: Boolean = false,
)

sealed class LifeGroupReportsEffect {
    data object NavigateBack : LifeGroupReportsEffect()

    /** Transient failure while content is already on screen (e.g. a failed pull-to-refresh). */
    data class ShowError(
        val message: String,
    ) : LifeGroupReportsEffect()

    data class NavigateToDetail(
        val reportId: String,
    ) : LifeGroupReportsEffect()
}

data class LifeGroupReportDetailUiState(
    val isLoading: Boolean = true,
    val report: LifeGroupWeeklyReport? = null,
    val error: String? = null,
    // 403/404: report out of the viewer's scope (the backend answers 404 to avoid id probing).
    val noAccess: Boolean = false,
)

sealed class LifeGroupReportDetailEffect {
    data object NavigateBack : LifeGroupReportDetailEffect()
}

/** "150.50" -> "R$ 150,50". Non-numeric input is shown as-is after the currency prefix. */
internal fun formatOffering(offering: String): String = "R$ " + offering.trim().replace('.', ',')

/** Comma list of activity values plus the free-text "other"; "—" when both are empty. */
internal fun activitySummary(
    types: List<String>,
    other: String?,
): String {
    val parts = types + listOfNotNull(other?.takeIf { it.isNotBlank() })
    return if (parts.isEmpty()) "—" else parts.joinToString(", ")
}
