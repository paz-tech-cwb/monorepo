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
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Message
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.MenuBook
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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.ui.components.PazMeshBackground
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.LifeGroup
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
                    navController.navigate(br.church.paz.android.navigation.Screen.MinistryManage.createRoute(it.ministryId))
            }
        }
    }

    DetailScaffold(
        title = uiState.ministry?.name ?: "Ministério",
        isLoading = uiState.isLoading,
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
                Column(
                    Modifier
                        .fillMaxWidth()
                        .clip(PazShapes.large)
                        .background(MaterialTheme.colorScheme.surface)
                        .padding(PazSpacing.Lg),
                ) {
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

        ministry.leader?.let { leader ->
            val leaderText =
                if (ministry.coLeader != null) "${leader.name} & ${ministry.coLeader?.name}" else leader.name
            item {
                Column(
                    Modifier
                        .fillMaxWidth()
                        .clip(PazShapes.large)
                        .background(MaterialTheme.colorScheme.surface)
                        .padding(PazSpacing.Lg),
                    verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
                ) {
                    InfoRow(icon = Icons.Default.Person, label = "Liderança", value = leaderText)
                }
            }
        }

        item {
            Row(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .clip(PazShapes.large)
                        .background(MaterialTheme.colorScheme.surface)
                        .clickable(onClick = onMembersTap)
                        .padding(PazSpacing.Lg),
                horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
                verticalAlignment = Alignment.CenterVertically,
            ) {
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
                    navController.navigate(br.church.paz.android.navigation.Screen.LifeGroupManage.createRoute(effect.lifeGroupId))
            }
        }
    }

    DetailScaffold(
        title = uiState.lifeGroup?.name ?: "Life Group",
        isLoading = uiState.isLoading,
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
                onAttendanceTap = {
                    navController.navigate(
                        br.church.paz.android.navigation.Screen.LifeGroupAttendanceHistory
                            .createRoute(group.id.toString()),
                    )
                },
                canManage = uiState.canManage,
                onAnalyticsTap = {
                    navController.navigate(
                        br.church.paz.android.navigation.Screen.LifeGroupAnalytics
                            .createRoute(group.id.toString()),
                    )
                },
            )
        }
    }
}

@Composable
private fun LifeGroupContent(
    lifeGroup: LifeGroup,
    canManageAttendance: Boolean,
    onStudyTap: () -> Unit,
    onAttendanceTap: () -> Unit,
    canManage: Boolean,
    onAnalyticsTap: () -> Unit,
) {
    val context = LocalContext.current
    var showLeadershipDialog by remember { mutableStateOf(false) }

    val leadershipContacts =
        remember(lifeGroup) {
            buildList {
                if (lifeGroup.leader != null && !lifeGroup.leaderPhone.isNullOrBlank()) {
                    add(LeadershipContact(lifeGroup.leader, lifeGroup.leaderPhone))
                }
                if (lifeGroup.coLeaderName != null && !lifeGroup.coLeaderPhone.isNullOrBlank()) {
                    add(LeadershipContact(lifeGroup.coLeaderName, lifeGroup.coLeaderPhone))
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
            Column(
                Modifier
                    .fillMaxWidth()
                    .clip(PazShapes.large)
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(PazSpacing.Lg),
                verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
            ) {
                lifeGroup.leader?.let {
                    InfoRow(icon = Icons.Default.Person, label = "Líder", value = it)
                }
                if (!lifeGroup.meetingDay.isNullOrEmpty() || !lifeGroup.meetingTime.isNullOrEmpty()) {
                    InfoRow(
                        icon = Icons.Default.CalendarToday,
                        label = "Reunião",
                        value =
                            buildString {
                                lifeGroup.meetingDay?.let { append(it) }
                                if (!lifeGroup.meetingDay.isNullOrEmpty() && !lifeGroup.meetingTime.isNullOrEmpty()) append(" às ")
                                lifeGroup.meetingTime?.let { append(it) }
                            },
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

        if (leadershipContacts.isNotEmpty()) {
            item {
                Row(
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .clip(PazShapes.large)
                            .background(MaterialTheme.colorScheme.surface)
                            .clickable {
                                if (leadershipContacts.size > 1) {
                                    showLeadershipDialog = true
                                } else {
                                    openWhatsApp(context, leadershipContacts.first().phone)
                                }
                            }.padding(PazSpacing.Lg),
                    horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Default.Message, contentDescription = null, tint = PazColors.Primary, modifier = Modifier.size(22.dp))
                    Text("Falar com a liderança", style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
                    Icon(
                        Icons.AutoMirrored.Outlined.KeyboardArrowRight,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                    )
                }
            }
        }

        item {
            Row(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .clip(PazShapes.large)
                        .background(MaterialTheme.colorScheme.surface)
                        .clickable(onClick = onStudyTap)
                        .padding(PazSpacing.Lg),
                horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    Icons.Outlined.MenuBook,
                    contentDescription = null,
                    tint = PazColors.Primary,
                    modifier = Modifier.size(22.dp),
                )
                Text("Estudo do Life", style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
                Icon(
                    Icons.AutoMirrored.Outlined.KeyboardArrowRight,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                )
            }
        }

        if (canManageAttendance) {
            item {
                Row(
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .clip(PazShapes.large)
                            .background(MaterialTheme.colorScheme.surface)
                            .clickable(onClick = onAttendanceTap)
                            .padding(PazSpacing.Lg),
                    horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.Outlined.Groups,
                        contentDescription = null,
                        tint = PazColors.Primary,
                        modifier = Modifier.size(22.dp),
                    )
                    Text("Presença", style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
                    Icon(
                        Icons.AutoMirrored.Outlined.KeyboardArrowRight,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                    )
                }
            }
        }

        if (canManage || canManageAttendance) {
            item {
                Row(
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .clip(PazShapes.large)
                            .background(MaterialTheme.colorScheme.surface)
                            .clickable(onClick = onAnalyticsTap)
                            .padding(PazSpacing.Lg),
                    horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.Outlined.BarChart,
                        contentDescription = null,
                        tint = PazColors.Primary,
                        modifier = Modifier.size(22.dp),
                    )
                    Text("Relatórios", style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
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

/** Opens the device's default maps app — lets the user pick their preferred provider. */
private fun openInMaps(
    context: android.content.Context,
    latitude: Double,
    longitude: Double,
    name: String,
) {
    val uri = Uri.parse("geo:$latitude,$longitude?q=$latitude,$longitude(${Uri.encode(name)})")
    runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, uri)) }
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
            Box(Modifier.fillMaxSize().padding(top = innerPadding.calculateTopPadding())) {
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
