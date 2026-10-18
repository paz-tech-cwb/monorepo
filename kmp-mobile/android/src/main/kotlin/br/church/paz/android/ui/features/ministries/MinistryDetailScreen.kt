package br.church.paz.android.ui.features.ministries

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.Assignment
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Message
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.MenuBook
import androidx.compose.material.icons.outlined.People
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LargeTopAppBar
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.ui.components.PazGlassCard
import br.church.paz.android.ui.components.PazMeshBackground
import br.church.paz.android.ui.components.PazPullToRefresh
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.android.util.brDateString
import br.church.paz.shared.domain.model.LifeGroup
import br.church.paz.shared.domain.model.LifeGroupTask
import br.church.paz.shared.domain.model.Ministry
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf

// ── Ministry Detail ──────────────────────────────────────────────────────────

@Composable
fun MinistryDetailScreen(
    navController: NavController,
    ministryId: String,
    viewModel: MinistryDetailViewModel = koinViewModel(parameters = { parametersOf(ministryId) }),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect {
            when (it) {
                MinistryDetailEffect.NavigateBack -> navController.popBackStack()
                is MinistryDetailEffect.NavigateToManage ->
                    navController.navigate(
                        br.church.paz.android.navigation.Screen.MinistryManage
                            .createRoute(it.ministryId),
                    )
            }
        }
    }

    // Reload whenever this screen returns to the foreground (e.g. popping back from the
    // manage screen after a save) — the ViewModel only loads once in init otherwise.
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

    DetailScaffold(
        title = uiState.ministry?.name ?: "Ministério",
        isLoading = uiState.isLoading,
        isRefreshing = uiState.isRefreshing,
        onRefresh = viewModel::refresh,
        error = uiState.error,
        onBack = viewModel::onBack,
        onManageTap = if (uiState.canManage) viewModel::onManageTap else null,
    ) {
        uiState.ministry?.let { ministry ->
            MinistryContent(
                ministry = ministry,
                onMembersTap = {
                    navController.navigate(
                        br.church.paz.android.navigation.Screen.MinistryMembersList
                            .createRoute(ministry.id.toString()),
                    )
                },
            )
        }
    }
}

@Composable
private fun MinistryContent(
    ministry: Ministry,
    onMembersTap: () -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding =
            androidx.compose.foundation.layout
                .PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Lg)) }

        item {
            Box(
                modifier =
                    Modifier
                        .size(72.dp)
                        .clip(PazShapes.large)
                        .background(PazColors.Primary.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Outlined.Groups, contentDescription = null, tint = PazColors.Primary, modifier = Modifier.size(36.dp))
            }
        }

        item {
            Text(ministry.name, style = MaterialTheme.typography.headlineSmall)
        }

        if (!ministry.description.isNullOrEmpty()) {
            item {
                PazGlassCard(
                    modifier = Modifier.fillMaxWidth().clip(PazShapes.large),
                    cornerRadius = PazSpacing.CardRadiusCompact,
                ) {
                    Column(Modifier.padding(PazSpacing.Lg)) {
                        Text("Sobre", style = MaterialTheme.typography.titleSmall)
                        Spacer(Modifier.height(PazSpacing.Sm))
                        Text(
                            ministry.description!!,
                            style =
                                MaterialTheme.typography.bodySmall.copy(
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                                ),
                        )
                    }
                }
            }
        }

        ministry.leader?.let { leader ->
            val leaderText =
                if (ministry.coLeader != null) "${leader.name} & ${ministry.coLeader?.name}" else leader.name
            item {
                PazGlassCard(
                    modifier = Modifier.fillMaxWidth().clip(PazShapes.large),
                    cornerRadius = PazSpacing.CardRadiusCompact,
                ) {
                    Column(
                        Modifier.padding(PazSpacing.Lg),
                        verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
                    ) {
                        InfoRow(icon = Icons.Default.Person, label = "Liderança", value = leaderText)
                    }
                }
            }
        }

        item {
            PazGlassCard(
                modifier = Modifier.fillMaxWidth().clip(PazShapes.large).clickable(onClick = onMembersTap),
                cornerRadius = PazSpacing.CardRadiusCompact,
            ) {
                Row(
                    modifier = Modifier.padding(PazSpacing.Lg),
                    horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.Outlined.People,
                        contentDescription = null,
                        tint = PazColors.Primary,
                        modifier = Modifier.size(22.dp),
                    )
                    Text("Membros", style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
                    Text(
                        "${ministry.members.size}",
                        style =
                            MaterialTheme.typography.labelSmall.copy(
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                            ),
                    )
                    Icon(
                        Icons.AutoMirrored.Outlined.KeyboardArrowRight,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                    )
                }
            }
        }

        item { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}

