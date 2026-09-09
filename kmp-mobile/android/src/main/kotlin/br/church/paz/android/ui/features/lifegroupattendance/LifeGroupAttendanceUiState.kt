package br.church.paz.android.ui.features.lifegroupattendance

import br.church.paz.shared.domain.model.LifeGroupAttendance

data class LifeGroupAttendanceHistoryUiState(
    val isLoading: Boolean = true,
    val records: List<LifeGroupAttendance> = emptyList(),
    val error: String? = null,
)

sealed class LifeGroupAttendanceHistoryEffect {
    data object NavigateBack : LifeGroupAttendanceHistoryEffect()

    data class NavigateToEditor(
        val date: String,
    ) : LifeGroupAttendanceHistoryEffect()
}

data class LifeGroupAttendanceEditorUiState(
    val isLoading: Boolean = true,
    val isSaving: Boolean = false,
    val meetingDate: String = "",
    val entries: List<br.church.paz.shared.domain.model.LifeGroupAttendanceEntry> = emptyList(),
    val error: String? = null,
    val saveError: String? = null,
)

sealed class LifeGroupAttendanceEditorEffect {
    data object NavigateBack : LifeGroupAttendanceEditorEffect()

    data object Saved : LifeGroupAttendanceEditorEffect()
}
