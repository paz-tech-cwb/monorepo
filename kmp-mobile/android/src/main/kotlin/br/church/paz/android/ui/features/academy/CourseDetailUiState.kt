package br.church.paz.android.ui.features.academy

import br.church.paz.shared.domain.model.CourseDetail
import br.church.paz.shared.domain.model.Lesson

/**
 * YouTube IFrame API error codes: `100`/`101`/`150` mean the video is genuinely unavailable (not
 * found, private, or embedding disabled by the owner) — only those justify falling back to an
 * external "Abrir no YouTube" link. Everything else (`2`, `5`, unknown codes) is treated as
 * transient/retryable, since the IFrame API can surface those for non-fatal reasons.
 */
enum class VideoPlaybackError {
    Retryable,
    Unavailable,
    ;

    companion object {
        fun fromCode(code: Int): VideoPlaybackError =
            when (code) {
                100, 101, 150 -> Unavailable
                else -> Retryable
            }
    }
}

data class CourseDetailUiState(
    val isLoading: Boolean = true,
    val course: CourseDetail? = null,
    val error: String? = null,
    val selectedLessonId: String? = null,
    val playerError: VideoPlaybackError? = null,
) {
    val selectedLesson: Lesson?
        get() = course?.lessons?.firstOrNull { it.id == selectedLessonId } ?: course?.lessons?.firstOrNull()
}

sealed class CourseDetailEffect {
    data class NavigateToQuestionnaire(
        val courseId: String,
    ) : CourseDetailEffect()
}
