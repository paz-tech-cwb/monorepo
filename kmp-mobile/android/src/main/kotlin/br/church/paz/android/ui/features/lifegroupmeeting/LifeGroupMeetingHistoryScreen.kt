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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LargeTopAppBar
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SelectableDates
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.navigation.Screen
import br.church.paz.android.ui.components.PazCardSkeleton
import br.church.paz.android.ui.components.PazErrorState
import br.church.paz.android.ui.components.PazMeshBackground
import br.church.paz.android.ui.components.PazPullToRefresh
import br.church.paz.android.ui.features.lifegroupanalytics.LifeGroupAnalyticsPanel
import br.church.paz.android.ui.theme.PazShapePill
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.android.util.brDateString
import br.church.paz.shared.domain.model.LifeGroupMeetingSummary
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LifeGroupMeetingHistoryScreen(
    navController: NavController,
    lifeGroupId: String,
    // The group's fixed weekday from the group detail (null: unknown / "Sem dia fixo").
    meetingDay: String? = null,
    // Role-based write permission from the group detail (false: read-only history, no "Nova reunião").
    canWrite: Boolean = false,
    viewModel: LifeGroupMeetingHistoryViewModel =
        koinViewModel(parameters = { parametersOf(lifeGroupId.toInt(), meetingDay.orEmpty(), canWrite) }),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var showDatePicker by remember { mutableStateOf(false) }

    // Reload whenever this screen returns to the foreground (e.g. popping back from a meeting after a
    // save): the ViewModel is scoped to the back stack entry and only loads once in init otherwise.
    val lifecycleOwner = LocalLifecycleOwner.current
    val currentOnResume = rememberUpdatedState(viewModel::refresh)
    DisposableEffect(lifecycleOwner) {
        val observer =
            LifecycleEventObserver { _, event ->
                if (event == Lifecycle.Event.ON_RESUME) currentOnResume.value()
            }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                LifeGroupMeetingHistoryEffect.NavigateBack -> navController.popBackStack()
                is LifeGroupMeetingHistoryEffect.NavigateToMeeting ->
                    navController.navigate(Screen.LifeGroupMeeting.createRoute(lifeGroupId, effect.date, canWrite))
            }
        }
    }

    Box(Modifier.fillMaxSize()) {
        PazMeshBackground()

        Scaffold(
            topBar = {
                LargeTopAppBar(
                    title = { Text("Reuniões") },
                    navigationIcon = {
                        IconButton(onClick = viewModel::onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, "voltar")
                        }
                    },
                    colors = TopAppBarDefaults.largeTopAppBarColors(containerColor = Color.Transparent),
                )
            },
            floatingActionButton = {
                if (uiState.canWrite && uiState.selectedTab == LifeGroupMeetingsTab.MEETINGS) {
                    ExtendedFloatingActionButton(
                        onClick = { showDatePicker = true },
                        icon = { Icon(Icons.Filled.Add, contentDescription = null) },
                        text = { Text("Nova reunião") },
                    )
                }
            },
            containerColor = Color.Transparent,
        ) { innerPadding ->
            Column(Modifier.fillMaxSize().padding(top = innerPadding.calculateTopPadding())) {
                MeetingsTabSelector(
                    selected = uiState.selectedTab,
                    onSelected = viewModel::onTabSelected,
                    modifier = Modifier.fillMaxWidth().padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Sm),
                )
                when (uiState.selectedTab) {
                    LifeGroupMeetingsTab.MEETINGS ->
                        PazPullToRefresh(
                            isRefreshing = uiState.isRefreshing,
                            onRefresh = viewModel::refresh,
                            modifier = Modifier.weight(1f).fillMaxWidth(),
                        ) {
                            when {
                                uiState.isLoading -> MeetingHistorySkeleton()
                                uiState.error != null -> PazErrorState(message = uiState.error.orEmpty(), onRetry = viewModel::load)
                                uiState.meetings.isEmpty() -> MeetingHistoryEmpty(canWrite = uiState.canWrite)
                                else ->
                                    MeetingHistoryList(
                                        meetings = uiState.meetings,
                                        onMeetingTap = { viewModel.onMeetingTapped(it.date) },
                                    )
                            }
                        }
                    // The stats of THIS group only (no group picker); the panel has no background of its own.
                    LifeGroupMeetingsTab.REPORTS ->
                        LifeGroupAnalyticsPanel(
                            viewModel = koinViewModel(parameters = { parametersOf(lifeGroupId.toInt()) }),
                            modifier = Modifier.weight(1f).fillMaxWidth(),
                        )
                }
            }
        }
    }

    if (showDatePicker && uiState.canWrite) {
        NewMeetingDatePicker(
            initialDate = viewModel.defaultNewMeetingDate(),
            latestDate = viewModel.latestSelectableDate(),
            needsExtra = viewModel::needsExtraMeeting,
            onDismiss = { showDatePicker = false },
            onConfirm = { date ->
                showDatePicker = false
                viewModel.onNewMeetingDateChosen(date)
            },
        )
    }
}

