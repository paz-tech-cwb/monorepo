package br.church.paz.android.ui.features.formularios

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.togetherWith
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusManager
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.navigation.Screen
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.components.PazButtonVariant
import br.church.paz.android.ui.components.PazErrorState
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazSpacing
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf

/**
 * One-question-per-screen fill flow. Voltar/Continuar (or Enviar on the last step) are pinned
 * above the keyboard via [Scaffold]'s bottomBar + [Modifier.imePadding], never requiring
 * scrolling. Falls back to the scrollable [FormDetailScreen] via "Ver todas as perguntas".
 */
@Composable
fun FormStepScreen(
    navController: NavController,
    formId: String,
    viewModel: FormDetailViewModel = koinViewModel(parameters = { parametersOf(formId) }),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val focusManager = LocalFocusManager.current
    val focusRequester = remember { FocusRequester() }

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                FormDetailEffect.SubmitSuccess -> {
                    snackbarHostState.showSnackbar("Formulário enviado com sucesso!")
                    navController.popBackStack()
                }
                FormDetailEffect.NavigateBack -> navController.popBackStack()
            }
        }
    }

    // System back at step > 0 goes to the previous question rather than popping the screen.
    BackHandler(enabled = uiState.stepIndex > 0) {
        viewModel.onPreviousStep()
    }

    Scaffold(
        containerColor = Color.Transparent,
        bottomBar = {
            if (!uiState.isLoading && uiState.form != null) {
                StepBottomBar(
                    uiState = uiState,
                    onBack = { if (uiState.stepIndex > 0) viewModel.onPreviousStep() else viewModel.onBack() },
                    onNext = {
                        val fieldDefs = uiState.form?.type?.fieldDefs().orEmpty()
                        val isLast = uiState.stepIndex == fieldDefs.size - 1
                        if (isLast) viewModel.onSubmit() else viewModel.onNextStep()
                    },
                )
            }
        },
    ) { innerPadding ->
        Column(Modifier.fillMaxSize().padding(bottom = innerPadding.calculateBottomPadding())) {
            Box(
                Modifier
                    .fillMaxWidth()
                    .background(PazGradients.Hero)
                    .statusBarsPadding(),
            ) {
                StepHeader(
                    title = uiState.form?.title ?: "Formulário",
                    onBack = { viewModel.onBack() },
                    onShowAllQuestions = {
                        navController.navigate(Screen.FormDetail.createRoute(formId))
                    },
                )
            }

            Box(
                Modifier
                    .fillMaxSize()
                    .clip(RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                    .background(MaterialTheme.colorScheme.background),
            ) {
                when {
                    uiState.isLoading -> StepLoadingState()
                    uiState.form == null ->
                        PazErrorState(
                            message = uiState.error ?: "Formulário não encontrado",
                            onRetry = { navController.popBackStack() },
                        )
                    uiState.form!!.type.fieldDefs().isEmpty() ->
                        PazErrorState(
                            message = "Este formulário não possui perguntas",
                            onRetry = { navController.popBackStack() },
                        )
                    else ->
                        StepContent(
                            uiState = uiState,
                            focusRequester = focusRequester,
                            focusManager = focusManager,
                            onFieldChanged = viewModel::onFieldChanged,
                            onOpenPicker = viewModel::openPicker,
                            onSelfOrSearchMode = viewModel::setSelfOrSearchMode,
                            onNextStep = viewModel::onNextStep,
                        )
                }
            }
        }

        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier.padding(PazSpacing.Lg),
        )
    }

    val pickerState = uiState.pickerState
    if (pickerState != null) {
        if (pickerState.isLifeGroup) {
            LifeGroupPickerSheet(
                state = pickerState,
                selectedId = uiState.fields[pickerState.key] ?: "",
                onQueryChanged = viewModel::onPickerQueryChanged,
                onSelect = viewModel::onPickerSelect,
                onDismiss = viewModel::closePicker,
            )
        } else {
            val selectedIds = (uiState.fields[pickerState.key] ?: "")
                .split(",").filter { it.isNotBlank() }.toSet()
            UserPickerSheet(
                state = pickerState,
                selectedIds = selectedIds,
                onQueryChanged = viewModel::onPickerQueryChanged,
                onSelect = viewModel::onPickerSelect,
                onDismiss = viewModel::closePicker,
                onConfirmMulti = viewModel::closePicker,
            )
        }
    }
}

