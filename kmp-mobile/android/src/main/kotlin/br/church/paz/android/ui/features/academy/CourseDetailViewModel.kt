package br.church.paz.android.ui.features.academy

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.repository.CourseRepository
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

private const val PROGRESS_CHECKPOINT_INTERVAL_SECONDS = 10

class CourseDetailViewModel(
    private val courseId: String,
    private val courseRepository: CourseRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(CourseDetailUiState())
    val uiState: StateFlow<CourseDetailUiState> = _uiState.asStateFlow()

    private val _effect = Channel<CourseDetailEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    private var lastReportedAtSeconds = 0

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            runCatching { courseRepository.getCourseDetail(courseId) }
                .onSuccess { course ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            course = course,
                            selectedLessonId = it.selectedLessonId ?: course.lessons.firstOrNull()?.id,
                        )
                    }
                }.onFailure { e ->
                    _uiState.update { it.copy(isLoading = false, error = e.message) }
                }
        }
    }

    fun onSelectLesson(lessonId: String) {
        lastReportedAtSeconds = 0
        _uiState.update { it.copy(selectedLessonId = lessonId) }
    }

    /** Called by [GatedYouTubePlayer] roughly every second; only actually posts every ~10s. */
    fun onPlaybackTick(
        percentage: Int,
        positionSeconds: Int,
    ) {
        if (positionSeconds - lastReportedAtSeconds < PROGRESS_CHECKPOINT_INTERVAL_SECONDS) return
        lastReportedAtSeconds = positionSeconds
        reportProgress(percentage, positionSeconds)
    }

    /** Called on pause/dispose — always flushes the latest position regardless of interval. */
    fun onPlaybackPaused(
        percentage: Int,
        positionSeconds: Int,
    ) {
        lastReportedAtSeconds = positionSeconds
        reportProgress(percentage, positionSeconds)
    }

    private fun reportProgress(
        percentage: Int,
        positionSeconds: Int,
    ) {
        val lessonId = uiState.value.selectedLessonId ?: return
        viewModelScope.launch {
            runCatching {
                courseRepository.reportLessonProgress(lessonId, percentage, positionSeconds)
            }.onSuccess { load() }
        }
    }

    fun onQuestionnaireTapped() {
        viewModelScope.launch { _effect.send(CourseDetailEffect.NavigateToQuestionnaire(courseId)) }
    }
}
