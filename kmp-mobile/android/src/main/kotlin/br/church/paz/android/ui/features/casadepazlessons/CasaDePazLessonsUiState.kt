package br.church.paz.android.ui.features.casadepazlessons

import br.church.paz.shared.domain.model.CasaDePazLesson

data class CasaDePazLessonsListUiState(
    val isLoading: Boolean = true,
    val lessons: List<CasaDePazLesson> = emptyList(),
    val error: String? = null,
)

sealed class CasaDePazLessonsListEffect {
    data class NavigateToDetail(val week: Int) : CasaDePazLessonsListEffect()

    data object NavigateBack : CasaDePazLessonsListEffect()
}

data class CasaDePazLessonDetailUiState(
    val isLoading: Boolean = true,
    val lesson: CasaDePazLesson? = null,
    val error: String? = null,
)

sealed class CasaDePazLessonDetailEffect {
    data object NavigateBack : CasaDePazLessonDetailEffect()
}
