package br.church.paz.android.ui.features.formularios

data class CasaDePazSubmissionEditorUiState(
    val isLoading: Boolean = true,
    val date: String = "",
    val facilitator: String = "",
    val sectorId: Int? = null,
    val casaDePazId: String? = null,
    val kids: String = "0",
    val guests: List<CasaDePazGuestDraft> = emptyList(),
    val conversions: String = "0",
    val meetingDay: String = "",
    val sectorNames: Map<Int, String> = emptyMap(),
    val cycles: List<CasaDePazCycleOption> = emptyList(),
    val isSaving: Boolean = false,
    val isDeleting: Boolean = false,
    val error: String? = null,
)

data class CasaDePazCycleOption(
    val id: String,
    val name: String,
)

sealed class CasaDePazSubmissionEditorEffect {
    data object Saved : CasaDePazSubmissionEditorEffect()

    data object Deleted : CasaDePazSubmissionEditorEffect()

    data object NavigateBack : CasaDePazSubmissionEditorEffect()
}
