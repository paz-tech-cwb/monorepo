package br.church.paz.android.ui.features.lifegroupmeeting

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LargeTopAppBar
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.navigation.Screen
import br.church.paz.android.ui.components.PazCardSkeleton
import br.church.paz.android.ui.components.PazErrorState
import br.church.paz.android.ui.components.PazMeshBackground
import br.church.paz.android.ui.features.ministries.lifeGroupMeetingLabel
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.LifeGroupMeetingEntryGroup
import org.koin.androidx.compose.koinViewModel

/**
 * "Reuniões" entry reached from Formulários and `paz://form/life-group-reports`: opens the only led
 * group directly, otherwise lets the user pick the group first.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LifeGroupMeetingEntryScreen(
    navController: NavController,
    // The route of the destination hosting this screen: a single group replaces it (popUpTo inclusive).
    hostRoute: String = Screen.LifeGroupMeetingEntry.route,
    viewModel: LifeGroupMeetingEntryViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                LifeGroupMeetingEntryEffect.NavigateBack -> navController.popBackStack()
                is LifeGroupMeetingEntryEffect.OpenMeetings -> {
                    val route = Screen.LifeGroupMeetings.createRoute(effect.lifeGroupId.toString(), effect.meetingDay, effect.canWrite)
                    navController.navigate(route) {
                        // A single group replaces this screen so "back" leaves the flow instead of looping here.
                        if (effect.replaceEntry) popUpTo(hostRoute) { inclusive = true }
                    }
                }
            }
        }
    }

    // Single full-screen background (mesh behind a transparent Scaffold), like every other screen.
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
            containerColor = Color.Transparent,
        ) { innerPadding ->
            Box(Modifier.fillMaxSize().padding(top = innerPadding.calculateTopPadding())) {
                val entry = uiState.entry
                when {
                    uiState.isLoading || entry?.directGroupId != null -> EntrySkeleton()
                    uiState.error != null -> PazErrorState(message = uiState.error.orEmpty(), onRetry = viewModel::load)
                    entry?.emptyMessage != null -> EntryMessage(entry.emptyMessage.orEmpty())
                    entry != null ->
                        EntryGroupList(groups = entry.groups, onGroupTap = viewModel::onGroupTapped)
                }
            }
        }
    }
}

@Composable
private fun EntryGroupList(
    groups: List<LifeGroupMeetingEntryGroup>,
    onGroupTap: (LifeGroupMeetingEntryGroup) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        item {
            Text(
                "Escolha o grupo",
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
            )
        }
        items(groups, key = { it.group.id }) { entryGroup ->
            Row(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .clip(PazShapes.large)
                        .background(MaterialTheme.colorScheme.surface)
                        .clickable { onGroupTap(entryGroup) }
                        .padding(PazSpacing.Lg),
                horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Outlined.Groups, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                Column(Modifier.weight(1f)) {
                    Text(entryGroup.group.name, style = MaterialTheme.typography.titleSmall)
                    val subtitle =
                        listOfNotNull(
                            lifeGroupMeetingLabel(entryGroup.group),
                            if (entryGroup.canWrite) null else "Somente leitura",
                        ).joinToString(" · ")
                    if (subtitle.isNotEmpty()) {
                        Text(
                            subtitle,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        )
                    }
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
private fun EntryMessage(message: String) {
    Box(Modifier.fillMaxSize(), Alignment.Center) {
        Text(
            message,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
            modifier = Modifier.padding(horizontal = PazSpacing.Xl),
        )
    }
}

@Composable
private fun EntrySkeleton() {
    Column(Modifier.fillMaxSize().padding(PazSpacing.Lg), verticalArrangement = Arrangement.spacedBy(PazSpacing.Md)) {
        repeat(3) { PazCardSkeleton() }
    }
}
