package br.church.paz.android.ui.features.lifegroupreports

import br.church.paz.shared.domain.model.LifeGroup
import br.church.paz.shared.domain.model.LifeGroupReportDraft
import br.church.paz.shared.domain.model.LifeGroupReportField

data class LifeGroupReportFormUiState(
    val isLoading: Boolean = true,
    // Failure loading the viewer's groups (retryable).
    val loadError: String? = null,
    // Groups the viewer leads or co-leads (the only ones the backend lets them report for).
    val groups: List<LifeGroup> = emptyList(),
    // Non-null when the viewer cannot report for any group (e.g. supervisor only): the form is hidden.
    val noGroupsMessage: String? = null,
    val draft: LifeGroupReportDraft = LifeGroupReportDraft(),
    // Church day (America/Sao_Paulo, ISO) used as the default and upper bound of the date.
    val today: String = "",
    // Per-field validation messages, filled by the first submit attempt and kept in sync afterwards.
    val fieldErrors: Map<LifeGroupReportField, String> = emptyMap(),
    val isSubmitting: Boolean = false,
    // Friendly message of the last failed submit (400/403/404/409/422/network).
    val submitError: String? = null,
    // True after a successful submit: the screen swaps the form for the confirmation.
    val isSubmitted: Boolean = false,
) {
    /** The group picker is only worth showing when there is something to choose. */
    val canChooseGroup: Boolean get() = groups.size > 1

    val selectedGroup: LifeGroup? get() = groups.firstOrNull { it.id == draft.lifeGroupId }
}

sealed class LifeGroupReportFormEffect {
    data object NavigateBack : LifeGroupReportFormEffect()
}
