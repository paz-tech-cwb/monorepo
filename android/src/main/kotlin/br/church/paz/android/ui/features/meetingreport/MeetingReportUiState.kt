package br.church.paz.android.ui.features.meetingreport

data class MeetingReportUiState(
    val date: String = "",
    val attendees: String = "",
    val visitors: String = "",
    val offerings: String = "",
    val observations: String = "",
    val isSubmitting: Boolean = false,
    val error: String? = null,
    val success: Boolean = false,
)

sealed class MeetingReportEffect {
    data object SubmitSuccess : MeetingReportEffect()
    data object NavigateBack : MeetingReportEffect()
}
