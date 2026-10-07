package br.church.paz.android.ui.features.ministries

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.material.icons.outlined.Person
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.ui.components.PazErrorState
import br.church.paz.android.ui.components.PazGlassCard
import br.church.paz.android.ui.components.PazMeshBackground
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazSpacing
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf

/**
 * Member list for a ministry or life group — port of iOS `GroupMembersListView`.
 * Pushed to its own screen rather than listed inline since a group can have
 * well over 10 members.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GroupMembersListScreen(
    navController: NavController,
    groupId: String,
    groupType: GroupMembersType,
    viewModel: GroupMembersListViewModel =
        koinViewModel(parameters = { parametersOf(groupId, groupType) }),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect {
            when (it) {
                GroupMembersListEffect.NavigateBack -> navController.popBackStack()
            }
        }
    }

    Box(Modifier.fillMaxSize()) {
        PazMeshBackground()

        Scaffold(
            topBar = {
                LargeTopAppBar(
                    title = { Text(uiState.title.ifEmpty { "Membros" }, maxLines = 1) },
                    navigationIcon = {
                        IconButton(onClick = { viewModel.onBack() }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, "back")
                        }
                    },
                    colors = TopAppBarDefaults.largeTopAppBarColors(containerColor = Color.Transparent),
                )
            },
            containerColor = Color.Transparent,
        ) { innerPadding ->
            Box(Modifier.fillMaxSize().padding(top = innerPadding.calculateTopPadding())) {
                when {
                    uiState.isLoading -> GroupMembersLoadingState()
                    uiState.error != null -> PazErrorState(message = uiState.error!!, onRetry = viewModel::onRetry)
                    uiState.members.isEmpty() -> GroupMembersEmptyState()
                    else -> GroupMembersContent(members = uiState.members)
                }
            }
        }
    }
}

@Composable
private fun GroupMembersContent(members: List<GroupMemberItem>) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Sm)) }
        items(members, key = { it.id }) { member ->
            PazGlassCard(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(PazSpacing.Md),
                    horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Outlined.Person, contentDescription = null, tint = PazColors.Primary)
                    Text(member.name, style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
        item { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}

@Composable
private fun GroupMembersEmptyState() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(
            "Nenhum membro cadastrado ainda.",
            style =
                MaterialTheme.typography.bodyMedium.copy(
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                ),
        )
    }
}

@Composable
private fun GroupMembersLoadingState() {
    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Sm)) }
        items(6) {
            PazSkeleton(height = 56.dp, cornerRadius = 16.dp)
        }
    }
}
