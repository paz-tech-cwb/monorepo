package br.church.paz.android.ui.features.lifegroupstudy

import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.TextFieldValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.data.remote.httpStatusCodeOrNull
import br.church.paz.shared.domain.repository.LifeGroupStudyRepository
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class LifeGroupStudyEditorViewModel(
    private val studyId: String?,
    private val repository: LifeGroupStudyRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(LifeGroupStudyEditorUiState(isEditMode = studyId != null))
    val uiState: StateFlow<LifeGroupStudyEditorUiState> = _uiState.asStateFlow()

    private val _effect = Channel<LifeGroupStudyEditorEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        if (studyId != null) loadExisting(studyId)
    }

    private fun loadExisting(id: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            runCatching { repository.getStudy(id) }
                .onSuccess { study ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            title = study.title,
                            author = study.author,
                            bodyMarkdown = TextFieldValue(study.bodyMarkdown),
                            imageUrl = study.imageUrl.orEmpty(),
                        )
                    }
                }.onFailure { e ->
                    _uiState.update { it.copy(isLoading = false, error = friendlyErrorMessage(e, "Não foi possível carregar o estudo.")) }
                }
        }
    }

    fun onTitleChange(value: String) = _uiState.update { it.copy(title = value) }

    fun onAuthorChange(value: String) = _uiState.update { it.copy(author = value) }

    fun onBodyChange(value: TextFieldValue) = _uiState.update { it.copy(bodyMarkdown = value) }

    fun onImageUrlChange(value: String) = _uiState.update { it.copy(imageUrl = value) }

    // Wraps the current selection of the markdown text with the given prefix/suffix,
    // mirroring a minimal formatting toolbar (bold/italic/heading/list). With no selection,
    // the markers are inserted at the cursor with the cursor left between them.
    fun applyMarkdownWrap(prefix: String, suffix: String = prefix) {
        _uiState.update {
            val field = it.bodyMarkdown
            val selection = field.selection
            val start = selection.min
            val end = selection.max
            val newText = field.text.substring(0, start) + prefix + field.text.substring(start, end) + suffix + field.text.substring(end)
            val newCursor = if (start == end) start + prefix.length else start + prefix.length + (end - start) + suffix.length
            it.copy(bodyMarkdown = TextFieldValue(newText, TextRange(newCursor)))
        }
    }

    fun applyMarkdownLinePrefix(linePrefix: String) {
        _uiState.update {
            val body = it.bodyMarkdown.text
            val needsNewline = body.isNotEmpty() && !body.endsWith("\n")
            val newText = body + (if (needsNewline) "\n" else "") + linePrefix
            it.copy(bodyMarkdown = TextFieldValue(newText, TextRange(newText.length)))
        }
    }

    fun onSave() {
        val state = _uiState.value
        if (!state.isValid || state.isSaving) return
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, error = null) }
            // Only ever persist a real hosted URL — never a device-local URI (there is no
            // upload endpoint to resolve one into a hosted image, see editor screen doc).
            val imageUrl =
                state.imageUrl.trim().ifBlank { null }?.takeUnless {
                    it.startsWith("content://") || it.startsWith("file://")
                }
            val result =
                runCatching {
                    if (studyId != null) {
                        repository.updateStudy(studyId, state.title.trim(), state.author.trim(), state.bodyMarkdown.text, imageUrl)
                    } else {
                        repository.createStudy(state.title.trim(), state.author.trim(), state.bodyMarkdown.text, imageUrl)
                    }
                }
            result
                .onSuccess { saved ->
                    _uiState.update { it.copy(isSaving = false) }
                    _effect.send(LifeGroupStudyEditorEffect.Saved(saved.id))
                }.onFailure { e ->
                    val message =
                        if (e.httpStatusCodeOrNull() == 403) {
                            "Você não tem permissão para publicar estudos do Life."
                        } else {
                            e.message ?: "Não foi possível salvar o estudo."
                        }
                    _uiState.update { it.copy(isSaving = false, error = message) }
                }
        }
    }

    fun onCancel() {
        viewModelScope.launch { _effect.send(LifeGroupStudyEditorEffect.NavigateBack) }
    }
}

/**
 * Maps a repository failure to a user-facing message, checking the actual HTTP status
 * code (rather than string-matching on the exception message) for the permission case.
 */
internal fun friendlyErrorMessage(e: Throwable, fallback: String): String =
    if (e.httpStatusCodeOrNull() == 403) {
        "Você não tem permissão para acessar este conteúdo."
    } else {
        e.message ?: fallback
    }
