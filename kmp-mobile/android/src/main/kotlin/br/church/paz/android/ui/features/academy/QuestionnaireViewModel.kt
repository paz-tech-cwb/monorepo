package br.church.paz.android.ui.features.academy

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

class QuestionnaireViewModel(
    private val courseId: String,
    private val courseRepository: CourseRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(QuestionnaireUiState())
    val uiState: StateFlow<QuestionnaireUiState> = _uiState.asStateFlow()

    private val _effect = Channel<QuestionnaireEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        load()
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
    }

    fun onFreeTextChanged(
        questionId: String,
        text: String,
    ) {
        _uiState.update { it.copy(freeTextAnswers = it.freeTextAnswers + (questionId to text)) }
    }

    fun onNextStep() {
        val questions =
            _uiState.value.questionnaire
                ?.questions
                .orEmpty()
        _uiState.update { it.copy(stepIndex = (it.stepIndex + 1).coerceAtMost(questions.size - 1)) }
    }

    fun onPreviousStep() {
        _uiState.update { it.copy(stepIndex = (it.stepIndex - 1).coerceAtLeast(0)) }
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
}
