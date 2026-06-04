package br.church.paz.android.ui.features.account

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Assignment
import androidx.compose.material.icons.outlined.DarkMode
import androidx.compose.material.icons.outlined.DynamicForm
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.LightMode
import androidx.compose.material.icons.outlined.Logout
import androidx.compose.material.icons.outlined.MusicNote
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Route
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.navigation.Screen
import br.church.paz.android.ui.components.PazAvatar
import br.church.paz.android.ui.components.PazMenuRow
import br.church.paz.android.ui.components.PazSectionHeader
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.User
import br.church.paz.shared.domain.model.UserRole
import br.church.paz.shared.domain.model.displayName
import br.church.paz.shared.domain.model.isLeader
import org.koin.androidx.compose.koinViewModel

@Composable
fun AccountScreen(
    navController: NavController,
    contentPadding: PaddingValues = PaddingValues(),
    viewModel: AccountViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var showLogoutDialog by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                AccountEffect.NavigateToEditProfile     -> navController.navigate(Screen.EditProfile.route)
                AccountEffect.NavigateToMemberJourney   -> navController.navigate(Screen.MemberJourney.route)
                AccountEffect.NavigateToMeetingReport   -> navController.navigate(Screen.MeetingReport.route)
                AccountEffect.NavigateToFormularios     -> navController.navigate(Screen.FormulariosList.route)
                AccountEffect.NavigateToMinistries      -> navController.navigate(Screen.Ministries.route)
                AccountEffect.NavigateToNotificationPrefs -> navController.navigate(Screen.NotificationPrefs.route)
                AccountEffect.NavigateToLogin,
                AccountEffect.LoggedOut -> navController.navigate(Screen.Login.route)
            }
        }
    }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title            = { Text("Sair da conta") },
            text             = { Text("Tem certeza que deseja sair?") },
            confirmButton    = {
                TextButton(onClick = { showLogoutDialog = false; viewModel.onLogout() }) {
                    Text("Sair", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton    = {
                TextButton(onClick = { showLogoutDialog = false }) { Text("Cancelar") }
            },
        )
    }

    Column(Modifier.fillMaxSize()) {
        // Hero
        Box(
            Modifier
                .fillMaxWidth()
                .background(PazGradients.Hero)
                .statusBarsPadding()
                .padding(horizontal = PazSpacing.Xl, vertical = PazSpacing.Lg),
        ) {
            Column {
                Text(
                    "Meu Perfil",
                    style = MaterialTheme.typography.bodySmall.copy(color = Color.White.copy(.5f)),
                )
                Text(
                    text  = uiState.user?.name?.split(Regex("\\s+"))?.firstOrNull() ?: "Conta",
                    style = MaterialTheme.typography.headlineMedium.copy(color = Color.White),
                )
            }
        }

        Box(
            Modifier
                .fillMaxSize()
                .clip(RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                .background(MaterialTheme.colorScheme.background),
        ) {
            LazyColumn(
                contentPadding = contentPadding,
                modifier       = Modifier.fillMaxSize(),
            ) {
                item { Spacer(Modifier.height(PazSpacing.Xl)) }

                // Profile card
                uiState.user?.let { user ->
                    item {
                        ProfileCard(
                            user     = user,
                            onClick  = viewModel::onEditProfile,
                            modifier = Modifier.padding(horizontal = PazSpacing.Lg),
                        )
                    }
                }

                item { Spacer(Modifier.height(PazSpacing.Xl)) }

                // Minha Igreja section
                item {
                    PazSectionHeader(
                        title    = "Minha Igreja",
                        modifier = Modifier.padding(horizontal = PazSpacing.Lg + 4.dp),
                    )
                    Spacer(Modifier.height(PazSpacing.Sm))
                    MenuCard(
                        modifier = Modifier.padding(horizontal = PazSpacing.Lg),
                    ) {
                        PazMenuRow(
                            title   = "Jornada do Membro",
                            icon    = Icons.Outlined.Route,
                            onClick = viewModel::onMemberJourney,
                        )
                        if (uiState.user?.role?.isLeader == true) {
                            PazMenuRow(
                                title   = "Relatar Reunião",
                                icon    = Icons.Outlined.Assignment,
                                onClick = viewModel::onMeetingReport,
                            )
                            PazMenuRow(
                                title   = "Formulários",
                                icon    = Icons.Outlined.DynamicForm,
                                onClick = viewModel::onFormularios,
                            )
                        }
                        PazMenuRow(
                            title        = "Ministérios",
                            icon         = Icons.Outlined.MusicNote,
                            onClick      = viewModel::onMinistries,
                            showDivider  = false,
                        )
                    }
                }

                item { Spacer(Modifier.height(PazSpacing.Lg)) }

                // Preferências
                item {
                    PazSectionHeader(
                        title    = "Preferências",
                        modifier = Modifier.padding(horizontal = PazSpacing.Lg + 4.dp),
                    )
                    Spacer(Modifier.height(PazSpacing.Sm))
                    MenuCard(Modifier.padding(horizontal = PazSpacing.Lg)) {
                        PazMenuRow(
                            title   = "Notificações",
                            icon    = Icons.Outlined.Notifications,
                            onClick = viewModel::onNotificationPrefs,
                        )
                        PazMenuRow(
                            title       = "Modo escuro",
                            icon        = if (uiState.isDarkMode) Icons.Outlined.DarkMode else Icons.Outlined.LightMode,
                            showDivider = false,
                            trailing    = {
                                Switch(
                                    checked         = uiState.isDarkMode,
                                    onCheckedChange = viewModel::onToggleDarkMode,
                                    colors          = SwitchDefaults.colors(
                                        checkedThumbColor  = Color.White,
                                        checkedTrackColor  = PazColors.PrimaryLight,
                                    ),
                                )
                            },
                        )
                    }
                }

                item { Spacer(Modifier.height(PazSpacing.Lg)) }

                // Logout
                item {
                    MenuCard(Modifier.padding(horizontal = PazSpacing.Lg)) {
                        PazMenuRow(
                            title       = "Sair da conta",
                            icon        = Icons.Outlined.Logout,
                            onClick     = { showLogoutDialog = true },
                            showDivider = false,
                            tintIcon    = false,
                        )
                    }
                }

                item { Spacer(Modifier.height(PazSpacing.Xl)) }
            }
        }
    }
}

@Composable
private fun ProfileCard(user: User, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(PazShapes.large)
            .background(
                if (MaterialTheme.colorScheme.background == PazColors.Background)
                    PazColors.PrimaryTint
                else PazColors.DarkPrimaryContainer
            )
            .border(1.dp, PazColors.Primary.copy(alpha = 0.13f), PazShapes.large)
            .padding(PazSpacing.Md),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        PazAvatar(
            name     = user.name,
            imageUrl = user.picture,
            size     = 52.dp,
        )
        Column(
            Modifier
                .weight(1f)
                .padding(horizontal = PazSpacing.Md),
        ) {
            Text(user.name, style = MaterialTheme.typography.titleMedium.copy(color = PazColors.Primary))
            Text(
                user.email,
                style   = MaterialTheme.typography.bodySmall.copy(color = PazColors.Accent),
                maxLines = 1,
            )
            Spacer(Modifier.height(4.dp))
            Box(
                Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .background(PazColors.Primary.copy(alpha = 0.12f))
                    .padding(horizontal = 8.dp, vertical = 2.dp),
            ) {
                Text(
                    user.role.displayName,
                    style = MaterialTheme.typography.labelSmall.copy(color = PazColors.Primary),
                )
            }
        }
    }
}

@Composable
private fun MenuCard(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(PazShapes.large)
            .background(MaterialTheme.colorScheme.surface),
    ) { content() }
}
