package br.church.paz.android.ui.features.lifegroupreports

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LargeTopAppBar
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SelectableDates
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.components.PazErrorState
import br.church.paz.android.ui.components.PazMeshBackground
import br.church.paz.android.ui.components.PazSuccessState
import br.church.paz.android.ui.features.formularios.PickerField
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.LifeGroup
import br.church.paz.shared.domain.model.LifeGroupReportField
import br.church.paz.shared.domain.model.LifeGroupReportRules
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf
import java.time.LocalDate
import java.time.ZoneOffset

/**
 * Weekly life-group report submit form. Opened from the Formulários list (group picker limited to
 * the groups the viewer leads/co-leads) or from a group's detail (`lifeGroupId` preselects it).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LifeGroupReportFormScreen(
    navController: NavController,
    lifeGroupId: String? = null,
    viewModel: LifeGroupReportFormViewModel =
        koinViewModel(parameters = { parametersOf(lifeGroupId?.toIntOrNull()) }),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                LifeGroupReportFormEffect.NavigateBack -> navController.popBackStack()
            }
        }
    }

    Box(Modifier.fillMaxSize()) {
        PazMeshBackground()

        Scaffold(
            topBar = {
                LargeTopAppBar(
                    title = { Text("Relatório semanal", maxLines = 1) },
                    navigationIcon = {
                        IconButton(onClick = viewModel::onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, "voltar")
                        }
                    },
                    colors = TopAppBarDefaults.largeTopAppBarColors(containerColor = Color.Transparent),
                )
            },
            containerColor = Color.Transparent,
        ) { innerPadding ->
            Box(Modifier.fillMaxSize().padding(top = innerPadding.calculateTopPadding())) {
                when {
                    uiState.isLoading -> ReportsSkeleton()
                    uiState.loadError != null ->
                        PazErrorState(message = uiState.loadError!!, onRetry = viewModel::load)
                    uiState.isSubmitted ->
                        PazSuccessState(
                            onDone = viewModel::onBack,
                            title = "Relatório enviado!",
                            message = "O relatório semanal foi registrado.",
                        )
                    uiState.noGroupsMessage != null -> ReportsMessage(uiState.noGroupsMessage!!)
                    else ->
                        ReportForm(
                            uiState = uiState,
                            onGroupSelected = viewModel::onGroupSelected,
                            onDateChanged = viewModel::onDateChanged,
                            onFieldChanged = viewModel::onFieldChanged,
                            onSubmit = viewModel::onSubmit,
                        )
                }
            }
        }
    }
}

@Composable
private fun ReportForm(
    uiState: LifeGroupReportFormUiState,
    onGroupSelected: (Int) -> Unit,
    onDateChanged: (String) -> Unit,
    onFieldChanged: (LifeGroupReportField, String) -> Unit,
    onSubmit: () -> Unit,
) {
    val draft = uiState.draft
    val errors = uiState.fieldErrors
    val enabled = !uiState.isSubmitting

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = PazSpacing.Lg, end = PazSpacing.Lg, top = PazSpacing.Lg, bottom = PazSpacing.Xl),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
    ) {
        item { SectionTitle("Reunião") }
        item {
            GroupField(
                groups = uiState.groups,
                selected = uiState.selectedGroup,
                canChoose = uiState.canChooseGroup,
                enabled = enabled,
                error = errors[LifeGroupReportField.LIFE_GROUP],
                onSelected = onGroupSelected,
            )
        }
        item {
            ReportDateField(
                isoDate = draft.date,
                today = uiState.today,
                enabled = enabled,
                error = errors[LifeGroupReportField.DATE],
                onDateChange = onDateChanged,
            )
        }

        item { SectionTitle("Presença") }
        item { CountField(LifeGroupReportField.COMMITTED_MEMBERS, "Comprometidos", draft.committedMembers, errors, enabled, onFieldChanged) }
        item {
            CountField(LifeGroupReportField.COMMITTED_MEMBERS_PRESENT, "Comprometidos presentes", draft.committedMembersPresent, errors, enabled, onFieldChanged)
        }
        item { CountField(LifeGroupReportField.KIDS_0_TO_11, "Crianças (0 a 11 anos)", draft.kids0To11, errors, enabled, onFieldChanged) }
        item { CountField(LifeGroupReportField.GUESTS, "Convidados", draft.guests, errors, enabled, onFieldChanged) }
        item { CountField(LifeGroupReportField.MDAS, "MDAs", draft.mdas, errors, enabled, onFieldChanged) }
        item { CountField(LifeGroupReportField.COMMITTED_AT_TADEL, "Comprometidos no Tadel", draft.committedAtTadel, errors, enabled, onFieldChanged) }
        item { CountField(LifeGroupReportField.COMMITTED_AT_CULTO, "Comprometidos no culto", draft.committedAtCulto, errors, enabled, onFieldChanged) }
        item {
            MultiValueField(
                LifeGroupReportField.LEADER_ATTENDED,
                "Líder presente em",
                draft.leaderAttended,
                errors,
                enabled,
                onFieldChanged,
            )
        }

        item { SectionTitle("Oferta") }
        item {
            ReportTextField(
                label = "Oferta (R$)",
                value = draft.offering,
                onValueChange = {
                    onFieldChanged(LifeGroupReportField.OFFERING, it.filter { c -> c.isDigit() || c == ',' || c == '.' }.take(14))
                },
                error = errors[LifeGroupReportField.OFFERING],
                enabled = enabled,
                keyboardType = KeyboardType.Decimal,
                placeholder = "0,00",
            )
        }

        item { SectionTitle("Discipulado") }
        item { CountField(LifeGroupReportField.DISCIPLES_COUNT, "Discípulos", draft.disciplesCount, errors, enabled, onFieldChanged) }
        item {
            CountField(
                LifeGroupReportField.DISCIPLES_DISCIPLED_THIS_WEEK,
                "Discipulados nesta semana",
                draft.disciplesDiscipledThisWeek,
                errors,
                enabled,
                onFieldChanged,
            )
        }

        item { SectionTitle("Pastoreio e treinamento") }
        item {
            MultiValueField(
                LifeGroupReportField.PASTORING_ACTIVITY_TYPE,
                "Atividades de pastoreio",
                draft.pastoringActivityType,
                errors,
                enabled,
                onFieldChanged,
            )
        }
        item {
            OtherField(LifeGroupReportField.PASTORING_ACTIVITY_OTHER, "Outra atividade de pastoreio", draft.pastoringActivityOther, errors, enabled, onFieldChanged)
        }
        item {
            MultiValueField(
                LifeGroupReportField.TRAINING_ACTIVITY_TYPE,
                "Atividades de treinamento",
                draft.trainingActivityType,
                errors,
                enabled,
                onFieldChanged,
            )
        }
        item {
            OtherField(LifeGroupReportField.TRAINING_ACTIVITY_OTHER, "Outra atividade de treinamento", draft.trainingActivityOther, errors, enabled, onFieldChanged)
        }

        if (errors.isNotEmpty() && uiState.submitError == null) {
            item { ErrorBanner("Corrija os campos destacados para enviar.") }
        }
        uiState.submitError?.let { message -> item { ErrorBanner(message) } }

        item {
            PazButton(
                text = if (uiState.isSubmitting) "Enviando..." else "Enviar relatório",
                onClick = onSubmit,
                modifier = Modifier.fillMaxWidth(),
                enabled = enabled,
            )
        }
        item { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}

@Composable
private fun CountField(
    field: LifeGroupReportField,
    label: String,
    value: String,
    errors: Map<LifeGroupReportField, String>,
    enabled: Boolean,
    onFieldChanged: (LifeGroupReportField, String) -> Unit,
) {
    ReportTextField(
        label = label,
        value = value,
        onValueChange = { onFieldChanged(field, it.filter { c -> c.isDigit() }.take(6)) },
        error = errors[field],
        enabled = enabled,
        keyboardType = KeyboardType.Number,
        placeholder = "0",
    )
}

@Composable
private fun MultiValueField(
    field: LifeGroupReportField,
    label: String,
    value: String,
    errors: Map<LifeGroupReportField, String>,
    enabled: Boolean,
    onFieldChanged: (LifeGroupReportField, String) -> Unit,
) {
    ReportTextField(
        label = label,
        value = value,
        onValueChange = { onFieldChanged(field, it) },
        error = errors[field],
        enabled = enabled,
        keyboardType = KeyboardType.Text,
        hint = "Separe por vírgula",
    )
}

@Composable
private fun OtherField(
    field: LifeGroupReportField,
    label: String,
    value: String,
    errors: Map<LifeGroupReportField, String>,
    enabled: Boolean,
    onFieldChanged: (LifeGroupReportField, String) -> Unit,
) {
    ReportTextField(
        label = label,
        value = value,
        onValueChange = { onFieldChanged(field, it) },
        error = errors[field],
        enabled = enabled,
        keyboardType = KeyboardType.Text,
    )
}

@Composable
private fun SectionTitle(text: String) {
    Text(text, style = MaterialTheme.typography.titleSmall)
}

@Composable
private fun ErrorBanner(message: String) {
    Box(
        Modifier
            .fillMaxWidth()
            .clip(PazShapes.large)
            .background(MaterialTheme.colorScheme.errorContainer)
            .padding(PazSpacing.Lg),
    ) {
        Text(
            message,
            style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onErrorContainer),
        )
    }
}

@Composable
private fun FieldLabel(text: String) {
    Text(text, style = MaterialTheme.typography.labelMedium)
    Spacer(Modifier.height(PazSpacing.Sm))
}

@Composable
private fun ReportTextField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    error: String?,
    enabled: Boolean,
    keyboardType: KeyboardType,
    placeholder: String = "",
    hint: String? = null,
    singleLine: Boolean = true,
) {
    val supporting = error ?: hint
    Column {
        FieldLabel(label)
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth(),
            placeholder = if (placeholder.isNotEmpty()) { { Text(placeholder) } } else null,
            singleLine = singleLine,
            enabled = enabled,
            isError = error != null,
            supportingText = if (supporting != null) { { Text(supporting) } } else null,
            keyboardOptions =
                KeyboardOptions(
                    keyboardType = keyboardType,
                    capitalization = if (keyboardType == KeyboardType.Text) KeyboardCapitalization.Sentences else KeyboardCapitalization.None,
                    imeAction = ImeAction.Next,
                ),
            shape = PazShapes.large,
        )
    }
}

@Composable
private fun GroupField(
    groups: List<LifeGroup>,
    selected: LifeGroup?,
    canChoose: Boolean,
    enabled: Boolean,
    error: String?,
    onSelected: (Int) -> Unit,
) {
    // Same-named groups get their id appended so each option stays distinguishable.
    val labels =
        groups.map { group ->
            if (groups.count { it.name == group.name } > 1) "${group.name} (#${group.id})" else group.name
        }
    val selectedLabel = selected?.let { labels[groups.indexOf(it)] } ?: ""

    Column {
        FieldLabel("Life Group")
        if (canChoose) {
            PickerField(
                value = selectedLabel,
                options = labels,
                enabled = enabled,
                onValueChange = { label ->
                    val index = labels.indexOf(label)
                    if (index >= 0) onSelected(groups[index].id)
                },
            )
        } else {
            OutlinedTextField(
                value = selectedLabel,
                onValueChange = {},
                modifier = Modifier.fillMaxWidth(),
                readOnly = true,
                enabled = false,
                singleLine = true,
                shape = PazShapes.large,
            )
        }
        if (error != null) {
            Text(
                error,
                style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.error),
                modifier = Modifier.padding(top = PazSpacing.Xs),
            )
        }
    }
}

/**
 * Date input limited to today (church day) or earlier. The Material date picker works in UTC
 * milliseconds, so the picked day is read back in UTC (no local-timezone shift) as ISO.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ReportDateField(
    isoDate: String,
    today: String,
    enabled: Boolean,
    error: String?,
    onDateChange: (String) -> Unit,
) {
    var showDialog by remember { mutableStateOf(false) }
    val todayMillis = remember(today) { isoToUtcMillis(today) }
    val selectableDates =
        remember(todayMillis) {
            object : SelectableDates {
                override fun isSelectableDate(utcTimeMillis: Long): Boolean = todayMillis == null || utcTimeMillis <= todayMillis

                override fun isSelectableYear(year: Int): Boolean = true
            }
        }
    val pickerState =
        rememberDatePickerState(
            initialSelectedDateMillis = isoToUtcMillis(isoDate) ?: todayMillis,
            selectableDates = selectableDates,
        )

    Column {
        FieldLabel("Data da reunião")
        OutlinedTextField(
            value = LifeGroupReportRules.displayDate(isoDate),
            onValueChange = {},
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("DD/MM/AAAA") },
            singleLine = true,
            enabled = enabled,
            readOnly = true,
            isError = error != null,
            supportingText = if (error != null) { { Text(error) } } else null,
            trailingIcon = {
                IconButton(onClick = { if (enabled) showDialog = true }) {
                    Icon(Icons.Default.CalendarMonth, contentDescription = "Selecionar data")
                }
            },
            shape = PazShapes.large,
        )
    }

    if (showDialog) {
        DatePickerDialog(
            onDismissRequest = { showDialog = false },
            confirmButton = {
                TextButton(
                    onClick = {
                        pickerState.selectedDateMillis?.let { millis ->
                            onDateChange(java.time.Instant.ofEpochMilli(millis).atZone(ZoneOffset.UTC).toLocalDate().toString())
                        }
                        showDialog = false
                    },
                ) { Text("OK") }
            },
            dismissButton = { TextButton(onClick = { showDialog = false }) { Text("Cancelar") } },
        ) {
            DatePicker(state = pickerState)
        }
    }
}

private fun isoToUtcMillis(iso: String): Long? =
    runCatching { LocalDate.parse(iso).atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli() }.getOrNull()
