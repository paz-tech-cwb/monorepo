package br.church.paz.android.ui.features.academy

import br.church.paz.shared.domain.model.AcademyVideo

data class AcademyUiState(
    val isLoading: Boolean = true,
    val featured: AcademyVideo? = null,
    val videos: List<AcademyVideo> = emptyList(),
    val selectedCategory: String = "Todos",
    val error: String? = null,
) {
    val categories: List<String>
        get() = listOf("Todos") + videos.mapNotNull { it.category }.distinct()

    val filteredVideos: List<AcademyVideo>
        get() = if (selectedCategory == "Todos") videos
                else videos.filter { it.category == selectedCategory }
}

sealed class AcademyEffect {
    data class NavigateToPlayer(val videoId: String) : AcademyEffect()
}