// ── Life Group Detail ────────────────────────────────────────────────────────

@Composable
fun LifeGroupDetailScreen(
    navController: NavController,
    lifeGroupId: String,
    viewModel: LifeGroupDetailViewModel = koinViewModel(parameters = { parametersOf(lifeGroupId) }),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                LifeGroupDetailEffect.NavigateBack -> navController.popBackStack()
                is LifeGroupDetailEffect.NavigateToManage ->
                    navController.navigate(
                        br.church.paz.android.navigation.Screen.LifeGroupManage
                            .createRoute(effect.lifeGroupId),
                    )
                is LifeGroupDetailEffect.NavigateToTaskMembers ->
                    navController.navigate(
                        br.church.paz.android.navigation.Screen.LifeGroupTaskMembers
                            .createRoute(effect.lifeGroupId),
                    )
                is LifeGroupDetailEffect.NavigateToTask ->
                    navController.navigate(
                        br.church.paz.android.navigation.Screen.LifeGroupTaskGuide
                            .createRoute(effect.assignmentId),
                    )
            }
        }
    }

    // Reload whenever this screen returns to the foreground (e.g. popping back from the
    // manage screen after a save) — the ViewModel only loads once in init otherwise.
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

    DetailScaffold(
        title = uiState.lifeGroup?.name ?: "Life Group",
        isLoading = uiState.isLoading,
        isRefreshing = uiState.isRefreshing,
        onRefresh = viewModel::refresh,
        error = uiState.error,
        onBack = viewModel::onBack,
        onManageTap = if (uiState.canManage) viewModel::onManageTap else null,
    ) {
        uiState.lifeGroup?.let { group ->
            LifeGroupContent(
                lifeGroup = group,
                canManageAttendance = uiState.canManageAttendance,
                onStudyTap = {
                    navController.navigate(br.church.paz.android.navigation.Screen.LifeGroupStudyList.route)
                },
                onMeetingsTap = {
                    navController.navigate(
                        br.church.paz.android.navigation.Screen.LifeGroupMeetings
                            .createRoute(group.id.toString(), group.meetingDay, uiState.canWriteMeetings),
                    )
                },
                onMembersTap = {
                    navController.navigate(
                        br.church.paz.android.navigation.Screen.LifeGroupMembersList
                            .createRoute(group.id.toString()),
                    )
                },
                myTasks = uiState.myTasks,
                onTaskTap = viewModel::onTaskTap,
                onTaskMembersTap = viewModel::onTaskMembersTap,
                canViewGroupReports = uiState.canViewGroupReports,
            )
        }
    }
}

