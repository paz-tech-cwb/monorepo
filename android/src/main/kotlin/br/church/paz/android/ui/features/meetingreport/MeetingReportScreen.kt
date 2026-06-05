package br.church.paz.android.ui.features.meetingreport

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
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import org.koin.androidx.compose.koinViewModel

@Composable
fun MeetingReportScreen(
    navController: NavController,
    viewModel: MeetingReportViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                MeetingReportEffect.SubmitSuccess -> {
                    navController.popBackStack()
                }
                MeetingReportEffect.NavigateBack -> navController.popBackStack()
            }
        }
    }

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
                    "Relatório da Reunião",
                    style = MaterialTheme.typography.headlineMedium.copy(color = Color.White),
                    modifier = Modifier.weight(1f),
                )
            }
        }

        Box(
            Modifier
                .fillMaxSize()
                .clip(
                    androidx.compose.foundation.shape
                        .RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
                ).background(MaterialTheme.colorScheme.background),
        ) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
                contentPadding =
                    androidx.compose.foundation.layout
                        .PaddingValues(PazSpacing.Lg),
            ) {
                item { Spacer(Modifier.height(PazSpacing.Sm)) }

                item {
                    FormField(
                        label = "Data da Reunião",
                        value = uiState.date,
                        onValueChange = viewModel::onDateChanged,
                        placeholder = "DD/MM/YYYY",
                        enabled = !uiState.isSubmitting,
                    )
                }

                item {
                    FormField(
                        label = "Participantes",
                        value = uiState.attendees,
                        onValueChange = viewModel::onAttendeesChanged,
                        placeholder = "0",
                        keyboardType = KeyboardType.Number,
                        enabled = !uiState.isSubmitting,
                    )
                }

                item {
                    FormField(
                        label = "Visitantes",
                        value = uiState.visitors,
                        onValueChange = viewModel::onVisitorsChanged,
                        placeholder = "0",
                        keyboardType = KeyboardType.Number,
                        enabled = !uiState.isSubmitting,
                    )
                }

                item {
                    FormField(
                        label = "Ofertas (R$)",
                        value = uiState.offerings,
                        onValueChange = viewModel::onOfferingsChanged,
                        placeholder = "0,00",
                        keyboardType = KeyboardType.Decimal,
                        enabled = !uiState.isSubmitting,
                    )
                }

                item {
                    FormField(
                        label = "Observações",
                        value = uiState.observations,
                        onValueChange = viewModel::onObservationsChanged,
                        placeholder = "Algo importante para compartilhar?",
                        enabled = !uiState.isSubmitting,
                        singleLine = false,
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
                                uiState.error!!,
                                style =
                                    MaterialTheme.typography.bodySmall.copy(
                                        color = MaterialTheme.colorScheme.onErrorContainer,
                                    ),
                            )
                        }
                    }
                }

                item {
                    Column(Modifier.padding(horizontal = 0.dp)) {
                        PazButton(
                            text = if (uiState.isSubmitting) "Enviando..." else "Enviar Relatório",
                            onClick = viewModel::onSubmit,
                            modifier = Modifier.fillMaxWidth(),
                            enabled = !uiState.isSubmitting && uiState.date.isNotBlank() && uiState.attendees.isNotBlank(),
                        )
                    }
                }

                item { Spacer(Modifier.height(PazSpacing.Xl)) }
            }
        }
    }
}

@Composable
private fun FormField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String = "",
    keyboardType: KeyboardType = KeyboardType.Text,
    enabled: Boolean = true,
    singleLine: Boolean = true,
) {
    Column {
        Text(label, style = MaterialTheme.typography.labelMedium)
        Spacer(Modifier.height(PazSpacing.Sm))
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            modifier =
                Modifier
                    .fillMaxWidth()
                    .then(if (singleLine) Modifier else Modifier.height(120.dp)),
            enabled = enabled,
            placeholder = { Text(placeholder) },
            singleLine = singleLine,
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
            shape = PazShapes.large,
        )
    }
}
