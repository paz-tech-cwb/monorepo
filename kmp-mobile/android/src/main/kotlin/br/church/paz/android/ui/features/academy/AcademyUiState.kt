package br.church.paz.android.ui.features.academy

import br.church.paz.shared.domain.model.Course
import br.church.paz.shared.domain.model.CourseTrack
import br.church.paz.shared.domain.model.LifeGroupStudy

data class AcademyUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val tracks: List<CourseTrack> = emptyList(),
    val error: String? = null,
    val isAuthenticated: Boolean = false,
    val resumeCourse: Course? = null,
    val latestStudy: LifeGroupStudy? = null,
)

sealed class AcademyEffect {
    data class NavigateToPlayer(
        val videoId: String,
    ) : AcademyEffect()

    data class NavigateToCourse(
        val courseId: String,
    ) : AcademyEffect()

    data class NavigateToStudy(
        val studyId: String,
    ) : AcademyEffect()
}
