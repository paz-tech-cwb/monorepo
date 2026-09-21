package br.church.paz.android.ui.features.academy

import br.church.paz.shared.domain.model.CourseDetail
import br.church.paz.shared.domain.model.Lesson

data class CourseDetailUiState(
    val isLoading: Boolean = true,
    val course: CourseDetail? = null,
    val error: String? = null,
    val selectedLessonId: String? = null,
) {
    val selectedLesson: Lesson?
        get() = course?.lessons?.firstOrNull { it.id == selectedLessonId } ?: course?.lessons?.firstOrNull()
}

sealed class CourseDetailEffect {
    data class NavigateToQuestionnaire(
        val courseId: String,
    ) : CourseDetailEffect()
}