@Composable
private fun LifeGroupContent(
    lifeGroup: LifeGroup,
    canManageAttendance: Boolean,
    onStudyTap: () -> Unit,
    onMeetingsTap: () -> Unit,
    onMembersTap: () -> Unit,
    myTasks: List<LifeGroupTask>,
    onTaskTap: (String) -> Unit,
    onTaskMembersTap: () -> Unit,
    canViewGroupReports: Boolean,
) {
    val context = LocalContext.current
    var showLeadershipDialog by remember { mutableStateOf(false) }

    val leadershipContacts =
        remember(lifeGroup) {
            buildList {
                val leader = lifeGroup.leader
                val leaderPhone = lifeGroup.leaderPhone
                if (leader != null && !leaderPhone.isNullOrBlank()) {
                    add(LeadershipContact(leader, leaderPhone))
                }
                val coLeaderName = lifeGroup.coLeaderName
                val coLeaderPhone = lifeGroup.coLeaderPhone
                if (coLeaderName != null && !coLeaderPhone.isNullOrBlank()) {
                    add(LeadershipContact(coLeaderName, coLeaderPhone))
                }
            }
        }

    if (showLeadershipDialog) {
        LeadershipPickerDialog(
            contacts = leadershipContacts,
            onDismiss = { showLeadershipDialog = false },
            onPick = { contact ->
                showLeadershipDialog = false
                openWhatsApp(context, contact.phone)
            },
        )
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding =
            androidx.compose.foundation.layout
                .PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Lg)) }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(PazSpacing.Lg), verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier =
                        Modifier
                            .size(72.dp)
                            .clip(PazShapes.large)
                            .background(PazColors.Primary.copy(alpha = 0.12f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Default.Person, contentDescription = null, tint = PazColors.Primary, modifier = Modifier.size(36.dp))
                }
                Column {
                    Text(lifeGroup.name, style = MaterialTheme.typography.headlineSmall)
                    Spacer(Modifier.height(PazSpacing.Xs))
                    Box(
                        Modifier
                            .clip(
                                androidx.compose.foundation.shape
                                    .RoundedCornerShape(20.dp),
                            ).background(PazColors.Primary.copy(alpha = 0.12f))
                            .padding(horizontal = 10.dp, vertical = 4.dp),
                    ) {
                        Text(
                            "${lifeGroup.membersCount} membros",
                            style = MaterialTheme.typography.labelSmall.copy(color = PazColors.Primary),
                        )
                    }
                }
            }
        }

        item {
            PazGlassCard(
                modifier = Modifier.fillMaxWidth().clip(PazShapes.large),
                cornerRadius = PazSpacing.CardRadiusCompact,
            ) {
                Column(
                    Modifier.padding(PazSpacing.Lg),
                    verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
                ) {
                    lifeGroup.leader?.let {
                        InfoRow(icon = Icons.Default.Person, label = "Líder", value = it)
                    }
                    if (!lifeGroup.meetingDay.isNullOrEmpty() || !lifeGroup.meetingTime.isNullOrEmpty()) {
                        InfoRow(
                            icon = Icons.Default.CalendarToday,
                            label = "Reunião",
                            value = lifeGroupMeetingLabel(lifeGroup).orEmpty(),
                        )
                    }
                    lifeGroup.location?.let {
                        InfoRow(icon = Icons.Default.LocationOn, label = "Endereço", value = it)
                        if (lifeGroup.latitude != null && lifeGroup.longitude != null) {
                            Text(
                                "Como chegar",
                                style = MaterialTheme.typography.labelSmall.copy(color = PazColors.Primary),
                                modifier =
                                    Modifier
                                        .padding(start = 32.dp)
                                        .clickable {
                                            openInMaps(context, lifeGroup.latitude!!, lifeGroup.longitude!!, lifeGroup.name)
                                        },
                            )
                        }
                    }
                }
            }
        }

        if (leadershipContacts.isNotEmpty()) {
            item {
                PazGlassCard(
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .clip(PazShapes.large)
                            .clickable {
                                if (leadershipContacts.size > 1) {
                                    showLeadershipDialog = true
                                } else {
                                    openWhatsApp(context, leadershipContacts.first().phone)
                                }
                            },
                    cornerRadius = PazSpacing.CardRadiusCompact,
                ) {
                    Row(
                        modifier = Modifier.padding(PazSpacing.Lg),
                        horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            Icons.Default.Message,
                            contentDescription = null,
                            tint = PazColors.Primary,
                            modifier = Modifier.size(22.dp),
                        )
                        Text("Falar com a liderança", style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
                        Icon(
                            Icons.AutoMirrored.Outlined.KeyboardArrowRight,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                        )
                    }
                }
            }
        }

        if (myTasks.isNotEmpty()) {
            item { MyTasksCard(tasks = myTasks, onTaskTap = onTaskTap) }
        }

        // Information architecture (one row per destination; the weekly report, the report list and the stats
        // live INSIDE "Reuniões" now): Reuniões, Membros, Estudo do Life, Elegibilidade para tarefas.
        // "Reuniões": same gate as before (leader/co-leader, or admin/pastor/area/sector leader).
        if (canViewGroupReports) {
            item {
                LifeGroupNavRow(icon = Icons.Outlined.Groups, label = "Reuniões", onClick = onMeetingsTap)
            }
        }

        // The roster is only returned to who may see it (null = hidden), like on iOS.
        lifeGroup.members?.let { members ->
            item {
                LifeGroupNavRow(
                    icon = Icons.Outlined.Person,
                    label = "Membros",
                    onClick = onMembersTap,
                    trailingText = members.size.toString(),
                )
            }
        }

        item {
            LifeGroupNavRow(icon = Icons.Outlined.MenuBook, label = "Estudo do Life", onClick = onStudyTap)
        }

        // Only this group's leader/co-leader manages task eligibility.
        if (canManageAttendance) {
            item {
                LifeGroupNavRow(icon = Icons.Outlined.Person, label = "Elegibilidade para tarefas", onClick = onTaskMembersTap)
            }
        }

        item { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}

/** One tappable navigation row of the life group screen (icon, label, optional count, chevron). */
@Composable
private fun LifeGroupNavRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    onClick: () -> Unit,
    trailingText: String? = null,
) {
    PazGlassCard(
        modifier = Modifier.fillMaxWidth().clip(PazShapes.large).clickable(onClick = onClick),
        cornerRadius = PazSpacing.CardRadiusCompact,
    ) {
        Row(
            modifier = Modifier.padding(PazSpacing.Lg),
            horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(icon, contentDescription = null, tint = PazColors.Primary, modifier = Modifier.size(22.dp))
            Text(label, style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
            if (trailingText != null) {
                Text(
                    trailingText,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                )
            }
            Icon(
                Icons.AutoMirrored.Outlined.KeyboardArrowRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
            )
        }
    }
}

/** "Minhas tarefas": the signed-in member's upcoming assigned tasks (also reused by the home screen). */
@Composable
internal fun MyTasksCard(
    tasks: List<LifeGroupTask>,
    onTaskTap: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    PazGlassCard(
        modifier = modifier.fillMaxWidth().clip(PazShapes.large),
        cornerRadius = PazSpacing.CardRadiusCompact,
    ) {
        Column(Modifier.padding(PazSpacing.Lg), verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
            Row(horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md), verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.AutoMirrored.Outlined.Assignment,
                    contentDescription = null,
                    tint = PazColors.Primary,
                    modifier = Modifier.size(22.dp),
                )
                Text("Minhas tarefas", style = MaterialTheme.typography.titleSmall)
            }
            MyTasksRows(tasks = tasks, onTaskTap = onTaskTap)
        }
    }
}

