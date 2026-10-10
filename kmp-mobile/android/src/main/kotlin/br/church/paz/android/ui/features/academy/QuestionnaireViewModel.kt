package br.church.paz.android.ui.features.academy

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.repository.CourseRepository
import br.church.paz.shared.domain.repository.QuestionnaireAnswerInput
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

private const val KEY_STEP_INDEX = "questionnaire_step_index"
private const val KEY_SELECTED_OPTION_IDS = "questionnaire_selected_option_ids"
private const val KEY_FREE_TEXT_ANSWERS = "questionnaire_free_text_answers"

class QuestionnaireViewModel(
    private val courseId: String,
    private val courseRepository: CourseRepository,
    private val savedStateHandle: SavedStateHandle,
) : ViewModel() {
    private val _uiState =
        MutableStateFlow(
            QuestionnaireUiState(
                stepIndex = savedStateHandle[KEY_STEP_INDEX] ?: 0,
                selectedOptionIds = savedStateHandle[KEY_SELECTED_OPTION_IDS] ?: emptyMap(),
                freeTextAnswers = savedStateHandle[KEY_FREE_TEXT_ANSWERS] ?: emptyMap(),
            ),
        )
    val uiState: StateFlow<QuestionnaireUiState> = _uiState.asStateFlow()

    private val _effect = Channel<QuestionnaireEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        load()
    }

    /** Persists the fields needed to survive system-initiated process death while backgrounded. */
    private fun persistState(state: QuestionnaireUiState) {
        savedStateHandle[KEY_STEP_INDEX] = state.stepIndex
        savedStateHandle[KEY_SELECTED_OPTION_IDS] = state.selectedOptionIds
        savedStateHandle[KEY_FREE_TEXT_ANSWERS] = state.freeTextAnswers
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            runCatching { courseRepository.getQuestionnaire(courseId) }
                .onSuccess { questionnaire ->
                    _uiState.update { it.copy(isLoading = false, questionnaire = questionnaire) }
                }.onFailure { e ->
                    _uiState.update { it.copy(isLoading = false, error = e.message) }
                }
        }
    }

    fun onSelectSingleOption(
        questionId: String,
        optionId: String,
    ) {
        _uiState.update {
            it.copy(selectedOptionIds = it.selectedOptionIds + (questionId to setOf(optionId)))
        }
        persistState(_uiState.value)
    }

    fun onToggleMultiOption(
        questionId: String,
        optionId: String,
    ) {
        _uiState.update { state ->
            val current = state.selectedOptionIds[questionId] ?: emptySet()
            val updated = if (optionId in current) current - optionId else current + optionId
            state.copy(selectedOptionIds = state.selectedOptionIds + (questionId to updated))
        }
        persistState(_uiState.value)
    }

    fun onFreeTextChanged(
        questionId: String,
        text: String,
    ) {
        _uiState.update { it.copy(freeTextAnswers = it.freeTextAnswers + (questionId to text)) }
        persistState(_uiState.value)
    }

    fun onNextStep() {
        val questions =
            _uiState.value.questionnaire
                ?.questions
                .orEmpty()
        _uiState.update { it.copy(stepIndex = (it.stepIndex + 1).coerceAtMost(questions.size - 1)) }
        persistState(_uiState.value)
    }

    fun onPreviousStep() {
        _uiState.update { it.copy(stepIndex = (it.stepIndex - 1).coerceAtLeast(0)) }
        persistState(_uiState.value)
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(QuestionnaireEffect.NavigateBack) }
    }

    fun onSubmit() {
        val questionnaire = _uiState.value.questionnaire ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, submitError = null) }
            val answers =
                questionnaire.questions.map { question ->
                    QuestionnaireAnswerInput(
                        questionId = question.id,
                        optionIds =
                            _uiState.value.selectedOptionIds[question.id]
                                ?.toList()
                                .orEmpty(),
                        text = _uiState.value.freeTextAnswers[question.id],
                    )
                }
            runCatching { courseRepository.submitQuestionnaire(courseId, answers) }
                .onSuccess { result ->
                    _uiState.update { it.copy(isSubmitting = false, result = result) }
                }.onFailure { e ->
                    _uiState.update { it.copy(isSubmitting = false, submitError = e.message) }
                }
        }
    }

    fun onSubmitErrorShown() {
        _uiState.update { it.copy(submitError = null) }
    }
}
