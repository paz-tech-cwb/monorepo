package br.church.paz.android.ui.features.lifegroupmeeting

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.outlined.Circle
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
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
import br.church.paz.android.ui.components.PazCardSkeleton
import br.church.paz.android.ui.components.PazErrorState
import br.church.paz.android.ui.components.PazGlassCard
import br.church.paz.android.ui.components.PazGlassField
import br.church.paz.android.ui.components.PazMeshBackground
import br.church.paz.android.ui.theme.PazShapePill
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.android.util.brDateString
import br.church.paz.shared.domain.model.LifeGroupAttendanceEntry
import br.church.paz.shared.domain.model.LifeGroupMeetingReportDraft
import br.church.paz.shared.domain.model.LifeGroupMeetingReportField
import br.church.paz.shared.domain.model.LifeGroupMeetingRules
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LifeGroupMeetingScreen(
    navController: NavController,
    lifeGroupId: String,
    date: String,
    // Role-based hint from the history screen: "true"/"false", "" when unknown (push deep link).
    canWrite: String = "",
    viewModel: LifeGroupMeetingViewModel =
        koinViewModel(parameters = { parametersOf(lifeGroupId.toInt(), date, canWrite) }),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                LifeGroupMeetingEffect.NavigateBack -> navController.popBackStack()
            }
        }
    }

    Box(Modifier.fillMaxSize()) {
        PazMeshBackground()

        Scaffold(
            topBar = {
                TopAppBar(
                    title = {
                        Column {
                            Text("Reunião")
                            Text(
                                brDateString(uiState.meetingDate),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                            )
                        }
                    },
                    navigationIcon = {
                        IconButton(onClick = viewModel::onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, "voltar")
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent),
                )
            },
            containerColor = Color.Transparent,
        ) { innerPadding ->
            Box(Modifier.fillMaxSize().padding(top = innerPadding.calculateTopPadding())) {
                when {
                    uiState.isLoading -> MeetingSkeleton()
                    uiState.loadError != null ->
                        if (uiState.loadErrorRetryable) {
                            PazErrorState(message = uiState.loadError.orEmpty(), onRetry = viewModel::load)
                        } else {
                            // Missing group / permission: retrying cannot help.
                            MeetingLoadFailure(message = uiState.loadError.orEmpty(), onBack = viewModel::onBack)
                        }
                    uiState.needsExtraChoice && uiState.isWriteForbidden ->
                        Column(Modifier.fillMaxSize().padding(PazSpacing.Lg)) {
                            NoticeCard(text = LifeGroupMeetingRules.noMeetingToViewMessage(), isWarning = false)
                        }
                    uiState.needsExtraChoice ->
                        ExtraChoiceContent(
                            date = uiState.meetingDate,
                            onExtraChanged = viewModel::onExtraMeetingChanged,
                        )
                    uiState.isEmptyReadOnly -> EmptyReadOnlyContent(uiState = uiState)
                    else -> MeetingContent(uiState = uiState, viewModel = viewModel)
                }
            }
        }
    }
}

/** A date nothing was recorded for, opened read-only: an empty state (with the deadline banner), not an error. */
@Composable
private fun EmptyReadOnlyContent(uiState: LifeGroupMeetingUiState) {
    val meeting = uiState.meeting
    Column(
        modifier = Modifier.fillMaxSize().padding(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        if (meeting != null) ReadOnlyBanner(uiState = uiState, editDeadline = meeting.editDeadline)
        NoticeCard(text = LifeGroupMeetingRules.noMeetingToViewMessage(), isWarning = false)
    }
}

@Composable
private fun MeetingLoadFailure(
    message: String,
    onBack: () -> Unit,
) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            modifier = Modifier.padding(PazSpacing.Xl),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
        ) {
            Text(message, style = MaterialTheme.typography.bodyMedium)
            PazButton(text = "Voltar", onClick = onBack, modifier = Modifier.fillMaxWidth())
        }
    }
}

/** Why the meeting cannot be edited (supervisor / closed window), or the "edit until" hint while it can. */
@Composable
private fun ReadOnlyBanner(
    uiState: LifeGroupMeetingUiState,
    editDeadline: String,
) {
    if (uiState.isWriteForbidden) {
        NoticeCard(text = LifeGroupMeetingRules.writeForbiddenMessage(), isWarning = false)
    } else if (uiState.isReadOnly) {
        NoticeCard(text = LifeGroupMeetingRules.readOnlyMessage(editDeadline), isWarning = true)
    } else if (editDeadline.isNotBlank()) {
        Text(
            LifeGroupMeetingRules.editableUntilMessage(editDeadline),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
        )
    }
}

