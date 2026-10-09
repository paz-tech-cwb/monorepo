package br.church.paz.android.ui.features.academy

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.repository.AcademyRepository
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.domain.repository.LifeGroupStudyRepository
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class AcademyViewModel(
    private val academyRepository: AcademyRepository,
    private val authRepository: AuthRepository,
    private val lifeGroupStudyRepository: LifeGroupStudyRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(AcademyUiState())
    val uiState: StateFlow<AcademyUiState> = _uiState.asStateFlow()

    private val _effect = Channel<AcademyEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        load()
    }

    fun load() = fetch(showSkeleton = true)

    /** Pull-to-refresh entry point — re-invokes the same load path without the full-screen skeleton. */
    fun refresh() = fetch(showSkeleton = false)

    private fun fetch(showSkeleton: Boolean) {
        viewModelScope.launch {
            _uiState.update {
                it.copy(isLoading = showSkeleton, isRefreshing = !showSkeleton, error = null)
            }
            val user = runCatching { authRepository.currentUser() }.getOrNull()
            val isAuthenticated = user != null
            _uiState.update { it.copy(isAuthenticated = isAuthenticated) }
            runCatching { academyRepository.getAcademyContent() }
                .onSuccess { content ->
                    _uiState.update {
                        it.copy(isLoading = false, isRefreshing = false, tracks = content.tracks)
                    }
                }.onFailure { e ->
                    _uiState.update { it.copy(isLoading = false, isRefreshing = false, error = e.message) }
                }

            // Estudo do Life requires life-group membership server-side (canView) — a plain
            // 403 here (visitor, or a member not yet in a life group) shouldn't surface as a
            // page-level error, so this failure is silently ignored — same intent as iOS's `try?`.
            if (!isAuthenticated) {
                _uiState.update { it.copy(latestStudy = null) }
                return@launch
            }
            val latestStudy =
                runCatching { lifeGroupStudyRepository.getStudies(page = 1, limit = 1).items.firstOrNull() }
                    .onFailure { e -> Log.d("AcademyVM", "latestStudy fetch failed: ${e.message}") }
                    .getOrNull()
            _uiState.update { it.copy(latestStudy = latestStudy) }
        }
    }

    fun refreshAuthState() {
        viewModelScope.launch {
            val user = runCatching { authRepository.currentUser() }.getOrNull()
            _uiState.update { it.copy(isAuthenticated = user != null) }
        }
    }

    fun onVideoTapped(videoId: String) {
        viewModelScope.launch { _effect.send(AcademyEffect.NavigateToPlayer(videoId)) }
    }

    fun onCourseTapped(courseId: String) {
        viewModelScope.launch { _effect.send(AcademyEffect.NavigateToCourse(courseId)) }
    }

    fun onStudyTapped(studyId: String) {
        viewModelScope.launch { _effect.send(AcademyEffect.NavigateToStudy(studyId)) }
    }
}
