package br.church.paz.android.ui.features.lifegrouptasks

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.components.PazCardSkeleton
import br.church.paz.android.ui.components.PazErrorState
import br.church.paz.android.ui.components.PazGlassCard
import br.church.paz.android.ui.components.PazMeshBackground
import br.church.paz.android.ui.components.PazPullToRefresh
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.LifeGroupTaskEligibilitySource
import br.church.paz.shared.domain.model.LifeGroupTaskTemplateSummary
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf

/** Leader/co-leader only: reached from the life group detail screen, which gates the entry point. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LifeGroupTaskMembersScreen(
    navController: NavController,
    lifeGroupId: String,
    viewModel: LifeGroupTaskMembersViewModel =
        koinViewModel(parameters = { parametersOf(lifeGroupId.toInt()) }),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                LifeGroupTaskMembersEffect.NavigateBack -> navController.popBackStack()
            }
        }
    }

    Box(Modifier.fillMaxSize()) {
        PazMeshBackground()

        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("Elegibilidade para tarefas", maxLines = 1) },
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
            PazPullToRefresh(
                isRefreshing = uiState.isRefreshing,
                onRefresh = viewModel::refresh,
                modifier = Modifier.fillMaxSize().padding(top = innerPadding.calculateTopPadding()),
            ) {
                when {
                    uiState.isLoading -> MembersSkeleton()
                    uiState.error != null -> PazErrorState(message = uiState.error!!, onRetry = viewModel::load)
                    else -> MembersContent(uiState = uiState, viewModel = viewModel)
                }
            }
        }
    }
}

@Composable
private fun MembersContent(
    uiState: LifeGroupTaskMembersUiState,
    viewModel: LifeGroupTaskMembersViewModel,
) {
    Column(Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(PazSpacing.Lg),
            verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
        ) {
            item {
                Text(
                    "Defina quem participa do rodízio de tarefas das reuniões. A observação é visível apenas para a liderança.",
                    style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)),
                )
            }
            item {
                SettingsCard(
                    minPresentMeetings = uiState.minPresentMeetings,
                    onChange = viewModel::onMinPresentMeetingsChanged,
                )
            }
            if (uiState.drafts.isEmpty()) {
                item {
                    Text(
                        "Este grupo ainda não tem membros.",
                        style = MaterialTheme.typography.bodyMedium.copy(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)),
                    )
                }
            }
            items(uiState.drafts, key = { it.member.userId }) { draft ->
                MemberCard(
                    draft = draft,
                    templates = uiState.templates,
                    viewModel = viewModel,
                )
            }
            item { Spacer(Modifier.height(PazSpacing.Md)) }
        }

        Column(Modifier.padding(PazSpacing.Lg), verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
            uiState.saveError?.let {
                Text(it, style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.error))
            }
            uiState.savedMessage?.let {
                Text(it, style = MaterialTheme.typography.bodySmall.copy(color = PazColors.Success))
            }
            PazButton(
                text = "Salvar",
                onClick = viewModel::onSave,
                enabled = uiState.hasChanges && !uiState.isSaving,
                loading = uiState.isSaving,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
private fun SettingsCard(
    minPresentMeetings: Int,
    onChange: (Int) -> Unit,
) {
    PazGlassCard(
        modifier = Modifier.fillMaxWidth().clip(PazShapes.large),
        cornerRadius = PazSpacing.CardRadiusCompact,
    ) {
        Column(Modifier.padding(PazSpacing.Lg), verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
            Text("Presenças mínimas", style = MaterialTheme.typography.titleSmall)
            Text(
                "Membros novos entram no rodízio automaticamente após esse número de presenças neste grupo.",
                style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)),
            )
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md)) {
                IconButton(
                    onClick = { onChange(minPresentMeetings - 1) },
                    enabled = minPresentMeetings > 0,
                ) { Icon(Icons.Default.Remove, contentDescription = "Diminuir") }
                Text("$minPresentMeetings", style = MaterialTheme.typography.titleMedium)
                IconButton(
                    onClick = { onChange(minPresentMeetings + 1) },
                    enabled = minPresentMeetings < TASK_MIN_PRESENT_MEETINGS_MAX,
                ) { Icon(Icons.Default.Add, contentDescription = "Aumentar") }
            }
        }
    }
}

@Composable
private fun MemberCard(
    draft: LifeGroupTaskMemberDraft,
    templates: List<LifeGroupTaskTemplateSummary>,
    viewModel: LifeGroupTaskMembersViewModel,
) {
    val member = draft.member
    var expanded by rememberSaveable(member.userId) { mutableStateOf(false) }
    val isManual = member.eligibilitySource == LifeGroupTaskEligibilitySource.MANUAL

    PazGlassCard(
        modifier = Modifier.fillMaxWidth().clip(PazShapes.large),
        cornerRadius = PazSpacing.CardRadiusCompact,
    ) {
        Column(Modifier.padding(PazSpacing.Lg), verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md)) {
                Column(Modifier.weight(1f)) {
                    Text(member.name, style = MaterialTheme.typography.titleSmall)
                    val role =
                        when {
                            member.isLeader -> "Líder"
                            member.isCoLeader -> "Co-líder"
                            else -> null
                        }
                    role?.let {
                        Text(
                            it,
                            style =
                                MaterialTheme.typography.labelSmall.copy(
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                                ),
                        )
                    }
                }
                Switch(
                    checked = draft.eligible,
                    onCheckedChange = { viewModel.onEligibleChanged(member.userId, it) },
                )
            }

            SourceBadge(
                text = if (draft.resetToAutomatic) "Voltará ao automático ao salvar" else member.sourceBadgeLabel(),
            )

            Row(horizontalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
                TextButton(onClick = { expanded = !expanded }) {
                    Text(if (expanded) "Ocultar detalhes" else "Detalhes")
                }
                if (isManual && !draft.resetToAutomatic) {
                    TextButton(onClick = { viewModel.onResetToAutomatic(member.userId) }) {
                        Text("Voltar ao automático")
                    }
                }
                if (draft.resetToAutomatic) {
                    TextButton(onClick = { viewModel.onUndoResetToAutomatic(member.userId) }) {
                        Text("Desfazer")
                    }
                }
            }

            if (expanded) {
                OutlinedTextField(
                    value = draft.note,
                    onValueChange = { viewModel.onNoteChanged(member.userId, it) },
                    label = { Text("Observação (só a liderança vê)") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 2,
                    maxLines = 4,
                )
                if (templates.isNotEmpty()) {
                    Text("Não pode receber estas tarefas", style = MaterialTheme.typography.labelMedium)
                    templates.forEach { template ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(PazSpacing.Sm),
                        ) {
                            Checkbox(
                                checked = template.templateId in draft.excludedTemplateIds,
                                onCheckedChange = { viewModel.onTemplateExclusionToggled(member.userId, template.templateId) },
                            )
                            Text(template.name, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
                if (draft.noteChanged || draft.exclusionsChanged) {
                    Text(
                        "Ao salvar, a elegibilidade deste membro passa a ser uma decisão manual.",
                        style = MaterialTheme.typography.labelSmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)),
                    )
                }
            }
        }
    }
}

@Composable
private fun SourceBadge(text: String) {
    Box(
        Modifier
            .clip(RoundedCornerShape(PazSpacing.Lg))
            .background(PazColors.Primary.copy(alpha = 0.12f))
            .padding(horizontal = PazSpacing.Md, vertical = PazSpacing.Xs),
    ) {
        Text(text, style = MaterialTheme.typography.labelSmall.copy(color = PazColors.Primary))
    }
}

@Composable
private fun MembersSkeleton() {
    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
        modifier = Modifier.fillMaxSize().padding(PazSpacing.Lg),
    ) {
        repeat(6) { item { PazCardSkeleton() } }
    }
}
