package br.church.paz.android.ui.features.academy

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.model.AcademyVideo
import br.church.paz.shared.domain.repository.AcademyRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class VideoPlayerUiState(
    val video: AcademyVideo? = null,
    val relatedVideos: List<AcademyVideo> = emptyList(),
    val isLoading: Boolean = true,
)

class VideoPlayerViewModel(
    private val videoId: String,
    private val academyRepository: AcademyRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(VideoPlayerUiState())
    val uiState: StateFlow<VideoPlayerUiState> = _uiState.asStateFlow()

    init { load() }

    private fun load() {
        viewModelScope.launch {
            academyRepository.getAcademyContent()
                .onSuccess { content ->
                    val video = content.videos.find { it.id == videoId }
                    val related = content.videos
                        .filter { it.id != videoId }
                        .let { others ->
                            // Prefer same category first
                            val sameCategory = others.filter { it.category == video?.category }
                            (sameCategory + others.filter { it.category != video?.category }).take(6)
                        }
                    _uiState.update { it.copy(video = video, relatedVideos = related, isLoading = false) }
                }
                .onFailure {
                    _uiState.update { it.copy(isLoading = false) }
                }
        }
    }

    // Navigate to another video in the same player screen
    fun onVideoTapped(newVideoId: String) {
        _uiState.update { it.copy(isLoading = true) }
        viewModelScope.launch {
            academyRepository.getAcademyContent()
                .onSuccess { content ->
                    val video = content.videos.find { it.id == newVideoId }
                    val related = content.videos
                        .filter { it.id != newVideoId }
                        .let { others ->
                            val sameCategory = others.filter { it.category == video?.category }
                            (sameCategory + others.filter { it.category != video?.category }).take(6)
                        }
                    _uiState.update { it.copy(video = video, relatedVideos = related, isLoading = false) }
                }
                .onFailure {
                    _uiState.update { it.copy(isLoading = false) }
                }
        }
    }
}
