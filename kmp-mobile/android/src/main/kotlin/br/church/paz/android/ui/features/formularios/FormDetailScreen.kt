package br.church.paz.android.ui.features.formularios

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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.components.PazErrorState
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf

/**
 * Scrollable all-at-once form screen. Kept as a fallback reachable from
 * [FormStepScreen] via "Ver todas as perguntas" for users who prefer to see every question at once.
 */
@Composable
fun FormDetailScreen(
    navController: NavController,
    formId: String,
    viewModel: FormDetailViewModel = koinViewModel(parameters = { parametersOf(formId) }),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

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

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            Box(
                Modifier
                    .fillMaxWidth()
                    .background(PazGradients.Hero)
                    .statusBarsPadding(),
            ) {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Md),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    IconButton(onClick = { viewModel.onBack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "back", tint = Color.White)
                    }
                    Text(
                        uiState.form?.title ?: "Formulário",
                        style = MaterialTheme.typography.headlineMedium.copy(color = Color.White),
                        modifier = Modifier.weight(1f),
                        maxLines = 1,
                    )
                }
            }

            Box(
                Modifier
                    .fillMaxSize()
                    .clip(RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                    .background(MaterialTheme.colorScheme.background),
            ) {
                when {
                    uiState.isLoading -> LoadingState()
                    uiState.form == null ->
                        ErrorState(error = uiState.error ?: "Formulário não encontrado", onRetry = null)
                    else ->
                        FormContent(
                            uiState = uiState,
                            onFieldChanged = viewModel::onFieldChanged,
                            onSubmit = viewModel::onSubmit,
                            onOpenPicker = viewModel::openPicker,
                            onSelfOrSearchMode = viewModel::setSelfOrSearchMode,
                        )
                }
            }
        }

        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier.align(Alignment.BottomCenter).padding(PazSpacing.Lg),
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
private fun FormContent(
    uiState: FormDetailUiState,
    onFieldChanged: (String, String) -> Unit,
    onSubmit: () -> Unit,
    onOpenPicker: (FormFieldDef) -> Unit,
    onSelfOrSearchMode: (String, Boolean) -> Unit,
) {
    val form = uiState.form!!
    val fieldDefs = remember(form.type) { form.type.fieldDefs() }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(
            start = PazSpacing.Lg,
            end = PazSpacing.Lg,
            top = PazSpacing.Lg,
            bottom = PazSpacing.Xl,
        ),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Sm)) }

        if (!form.description.isNullOrEmpty()) {
            item {
                Text(
                    form.description!!,
                    style =
                        MaterialTheme.typography.bodySmall.copy(
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        ),
                )
            }
        }

        items(fieldDefs.size) { index ->
            val def = fieldDefs[index]
            val value = uiState.fields[def.key] ?: ""
            FieldRow(
                def = def,
                value = value,
                isSubmitting = uiState.isSubmitting,
                uiState = uiState,
                onValueChange = { onFieldChanged(def.key, it) },
                onOpenPicker = onOpenPicker,
                onSelfOrSearchMode = onSelfOrSearchMode,
            )
        }

        if (uiState.error != null) {
            item {
                Box(
                    Modifier
                        .fillMaxWidth()
                        .clip(PazShapes.large)
                        .background(MaterialTheme.colorScheme.errorContainer)
                        .padding(PazSpacing.Lg),
                ) {
                    Text(
                        uiState.error,
                        style =
                            MaterialTheme.typography.bodySmall.copy(
                                color = MaterialTheme.colorScheme.onErrorContainer,
                            ),
                    )
                }
            }
        }

        item { Spacer(Modifier.height(PazSpacing.Md)) }

        item {
            val canSubmit =
                !uiState.isSubmitting &&
                    fieldDefs.filter { it.required }.all { (uiState.fields[it.key] ?: "").isNotBlank() }

            PazButton(
                text = if (uiState.isSubmitting) "Enviando..." else "Enviar",
                onClick = onSubmit,
                modifier = Modifier.fillMaxWidth(),
                enabled = canSubmit,
            )
        }

        item { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}

@Composable
private fun ErrorState(
    error: String,
    onRetry: (() -> Unit)?,
) {
    if (onRetry != null) {
        PazErrorState(message = error, onRetry = onRetry)
    } else {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text(error, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun LoadingState() {
    Column(
        Modifier.fillMaxSize().padding(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
    ) {
        Spacer(Modifier.height(PazSpacing.Sm))
        repeat(3) {
            Column(verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
                PazSkeleton(height = 14.dp, width = 80.dp)
                PazSkeleton(height = 56.dp)
            }
        }
    }
}
