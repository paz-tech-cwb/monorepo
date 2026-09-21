package br.church.paz.android.ui.features.formularios

data class CasaDePazSubmissionEditorUiState(
    val isLoading: Boolean = true,
    val date: String = "",
    val facilitator: String = "",
    val sectorId: Int? = null,
    val adults: String = "0",
    val kids: String = "0",
    val guests: String = "0",
    val conversions: String = "0",
    val meetingDay: String = "",
    val meetingTime: String = "",
    val sectorNames: Map<Int, String> = emptyMap(),
    val isSaving: Boolean = false,
    val isDeleting: Boolean = false,
    val error: String? = null,
)

sealed class CasaDePazSubmissionEditorEffect {
    data object Saved : CasaDePazSubmissionEditorEffect()

    data object Deleted : CasaDePazSubmissionEditorEffect()

    data object NavigateBack : CasaDePazSubmissionEditorEffect()
}