@Composable
private fun StepHeader(
    title: String,
    onBack: () -> Unit,
    onShowAllQuestions: () -> Unit,
) {
    var menuExpanded by remember { mutableStateOf(false) }
    Row(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Md),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onBack) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, "back", tint = Color.White)
        }
        Text(
            title,
            style = MaterialTheme.typography.headlineMedium.copy(color = Color.White),
            modifier = Modifier.weight(1f),
            maxLines = 1,
        )
        Box {
            IconButton(onClick = { menuExpanded = true }) {
                Text("⋮", style = MaterialTheme.typography.headlineMedium.copy(color = Color.White))
            }
            DropdownMenu(expanded = menuExpanded, onDismissRequest = { menuExpanded = false }) {
                DropdownMenuItem(
                    text = { Text("Ver todas as perguntas") },
                    onClick = {
                        menuExpanded = false
                        onShowAllQuestions()
                    },
                )
            }
        }
    }
}

@Composable
private fun StepContent(
    uiState: FormDetailUiState,
    focusRequester: FocusRequester,
    focusManager: FocusManager,
    onFieldChanged: (String, String) -> Unit,
    onOpenPicker: (FormFieldDef) -> Unit,
    onSelfOrSearchMode: (String, Boolean) -> Unit,
    onNextStep: () -> Unit,
) {
    val form = uiState.form!!
    val fieldDefs = remember(form.type) { form.type.fieldDefs() }
    val stepIndex = uiState.stepIndex.coerceIn(0, fieldDefs.size - 1)
    val def = fieldDefs[stepIndex]
    val isLast = stepIndex == fieldDefs.size - 1

    // Re-request focus for the (single, stable) text field whenever a text-input step is
    // reached; clear focus for non-text steps (date pickers, selects, switches, etc).
    LaunchedEffect(stepIndex, def.fieldType) {
        if (def.fieldType.isTextInput) {
            focusRequester.requestFocus()
        } else {
            focusManager.clearFocus()
        }
    }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(PazSpacing.Lg),
    ) {
        LinearProgressIndicator(
            progress = { (stepIndex + 1).toFloat() / fieldDefs.size },
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(PazSpacing.Sm))
        Text(
            "${stepIndex + 1} de ${fieldDefs.size}",
            style = MaterialTheme.typography.labelMedium.copy(
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
            ),
        )
        Spacer(Modifier.height(PazSpacing.Lg))

        AnimatedContent(
            targetState = stepIndex,
            transitionSpec = {
                (slideInHorizontally { it } + fadeIn()) togetherWith (slideOutHorizontally { -it } + fadeOut())
            },
            label = "form-step-label",
        ) { index ->
            val label = fieldDefs[index].label
            Text(label, style = MaterialTheme.typography.headlineSmall)
        }

        Spacer(Modifier.height(PazSpacing.Lg))

        FieldRow(
            def = def,
            value = uiState.fields[def.key] ?: "",
            isSubmitting = uiState.isSubmitting,
            uiState = uiState,
            onValueChange = { onFieldChanged(def.key, it) },
            onOpenPicker = onOpenPicker,
            onSelfOrSearchMode = onSelfOrSearchMode,
            focusRequester = if (def.fieldType.isTextInput) focusRequester else null,
            imeAction = if (isLast) ImeAction.Done else ImeAction.Next,
            onImeAction = onNextStep,
        )

        val stepError = uiState.stepError ?: uiState.error
        if (stepError != null) {
            Spacer(Modifier.height(PazSpacing.Md))
            Text(
                stepError,
                style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.error),
            )
        }
    }
}

@Composable
private fun StepBottomBar(
    uiState: FormDetailUiState,
    onBack: () -> Unit,
    onNext: () -> Unit,
) {
    val fieldDefs = uiState.form?.type?.fieldDefs().orEmpty()
    val isLast = uiState.stepIndex == fieldDefs.size - 1

    Row(
        Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.background)
            .imePadding()
            .navigationBarsPadding()
            .padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Md),
        horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        if (uiState.stepIndex > 0) {
            PazButton(
                text = "Voltar",
                onClick = onBack,
                variant = PazButtonVariant.Secondary,
                modifier = Modifier.weight(1f),
                enabled = !uiState.isSubmitting,
            )
        }
        PazButton(
            text = if (isLast) (if (uiState.isSubmitting) "Enviando..." else "Enviar") else "Continuar",
            onClick = onNext,
            modifier = Modifier.weight(if (uiState.stepIndex > 0) 1f else 2f),
            enabled = !uiState.isSubmitting,
        )
    }
}

@Composable
private fun StepLoadingState() {
    Column(
        Modifier.fillMaxSize().padding(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
    ) {
        PazSkeleton(height = 8.dp)
        Spacer(Modifier.height(PazSpacing.Sm))
        PazSkeleton(height = 24.dp, width = 200.dp)
        PazSkeleton(height = 56.dp)
    }
}
