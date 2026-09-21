package br.church.paz.android.ui.features.academy

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.components.PazErrorState
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.Question
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf

/**
 * One-question-per-screen flow, mirroring `FormStepScreen`'s pattern (see commit dd0098f):
 * bottom bar pinned above the keyboard, header back arrow steps backward through questions and
 * only leaves the screen at the first question, and a dedicated result screen at the end
 * instead of an instant pop/snackbar.
 */
@Composable
fun QuestionnaireScreen(
    navController: NavController,
    courseId: String,
    viewModel: QuestionnaireViewModel = koinViewModel(parameters = { parametersOf(courseId) }),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                QuestionnaireEffect.NavigateBack -> navController.popBackStack()
            }
        }
    }

    val questions = uiState.questionnaire?.questions.orEmpty()
    BackHandler(enabled = uiState.stepIndex > 0 && uiState.result == null) { viewModel.onPreviousStep() }

    Scaffold(
        containerColor = Color.Transparent,
        bottomBar = {
            if (!uiState.isLoading && uiState.questionnaire != null && uiState.result == null && questions.isNotEmpty()) {
                QuestionnaireBottomBar(
                    isLast = uiState.stepIndex == questions.size - 1,
                    isSubmitting = uiState.isSubmitting,
                    onNext = {
                        val isLast = uiState.stepIndex == questions.size - 1
                        if (isLast) viewModel.onSubmit() else viewModel.onNextStep()
                    },
                )
            }
        },
    ) { innerPadding ->
        Column(Modifier.fillMaxSize().padding(bottom = innerPadding.calculateBottomPadding())) {
            Box(Modifier.fillMaxWidth().background(PazGradients.Hero).statusBarsPadding()) {
                if (uiState.result == null) {
                    Row(
                        Modifier.fillMaxWidth().padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Md),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        IconButton(
                            onClick = { if (uiState.stepIndex > 0) viewModel.onPreviousStep() else viewModel.onBack() },
                        ) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, "voltar", tint = Color.White)
                        }
                        Text(
                            uiState.questionnaire?.title ?: "Questionário",
                            style = MaterialTheme.typography.headlineMedium.copy(color = Color.White),
                            modifier = Modifier.weight(1f),
                            maxLines = 1,
                        )
                    }
                }
            }

            Box(
                Modifier
                    .fillMaxSize()
                    .clip(RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                    .background(MaterialTheme.colorScheme.background),
            ) {
                when {
                    uiState.result != null ->
                        QuestionnaireResultState(
                            result = uiState.result!!,
                            onDone = { navController.popBackStack() },
                        )
                    uiState.isLoading -> QuestionnaireSkeleton()
                    uiState.error != null ->
                        PazErrorState(message = uiState.error ?: "Erro ao carregar questionário", onRetry = viewModel::load)
                    questions.isEmpty() ->
                        PazErrorState(message = "Este questionário não possui perguntas", onRetry = { navController.popBackStack() })
                    else ->
                        QuestionnaireStepContent(
                            uiState = uiState,
                            questions = questions,
                            onSelectSingle = viewModel::onSelectSingleOption,
                            onToggleMulti = viewModel::onToggleMultiOption,
                            onFreeTextChanged = viewModel::onFreeTextChanged,
                        )
                }
            }
        }
    }
}

