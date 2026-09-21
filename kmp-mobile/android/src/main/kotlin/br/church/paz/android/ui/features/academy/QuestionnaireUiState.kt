package br.church.paz.android.ui.features.academy

import br.church.paz.shared.domain.model.Questionnaire
import br.church.paz.shared.domain.model.QuestionnaireResult

data class QuestionnaireUiState(
    val isLoading: Boolean = true,
    val questionnaire: Questionnaire? = null,
    val error: String? = null,
    val stepIndex: Int = 0,
    /** questionId -> selected option ids (single_choice has at most one), or free-text answer. */
    val selectedOptionIds: Map<String, Set<String>> = emptyMap(),
    val freeTextAnswers: Map<String, String> = emptyMap(),
    val isSubmitting: Boolean = false,
    val submitError: String? = null,
    val result: QuestionnaireResult? = null,
)

sealed class QuestionnaireEffect {
    data object NavigateBack : QuestionnaireEffect()
}