@Composable
private fun MeetingContent(
    uiState: LifeGroupMeetingUiState,
    viewModel: LifeGroupMeetingViewModel,
) {
    val meeting = uiState.meeting
    val readOnly = uiState.isReadOnly
    LazyColumn(
        modifier = Modifier.fillMaxSize().imePadding(),
        contentPadding = PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        if (uiState.draftRestored) {
            item {
                NoticeCard(
                    text = "Rascunho restaurado: suas alterações não salvas foram recuperadas.",
                    actionLabel = "OK",
                    onAction = viewModel::onDismissDraftBanner,
                )
            }
        }
        if (meeting != null) {
            item { ReadOnlyBanner(uiState = uiState, editDeadline = meeting.editDeadline) }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
                    StatusPill(
                        text =
                            when {
                                uiState.isAttendanceSaved -> "Presença salva"
                                readOnly -> "Sem presença"
                                else -> "Presença pendente"
                            },
                        done = uiState.isAttendanceSaved,
                    )
                    StatusPill(
                        text =
                            when {
                                uiState.isReportSaved -> "Relatório enviado"
                                readOnly -> "Sem relatório"
                                else -> "Relatório pendente"
                            },
                        done = uiState.isReportSaved,
                    )
                    if (uiState.meeting?.attendance?.isExtra == true || (uiState.isExtra && uiState.showExtraToggle)) {
                        StatusPill(text = "Reunião extra", done = true)
                    }
                }
            }
        }
        if (uiState.showExtraToggle && meeting != null) {
            item {
                SwitchRow(
                    title = "Reunião extra",
                    subtitle = "Esta data não é o dia regular do grupo.",
                    checked = uiState.isExtra,
                    enabled = !uiState.isExtraLocked && !readOnly && !uiState.isBusy,
                    onCheckedChange = viewModel::onExtraMeetingChanged,
                )
            }
        }

        // ---- Presença ------------------------------------------------------------------
        item { SectionTitle("Presença") }
        if (uiState.showAttendanceRoster) {
            item {
                AttendanceHeader(uiState = uiState, onAllPresentChanged = viewModel::onAllPresentChanged)
            }
        }
        if (!uiState.showAttendanceRoster) {
            item {
                Text(
                    // Legacy report without presence, or a read-only date: never list a pre-filled roster.
                    "Sem presença registrada para esta data.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                )
            }
        } else if (uiState.entries.isEmpty()) {
            item {
                Text(
                    "Este grupo ainda não tem membros para lançar presença.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                )
            }
        } else {
            items(uiState.entries, key = { it.userId }) { entry ->
                MemberRow(entry = entry, enabled = !readOnly && !uiState.isBusy, onToggle = { viewModel.onTogglePresent(entry.userId) })
            }
        }
        item {
            SaveBlock(
                error = uiState.attendanceError,
                notice = uiState.attendanceNotice,
                buttonText = if (uiState.isAttendanceSaved && !uiState.attendanceDirty) "Presença salva" else "Salvar presença",
                visible = !readOnly && meeting?.attendance != null,
                enabled = uiState.canSaveAttendance,
                loading = uiState.isSavingAttendance,
                onClick = viewModel::onSaveAttendance,
            )
        }

        // ---- Relatório -----------------------------------------------------------------
        item { SectionTitle("Relatório") }
        item { ReportSection(uiState = uiState, viewModel = viewModel) }

        item { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}

@Composable
private fun AttendanceHeader(
    uiState: LifeGroupMeetingUiState,
    onAllPresentChanged: (Boolean) -> Unit,
) {
    val attendance = uiState.meeting?.attendance
    Column(verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
        if (uiState.entries.isNotEmpty()) {
            Text(
                LifeGroupMeetingRules.presenceSummary(uiState.entries),
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.primary,
            )
            if (!uiState.isWriteForbidden) {
                SwitchRow(
                    title = "Todos presentes",
                    subtitle =
                        if (attendance?.isDraft == true && attendance.defaultPresent == true) {
                            "Todos começam presentes. Desmarque quem faltou."
                        } else {
                            null
                        },
                    checked = LifeGroupMeetingRules.allPresent(uiState.entries),
                    enabled = !uiState.isReadOnly && !uiState.isBusy,
                    onCheckedChange = onAllPresentChanged,
                )
            }
        }
    }
}

@Composable
private fun ReportSection(
    uiState: LifeGroupMeetingUiState,
    viewModel: LifeGroupMeetingViewModel,
) {
    val enabled = uiState.canEditReport && !uiState.isBusy
    val draft = uiState.reportDraft
    val errors = uiState.reportErrors
    fun change(update: (LifeGroupMeetingReportDraft) -> LifeGroupMeetingReportDraft) = viewModel.onReportChanged(update(draft))

    Column(verticalArrangement = Arrangement.spacedBy(PazSpacing.Md)) {
        uiState.reportLockedMessage?.let { NoticeCard(text = it, isWarning = uiState.reportBlockedReason != null) }

        if (uiState.isReadOnly && !uiState.isReportSaved) {
            Text(
                "Nenhum relatório foi enviado para esta reunião.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
            )
        } else {
            PazGlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(PazSpacing.Lg), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text("Comprometidos: ${uiState.committedMembers}", style = MaterialTheme.typography.titleSmall)
                    Text("Presentes: ${uiState.committedMembersPresent}", style = MaterialTheme.typography.titleSmall)
                    Text(
                        if (uiState.attendanceDirty) {
                            "Calculado da presença. Será atualizado quando você salvar a presença."
                        } else {
                            "Calculado da presença; não é preenchido à mão."
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                    )
                }
            }

            CountField("Crianças (0 a 11 anos)", draft.kids0To11, errors[LifeGroupMeetingReportField.KIDS_0_TO_11], enabled) {
                change { d -> d.copy(kids0To11 = it) }
            }
            CountField("Convidados", draft.guests, errors[LifeGroupMeetingReportField.GUESTS], enabled) {
                change { d -> d.copy(guests = it) }
            }
            CountField("MDAs", draft.mdas, errors[LifeGroupMeetingReportField.MDAS], enabled) {
                change { d -> d.copy(mdas = it) }
            }
            ReportTextField(
                label = "Oferta (R$)",
                value = draft.offering,
                error = errors[LifeGroupMeetingReportField.OFFERING],
                enabled = enabled,
                keyboardType = KeyboardType.Decimal,
                placeholder = "0,00",
            ) { change { d -> d.copy(offering = it) } }
            CountField("Comprometidos no Tadel", draft.committedAtTadel, errors[LifeGroupMeetingReportField.COMMITTED_AT_TADEL], enabled) {
                change { d -> d.copy(committedAtTadel = it) }
            }
            CountField("Comprometidos no culto", draft.committedAtCulto, errors[LifeGroupMeetingReportField.COMMITTED_AT_CULTO], enabled) {
                change { d -> d.copy(committedAtCulto = it) }
            }

            Text("Líder presente em", style = MaterialTheme.typography.titleSmall)
            Row(horizontalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
                LifeGroupMeetingRules.leaderAttendedOptions.forEach { option ->
                    FilterChip(
                        selected = LifeGroupMeetingRules.hasValue(draft.leaderAttended, option.value),
                        onClick = {
                            change { d -> d.copy(leaderAttended = LifeGroupMeetingRules.toggleValue(d.leaderAttended, option.value)) }
                        },
                        label = { Text(option.label) },
                        enabled = enabled,
                    )
                }
            }
            ReportTextField(
                label = "Líder presente em (separe por vírgula)",
                value = draft.leaderAttended,
                error = errors[LifeGroupMeetingReportField.LEADER_ATTENDED],
                enabled = enabled,
            ) { change { d -> d.copy(leaderAttended = it) } }

            CountField("Discípulos", draft.disciplesCount, errors[LifeGroupMeetingReportField.DISCIPLES_COUNT], enabled) {
                change { d -> d.copy(disciplesCount = it) }
            }
            CountField(
                "Discípulos discipulados na semana",
                draft.disciplesDiscipledThisWeek,
                errors[LifeGroupMeetingReportField.DISCIPLES_DISCIPLED_THIS_WEEK],
                enabled,
            ) { change { d -> d.copy(disciplesDiscipledThisWeek = it) } }

            ReportTextField(
                label = "Atividades de pastoreio (separe por vírgula)",
                value = draft.pastoringActivityType,
                error = errors[LifeGroupMeetingReportField.PASTORING_ACTIVITY_TYPE],
                enabled = enabled,
                placeholder = "Ex.: visita, ligação",
            ) { change { d -> d.copy(pastoringActivityType = it) } }
            ReportTextField(
                label = "Outra atividade de pastoreio",
                value = draft.pastoringActivityOther,
                error = errors[LifeGroupMeetingReportField.PASTORING_ACTIVITY_OTHER],
                enabled = enabled,
            ) { change { d -> d.copy(pastoringActivityOther = it) } }
            ReportTextField(
                label = "Atividades de treinamento (separe por vírgula)",
                value = draft.trainingActivityType,
                error = errors[LifeGroupMeetingReportField.TRAINING_ACTIVITY_TYPE],
                enabled = enabled,
            ) { change { d -> d.copy(trainingActivityType = it) } }
            ReportTextField(
                label = "Outra atividade de treinamento",
                value = draft.trainingActivityOther,
                error = errors[LifeGroupMeetingReportField.TRAINING_ACTIVITY_OTHER],
                enabled = enabled,
            ) { change { d -> d.copy(trainingActivityOther = it) } }

            SaveBlock(
                error = uiState.reportError,
                notice = uiState.reportNotice,
                buttonText = if (uiState.isReportSaved && !uiState.reportDirty) "Relatório salvo" else "Salvar relatório",
                visible = !uiState.isReadOnly && uiState.reportBlockedReason == null,
                enabled = uiState.canSaveReport,
                loading = uiState.isSavingReport,
                onClick = viewModel::onSaveReport,
            )
        }
    }
}

@Composable
private fun CountField(
    label: String,
    value: String,
    error: String?,
    enabled: Boolean,
    onChange: (String) -> Unit,
) {
    ReportTextField(
        label = label,
        value = value,
        error = error,
        enabled = enabled,
        keyboardType = KeyboardType.Number,
        placeholder = "0",
    ) { onChange(it.filter { c -> c.isDigit() }) }
}

@Composable
private fun ReportTextField(
    label: String,
    value: String,
    error: String?,
    enabled: Boolean,
    keyboardType: KeyboardType = KeyboardType.Text,
    placeholder: String? = null,
    onChange: (String) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        PazGlassField(
            value = value,
            onValueChange = onChange,
            label = label,
            placeholder = placeholder,
            enabled = enabled,
            keyboardType = keyboardType,
        )
        if (error != null) {
            Text(error, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
        }
    }
}

@Composable
private fun SaveBlock(
    error: String?,
    notice: String?,
    buttonText: String,
    visible: Boolean,
    enabled: Boolean,
    loading: Boolean,
    onClick: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
        if (error != null) {
            Text(error, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
        }
        if (notice != null) {
            Text(notice, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
        }
        if (visible) {
            PazButton(
                text = buttonText,
                onClick = onClick,
                enabled = enabled,
                loading = loading,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
private fun ExtraChoiceContent(
    date: String,
    onExtraChanged: (Boolean) -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxSize().padding(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        NoticeCard(
            text =
                "${brDateString(date)} não é o dia regular de reunião deste grupo. " +
                    "Para registrar uma reunião em outro dia, marque \"Reunião extra\".",
            isWarning = true,
        )
        SwitchRow(
            title = "Reunião extra",
            subtitle = "Registra presença e relatório desta data como reunião extra.",
            checked = false,
            enabled = true,
            onCheckedChange = onExtraChanged,
        )
    }
}

@Composable
private fun SectionTitle(text: String) {
    Text(text, style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = PazSpacing.Sm))
}

@Composable
private fun StatusPill(
    text: String,
    done: Boolean,
) {
    val container =
        if (done) MaterialTheme.colorScheme.primary.copy(alpha = 0.15f) else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f)
    val content = if (done) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
    Surface(shape = PazShapePill, color = container) {
        Text(
            text,
            style = MaterialTheme.typography.labelMedium,
            color = content,
            modifier = Modifier.padding(horizontal = PazSpacing.Md, vertical = PazSpacing.Xs),
        )
    }
}

@Composable
private fun SwitchRow(
    title: String,
    subtitle: String?,
    checked: Boolean,
    enabled: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    PazGlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Md),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
        ) {
            Column(Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleSmall)
                if (subtitle != null) {
                    Text(
                        subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                    )
                }
            }
            Switch(checked = checked, onCheckedChange = onCheckedChange, enabled = enabled)
        }
    }
}