@Composable
private fun QuestionnaireStepContent(
    uiState: QuestionnaireUiState,
    questions: List<Question>,
    onSelectSingle: (String, String) -> Unit,
    onToggleMulti: (String, String) -> Unit,
    onFreeTextChanged: (String, String) -> Unit,
) {
    val stepIndex = uiState.stepIndex.coerceIn(0, questions.size - 1)
    val question = questions[stepIndex]

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(PazSpacing.Lg)) {
        LinearProgressIndicator(
            progress = { (stepIndex + 1).toFloat() / questions.size },
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(PazSpacing.Sm))
        Text(
            "${stepIndex + 1} de ${questions.size}",
            style = MaterialTheme.typography.labelMedium.copy(color = MaterialTheme.colorScheme.onSurface.copy(.6f)),
        )
        Spacer(Modifier.height(PazSpacing.Lg))

        AnimatedContent(
            targetState = stepIndex,
            transitionSpec = {
                (slideInHorizontally { it } + fadeIn()) togetherWith (slideOutHorizontally { -it } + fadeOut())
            },
            label = "questionnaire-step",
        ) { index ->
            Text(questions[index].text, style = MaterialTheme.typography.headlineSmall)
        }

        Spacer(Modifier.height(PazSpacing.Lg))

        when {
            question.isFreeText ->
                OutlinedTextField(
                    value = uiState.freeTextAnswers[question.id] ?: "",
                    onValueChange = { onFreeTextChanged(question.id, it) },
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                    label = { Text("Sua resposta") },
                )
            question.isSingleChoice ->
                Column(verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
                    question.options.forEach { option ->
                        val selected = uiState.selectedOptionIds[question.id]?.contains(option.id) == true
                        OptionRow(
                            text = option.text,
                            selected = selected,
                            onClick = { onSelectSingle(question.id, option.id) },
                        ) {
                            RadioButton(selected = selected, onClick = { onSelectSingle(question.id, option.id) })
                        }
                    }
                }
            question.isMultipleChoice ->
                Column(verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
                    question.options.forEach { option ->
                        val selected = uiState.selectedOptionIds[question.id]?.contains(option.id) == true
                        OptionRow(
                            text = option.text,
                            selected = selected,
                            onClick = { onToggleMulti(question.id, option.id) },
                        ) {
                            Checkbox(checked = selected, onCheckedChange = { onToggleMulti(question.id, option.id) })
                        }
                    }
                }
        }

        if (uiState.submitError != null) {
            Spacer(Modifier.height(PazSpacing.Md))
            Text(uiState.submitError, style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.error))
        }
    }
}

@Composable
private fun OptionRow(
    text: String,
    selected: Boolean,
    onClick: () -> Unit,
    control: @Composable () -> Unit,
) {
    Surface(
        onClick = onClick,
        shape = PazShapes.large,
        color = if (selected) PazColors.PrimaryTint else MaterialTheme.colorScheme.surface,
        modifier = Modifier.fillMaxWidth(),
        border = if (selected) androidx.compose.foundation.BorderStroke(1.dp, PazColors.Primary) else null,
    ) {
        Row(
            Modifier.fillMaxWidth().padding(PazSpacing.Md),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(PazSpacing.Sm),
        ) {
            control()
            Text(text, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
        }
    }
}

@Composable
private fun QuestionnaireBottomBar(
    isLast: Boolean,
    isSubmitting: Boolean,
    onNext: () -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.background)
            .imePadding()
            .navigationBarsPadding()
            .padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Md),
    ) {
        PazButton(
            text = if (isLast) (if (isSubmitting) "Enviando..." else "Enviar") else "Continuar",
            onClick = onNext,
            enabled = !isSubmitting,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun QuestionnaireResultState(
    result: br.church.paz.shared.domain.model.QuestionnaireResult,
    onDone: () -> Unit,
) {
    Column(
        Modifier.fillMaxSize().padding(PazSpacing.Xl),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(
            Modifier
                .size(72.dp)
                .clip(RoundedCornerShape(50))
                .background((if (result.passed) PazColors.Success else PazColors.Error).copy(alpha = .12f)),
            Alignment.Center,
        ) {
            Icon(
                if (result.passed) Icons.Filled.CheckCircle else Icons.Filled.RadioButtonUnchecked,
                null,
                tint = if (result.passed) PazColors.Success else PazColors.Error,
                modifier = Modifier.size(36.dp),
            )
        }
        Spacer(Modifier.height(PazSpacing.Lg))
        Text(
            if (result.passed) "Você foi aprovado!" else "Não foi dessa vez",
            style = MaterialTheme.typography.titleLarge,
        )
        Spacer(Modifier.height(PazSpacing.Sm))
        Text(
            "Sua nota: ${result.scorePercentage}% (mínimo ${result.passingScorePercentage}%)",
            style = MaterialTheme.typography.bodyMedium.copy(color = MaterialTheme.colorScheme.onSurface.copy(.7f)),
        )
        val certificate = result.certificate
        if (certificate != null) {
            Spacer(Modifier.height(PazSpacing.Md))
            Text(
                "Certificado emitido: ${certificate.certificateCode}",
                style = MaterialTheme.typography.bodySmall.copy(color = PazColors.Primary),
            )
        }
        Spacer(Modifier.height(PazSpacing.Xl))
        PazButton(text = "Concluir", onClick = onDone, modifier = Modifier.fillMaxWidth())
    }
}

@Composable
private fun QuestionnaireSkeleton() {
    Column(Modifier.fillMaxSize().padding(PazSpacing.Lg), verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg)) {
        PazSkeleton(height = 8.dp)
        PazSkeleton(height = 24.dp, width = 200.dp)
        repeat(3) { PazSkeleton(height = 56.dp) }
    }
}