/** The tappable task rows of "Minhas tarefas", shared by the detail card and the home life group card. */
@Composable
internal fun MyTasksRows(
    tasks: List<LifeGroupTask>,
    onTaskTap: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
        tasks.forEach { task ->
            Row(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .clip(PazShapes.medium)
                        .clickable { onTaskTap(task.id) }
                        .padding(vertical = PazSpacing.Sm),
                horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(Modifier.weight(1f)) {
                    Text(task.name, style = MaterialTheme.typography.bodyMedium)
                    Text(
                        brDateString(task.meetingDate),
                        style =
                            MaterialTheme.typography.labelSmall.copy(
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                            ),
                    )
                }
                Icon(
                    Icons.AutoMirrored.Outlined.KeyboardArrowRight,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                )
            }
        }
    }
}

@Composable
private fun InfoRow(
    icon: ImageVector,
    label: String,
    value: String,
) {
    Row(horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md), verticalAlignment = Alignment.Top) {
        Icon(icon, contentDescription = null, tint = PazColors.Primary, modifier = Modifier.size(20.dp).padding(top = 2.dp))
        Column {
            Text(label, style = MaterialTheme.typography.labelSmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)))
            Text(value, style = MaterialTheme.typography.bodySmall)
        }
    }
}

// ── "Falar com a liderança" — WhatsApp deep link ────────────────────────────

private data class LeadershipContact(
    val name: String,
    val phone: String,
)

@Composable
private fun LeadershipPickerDialog(
    contacts: List<LeadershipContact>,
    onDismiss: () -> Unit,
    onPick: (LeadershipContact) -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Falar com a liderança") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
                contacts.forEach { contact ->
                    Text(
                        contact.name,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier =
                            Modifier
                                .fillMaxWidth()
                                .clickable { onPick(contact) }
                                .padding(vertical = PazSpacing.Sm),
                    )
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) { Text("Cancelar") }
        },
    )
}

private fun openWhatsApp(
    context: android.content.Context,
    phone: String,
) {
    val digits = phone.filter { it.isDigit() }
    if (digits.isEmpty()) return
    val uri = Uri.parse("https://wa.me/$digits")
    runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, uri)) }
}

// ── Shared scaffold ──────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DetailScaffold(
    title: String,
    isLoading: Boolean,
    isRefreshing: Boolean = false,
    onRefresh: () -> Unit = {},
    error: String?,
    onBack: () -> Unit,
    onManageTap: (() -> Unit)? = null,
    content: @Composable () -> Unit,
) {
    Box(Modifier.fillMaxSize()) {
        PazMeshBackground()

        Scaffold(
            topBar = {
                LargeTopAppBar(
                    title = { Text(title, maxLines = 1) },
                    navigationIcon = {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, "back")
                        }
                    },
                    actions = {
                        if (onManageTap != null) {
                            IconButton(onClick = onManageTap) {
                                Icon(Icons.Default.Settings, contentDescription = "Gerenciar")
                            }
                        }
                    },
                    colors = TopAppBarDefaults.largeTopAppBarColors(containerColor = Color.Transparent),
                )
            },
            containerColor = Color.Transparent,
        ) { innerPadding ->
            PazPullToRefresh(
                isRefreshing = isRefreshing,
                onRefresh = onRefresh,
                modifier = Modifier.fillMaxSize().padding(top = innerPadding.calculateTopPadding()),
            ) {
                when {
                    isLoading ->
                        Column(Modifier.padding(PazSpacing.Lg), verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg)) {
                            Spacer(Modifier.height(PazSpacing.Lg))
                            PazSkeleton(height = 72.dp, width = 72.dp)
                            PazSkeleton(height = 28.dp, width = 200.dp)
                            PazSkeleton(height = 120.dp)
                        }
                    error != null ->
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text(
                                error,
                                style =
                                    MaterialTheme.typography.bodySmall.copy(
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                                    ),
                            )
                        }
                    else -> content()
                }
            }
        }
    }
}