@Composable
private fun NoticeCard(
    text: String,
    isWarning: Boolean = false,
    actionLabel: String? = null,
    onAction: () -> Unit = {},
) {
    val container =
        if (isWarning) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)
    Row(
        modifier = Modifier.fillMaxWidth().clip(PazShapes.large).background(container).padding(PazSpacing.Md),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(PazSpacing.Sm),
    ) {
        Text(text, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
        if (actionLabel != null) {
            TextButton(onClick = onAction) { Text(actionLabel) }
        }
    }
}

@Composable
private fun MemberRow(
    entry: LifeGroupAttendanceEntry,
    enabled: Boolean,
    onToggle: () -> Unit,
) {
    Row(
        modifier =
            Modifier
                .fillMaxWidth()
                .clip(PazShapes.large)
                .background(MaterialTheme.colorScheme.surface)
                .clickable(enabled = enabled, onClick = onToggle)
                .padding(horizontal = PazSpacing.Md, vertical = PazSpacing.Sm),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        Icon(
            imageVector = if (entry.present) Icons.Filled.CheckCircle else Icons.Outlined.Circle,
            contentDescription = null,
            tint = if (entry.present) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f),
        )
        Text(entry.name, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
        Checkbox(checked = entry.present, onCheckedChange = { onToggle() }, enabled = enabled)
    }
}

@Composable
private fun MeetingSkeleton() {
    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
        modifier = Modifier.fillMaxSize().padding(PazSpacing.Lg),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Sm)) }
        repeat(6) { item { PazCardSkeleton() } }
    }
}
