package br.church.paz.android.ui.features.notifications

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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import org.koin.androidx.compose.koinViewModel

@Composable
fun NotificationPrefsScreen(
    navController: NavController,
    viewModel: NotificationPrefsViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                NotificationPrefsEffect.SaveSuccess -> navController.popBackStack()
                NotificationPrefsEffect.NavigateBack -> navController.popBackStack()
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
                    "Notificações",
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
                    Text(
                        "Preferências de Notificação",
                        style = MaterialTheme.typography.titleSmall,
                    )
                    Spacer(Modifier.height(PazSpacing.Sm))
                    Text(
                        "Escolha quais notificações você deseja receber",
                        style =
                            MaterialTheme.typography.bodySmall.copy(
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                            ),
                    )
                }

                item {
                    PreferenceToggle(
                        title = "Notificações de Eventos",
                        description = "Receba alertas sobre eventos e reuniões",
                        checked = uiState.eventsNotifications,
                        onCheckedChange = { viewModel.toggleEvents() },
                    )
                }

                item {
                    PreferenceToggle(
                        title = "Avisos e Comunicados",
                        description = "Receba avisos importantes da igreja",
                        checked = uiState.announcementsNotifications,
                        onCheckedChange = { viewModel.toggleAnnouncements() },
                    )
                }

                item {
                    PreferenceToggle(
                        title = "Notificações do Grupo de Vida",
                        description = "Atualizações do seu grupo de vida",
                        checked = uiState.lifeGroupNotifications,
                        onCheckedChange = { viewModel.toggleLifeGroup() },
                    )
                }

                item {
                    PreferenceToggle(
                        title = "Academia",
                        description = "Conteúdos da academia",
                        checked = uiState.academyNotifications,
                        onCheckedChange = { viewModel.toggleAcademy() },
                    )
                }

                item {
                    PreferenceToggle(
                        title = "Jornada do Membro",
                        description = "Acompanhe sua jornada na igreja",
                        checked = uiState.memberJourneyNotifications,
                        onCheckedChange = { viewModel.toggleMemberJourney() },
                    )
                }

                item {
                    PreferenceToggle(
                        title = "Contribuições",
                        description = "Notificações sobre contribuições",
                        checked = uiState.contributionsNotifications,
                        onCheckedChange = { viewModel.toggleContributions() },
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

                item { Spacer(Modifier.height(PazSpacing.Lg)) }

                item {
                    Column(Modifier.padding(horizontal = 0.dp)) {
                        PazButton(
                            text = if (uiState.isSaving) "Salvando..." else "Salvar",
                            onClick = viewModel::onSave,
                            modifier = Modifier.fillMaxWidth(),
                            enabled = !uiState.isSaving,
                        )
                    }
                }

                item { Spacer(Modifier.height(PazSpacing.Xl)) }
            }
        }
    }
}

@Composable
private fun PreferenceToggle(
    title: String,
    description: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    Box(
        Modifier
            .fillMaxWidth()
            .clip(PazShapes.large)
            .background(MaterialTheme.colorScheme.surface)
            .padding(PazSpacing.Lg),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
        ) {
            Column(Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleSmall)
                Spacer(Modifier.height(PazSpacing.Xs))
                Text(
                    description,
                    style =
                        MaterialTheme.typography.bodySmall.copy(
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        ),
                )
            }
            Switch(checked = checked, onCheckedChange = onCheckedChange)
        }
    }
}
