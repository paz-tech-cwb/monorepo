package br.church.paz.android.ui.features.lifegroupstudy

import androidx.compose.ui.text.input.TextFieldValue
import br.church.paz.shared.domain.model.LifeGroupStudy

data class LifeGroupStudyListUiState(
    val isLoading: Boolean = true,
    val isLoadingMore: Boolean = false,
    val studies: List<LifeGroupStudy> = emptyList(),
    val error: String? = null,
    val canPublish: Boolean = false,
    val page: Int = 1,
    val hasMore: Boolean = true,
)

sealed class LifeGroupStudyListEffect {
    data class NavigateToDetail(val studyId: String) : LifeGroupStudyListEffect()

    data object NavigateToCreate : LifeGroupStudyListEffect()
}

data class LifeGroupStudyDetailUiState(
    val isLoading: Boolean = true,
    val study: LifeGroupStudy? = null,
    val error: String? = null,
    val canEdit: Boolean = false,
    val isDeleting: Boolean = false,
)

sealed class LifeGroupStudyDetailEffect {
    data object NavigateBack : LifeGroupStudyDetailEffect()

    data class NavigateToEdit(val studyId: String) : LifeGroupStudyDetailEffect()
}

data class LifeGroupStudyEditorUiState(
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val title: String = "",
    val author: String = "",
    val bodyMarkdown: TextFieldValue = TextFieldValue(""),
    val imageUrl: String = "",
    val error: String? = null,
    val isEditMode: Boolean = false,
) {
    val isValid: Boolean get() = title.isNotBlank() && author.isNotBlank() && bodyMarkdown.text.isNotBlank()
}

sealed class LifeGroupStudyEditorEffect {
    data class Saved(val studyId: String) : LifeGroupStudyEditorEffect()

    data object NavigateBack : LifeGroupStudyEditorEffect()
}