/** The segmented control of the Reuniões screen: [Reuniões | Relatórios]. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MeetingsTabSelector(
    selected: LifeGroupMeetingsTab,
    onSelected: (LifeGroupMeetingsTab) -> Unit,
    modifier: Modifier = Modifier,
) {
    val tabs = LifeGroupMeetingsTab.entries
    SingleChoiceSegmentedButtonRow(modifier = modifier) {
        tabs.forEachIndexed { index, tab ->
            SegmentedButton(
                selected = tab == selected,
                onClick = { onSelected(tab) },
                shape = SegmentedButtonDefaults.itemShape(index = index, count = tabs.size),
                label = {
                    Text(
                        when (tab) {
                            LifeGroupMeetingsTab.MEETINGS -> "Reuniões"
                            LifeGroupMeetingsTab.REPORTS -> "Relatórios"
                        },
                    )
                },
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NewMeetingDatePicker(
    initialDate: String,
    latestDate: String,
    needsExtra: (String) -> Boolean,
    onDismiss: () -> Unit,
    onConfirm: (String) -> Unit,
) {
    val latestMillis = isoToUtcMillis(latestDate) ?: Long.MAX_VALUE
    val pickerState =
        rememberDatePickerState(
            initialSelectedDateMillis = isoToUtcMillis(initialDate),
            selectableDates =
                object : SelectableDates {
                    // The backend rejects future dates.
                    override fun isSelectableDate(utcTimeMillis: Long): Boolean = utcTimeMillis <= latestMillis
                },
        )
    val selected = pickerState.selectedDateMillis?.let { utcMillisToIso(it) }

    DatePickerDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(onClick = { selected?.let(onConfirm) }, enabled = selected != null) { Text("Abrir") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } },
    ) {
        Column {
            DatePicker(state = pickerState)
            if (selected != null && needsExtra(selected)) {
                Text(
                    "Esta data não é o dia regular do grupo: ela será registrada como reunião extra.",
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Sm),
                )
            }
        }
    }
}

@Composable
private fun MeetingHistoryList(
    meetings: List<LifeGroupMeetingSummary>,
    onMeetingTap: (LifeGroupMeetingSummary) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        items(meetings, key = { it.date }) { meeting ->
            MeetingRow(meeting = meeting, onClick = { onMeetingTap(meeting) })
        }
        // Room for the extended FAB.
        item { Spacer(Modifier.height(PazSpacing.Xxxl + PazSpacing.Xl)) }
    }
}

@Composable
private fun MeetingRow(
    meeting: LifeGroupMeetingSummary,
    onClick: () -> Unit,
) {
    Row(
        modifier =
            Modifier
                .fillMaxWidth()
                .clip(PazShapes.large)
                .background(MaterialTheme.colorScheme.surface)
                .clickable(onClick = onClick)
                .padding(PazSpacing.Lg),
        horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Outlined.Groups, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(PazSpacing.Xs)) {
            Text(brDateString(meeting.date), style = MaterialTheme.typography.bodyMedium)
            Row(horizontalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
                // A legacy report without presence shows only the "Relatório" chip: there is no presence to
                // be "pending" (the meeting screen explains "sem presença registrada").
                if (meeting.hasAttendance) {
                    Chip(text = "Presença ${meeting.presentCount ?: 0}/${meeting.membersCount ?: 0}", done = true)
                }
                if (meeting.reportStatusKnown) {
                    Chip(text = if (meeting.hasReport) "Relatório enviado" else "Relatório pendente", done = meeting.hasReport)
                }
            }
        }
    }
}

@Composable
private fun Chip(
    text: String,
    done: Boolean,
) {
    val container =
        if (done) MaterialTheme.colorScheme.primary.copy(alpha = 0.15f) else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f)
    val content = if (done) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
    Surface(shape = PazShapePill, color = container) {
        Text(
            text,
            style = MaterialTheme.typography.labelSmall,
            color = content,
            modifier = Modifier.padding(horizontal = PazSpacing.Md, vertical = PazSpacing.Xs),
        )
    }
}

@Composable
private fun MeetingHistoryEmpty(canWrite: Boolean) {
    Box(Modifier.fillMaxSize(), Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
            Icon(Icons.Outlined.Groups, null, tint = MaterialTheme.colorScheme.primary)
            Text(
                if (canWrite) {
                    "Nenhuma reunião registrada ainda. Toque em \"Nova reunião\" para começar."
                } else {
                    "Nenhuma reunião registrada ainda."
                },
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                modifier = Modifier.padding(horizontal = PazSpacing.Xl),
            )
        }
    }
}

@Composable
private fun MeetingHistorySkeleton() {
    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
        modifier = Modifier.fillMaxSize().padding(PazSpacing.Lg),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Sm)) }
        repeat(5) { item { PazCardSkeleton() } }
    }
}
