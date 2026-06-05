package br.church.paz.android.ui.features.academy

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.model.AcademyVideo
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
) : ViewModel() {
    private val _uiState = MutableStateFlow(VideoPlayerUiState())
    val uiState: StateFlow<VideoPlayerUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    private fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = false) }
        }
    }

    fun onVideoTapped(newVideoId: String) = Unit
}
