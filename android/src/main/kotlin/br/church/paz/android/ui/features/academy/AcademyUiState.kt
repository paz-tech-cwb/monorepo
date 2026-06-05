package br.church.paz.android.ui.features.academy

import br.church.paz.shared.domain.model.Course
import br.church.paz.shared.domain.model.CourseTrack

data class AcademyUiState(
    val isLoading: Boolean = true,
    val tracks: List<CourseTrack> = emptyList(),
    val error: String? = null,
    val isAuthenticated: Boolean = false,
    val resumeCourse: Course? = null,
)

sealed class AcademyEffect {
    data class NavigateToPlayer(
        val videoId: String,
    ) : AcademyEffect()
}
