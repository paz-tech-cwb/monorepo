package br.church.paz.android.ui.features.formularios

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf

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
            // Hero header
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
                    .clip(androidx.compose.foundation.shape.RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                    .background(MaterialTheme.colorScheme.background),
            ) {
                when {
                    uiState.isLoading -> LoadingState()
                    uiState.form == null -> ErrorState(
                        error = uiState.error ?: "Formulário não encontrado",
                        onRetry = null,
                    )
                    else -> FormContent(
                        uiState = uiState,
                        onFieldChanged = viewModel::onFieldChanged,
                        onSubmit = viewModel::onSubmit,
                    )
                }
            }
        }

        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(PazSpacing.Lg),
        )
    }
}

@Composable
private fun FormContent(
    uiState: FormDetailUiState,
    onFieldChanged: (String, String) -> Unit,
    onSubmit: () -> Unit,
) {
    val form = uiState.form!!
    val fieldDefs = remember(form.type) { form.type.fieldDefs() }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Sm)) }

        if (!form.description.isNullOrEmpty()) {
            item {
                Text(
                    form.description!!,
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                    ),
                )
            }
        }

        items(fieldDefs.size) { index ->
            val def = fieldDefs[index]
            val value = uiState.fields[def.key] ?: ""
            Column {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(PazSpacing.Xs),
                ) {
                    Text(def.label, style = MaterialTheme.typography.labelMedium)
                    if (def.required) {
                        Text("*", style = MaterialTheme.typography.labelMedium.copy(color = PazColors.Error))
                    }
                }
                Spacer(Modifier.height(PazSpacing.Sm))
                OutlinedTextField(
                    value = value,
                    onValueChange = { onFieldChanged(def.key, it) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .then(if (def.isMultiline) Modifier.height(120.dp) else Modifier),
                    placeholder = { Text(def.placeholder) },
                    singleLine = !def.isMultiline,
                    enabled = !uiState.isSubmitting,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = if (def.isNumeric) KeyboardType.Decimal else KeyboardType.Text,
                    ),
                    shape = PazShapes.large,
                )
            }
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
                        style = MaterialTheme.typography.bodySmall.copy(
                            color = MaterialTheme.colorScheme.onErrorContainer,
                        ),
                    )
                }
            }
        }

        item { Spacer(Modifier.height(PazSpacing.Md)) }

        item {
            val canSubmit = !uiState.isSubmitting && form.type.fieldDefs()
                .filter { it.required }
                .all { (uiState.fields[it.key] ?: "").isNotBlank() }

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
private fun ErrorState(error: String, onRetry: (() -> Unit)?) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            Modifier.padding(PazSpacing.Xl),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
        ) {
            Text(error, style = MaterialTheme.typography.bodySmall)
            if (onRetry != null) {
                Spacer(Modifier.height(PazSpacing.Lg))
                PazButton(text = "Tentar Novamente", onClick = onRetry, modifier = Modifier.fillMaxWidth())
            }
        }
    }
}

@Composable
private fun LoadingState() {
    Column(
        Modifier
            .fillMaxSize()
            .padding(PazSpacing.Lg),
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
