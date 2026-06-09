package br.church.paz.android.ui.features.account

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Assignment
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.DarkMode
import androidx.compose.material.icons.outlined.DynamicForm
import androidx.compose.material.icons.outlined.LightMode
import androidx.compose.material.icons.outlined.MusicNote
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Route
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.navigation.Screen
import br.church.paz.android.ui.components.PazAvatar
import br.church.paz.android.ui.components.PazMenuRow
import br.church.paz.android.ui.components.PazSectionHeader
import br.church.paz.android.ui.features.auth.LoginScreen
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.User
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
                AccountEffect.NavigateToEditProfile -> navController.navigate(Screen.EditProfile.route)
                AccountEffect.NavigateToMemberJourney -> navController.navigate(Screen.MemberJourney.route)
                AccountEffect.NavigateToMeetingReport -> navController.navigate(Screen.MeetingReport.route)
                AccountEffect.NavigateToFormularios -> navController.navigate(Screen.FormulariosList.route)
                AccountEffect.NavigateToMinistries -> navController.navigate(Screen.Ministries.route)
                AccountEffect.NavigateToNotificationPrefs -> navController.navigate(Screen.NotificationPrefs.route)
                AccountEffect.LoggedOut -> Unit
            }
        }
    }

    if (!uiState.isLoading && uiState.user == null && !uiState.isGuestMode) {
        LoginScreen(
            onLoginSuccess = { viewModel.loadUser() },
            isEmbedded = true,
        )
        return
    }

    if (!uiState.isLoading && uiState.user == null && uiState.isGuestMode) {
        GuestAccountScreen(onSignIn = { viewModel.onShowLogin() })
        return
    }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text("Sair da conta") },
            text = { Text("Tem certeza que deseja sair?") },
            confirmButton = {
                TextButton(onClick = {
                    showLogoutDialog = false
                    viewModel.onLogout()
                }) {
                    Text("Sair", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = { TextButton(onClick = { showLogoutDialog = false }) { Text("Cancelar") } },
        )
    }

    Column(Modifier.fillMaxSize()) {
        // Hero with gear button
        Box(
            Modifier
                .fillMaxWidth()
                .background(PazGradients.Hero)
                .statusBarsPadding()
                .padding(horizontal = PazSpacing.Xl, vertical = PazSpacing.Lg),
        ) {
            Column {
                Text("Meu Perfil", style = MaterialTheme.typography.bodySmall.copy(color = Color.White.copy(.5f)))
                Text(
                    uiState.user
                        ?.name
                        ?.split(Regex("\\s+"))
                        ?.firstOrNull() ?: "Conta",
                    style = MaterialTheme.typography.headlineLarge.copy(color = Color.White),
                )
            }
            Box(
                Modifier
                    .align(Alignment.CenterEnd)
                    .size(44.dp)
                    .clip(RoundedCornerShape(50))
                    .background(PazColors.DarkCard2)
                    .clickable { /* settings — future */ },
                Alignment.Center,
            ) {
                androidx.compose.material3.Icon(Settings, "Configurações", tint = Color.White, modifier = Modifier.size(20.dp))
            }
        }

        Box(
            Modifier
                .fillMaxSize()
                .clip(RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                .background(MaterialTheme.colorScheme.background),
        ) {
            LazyColumn(contentPadding = contentPadding, modifier = Modifier.fillMaxSize()) {
                item { Spacer(Modifier.height(PazSpacing.Xl)) }

                uiState.user?.let { user ->
                    item {
                        ProfileCard(
                            user = user,
                            onClick = viewModel::onEditProfile,
                            modifier = Modifier.padding(horizontal = PazSpacing.Lg),
                        )
                    }
                    item { Spacer(Modifier.height(PazSpacing.Xl)) }

                    item {
                        PazSectionHeader(title = "Minha Igreja", modifier = Modifier.padding(horizontal = PazSpacing.Lg + 4.dp))
                        Spacer(Modifier.height(PazSpacing.Sm))
                        MenuCard(modifier = Modifier.padding(horizontal = PazSpacing.Lg)) {
                            PazMenuRow(
                                title = "Jornada do Membro",
                                icon = Icons.Outlined.Route,
                                iconTint = PazColors.PrimaryLight,
                                onClick = viewModel::onMemberJourney,
                            )
                            if (user.role.isLeader) {
                                PazMenuRow(
                                    title = "Relatar Reunião",
                                    icon = Icons.AutoMirrored.Outlined.Assignment,
                                    iconTint = Color(0xFF2E7D32),
                                    onClick = viewModel::onMeetingReport,
                                )
                                PazMenuRow(
                                    title = "Formulários",
                                    icon = Icons.Outlined.DynamicForm,
                                    iconTint = Color(0xFF6A1B9A),
                                    onClick = viewModel::onFormularios,
                                )
                            }
                            PazMenuRow(
                                title = "Ministérios",
                                icon = Icons.Outlined.MusicNote,
                                iconTint = Color(0xFFE65100),
                                onClick = viewModel::onMinistries,
                                showDivider = false,
                            )
                        }
                    }

                    item { Spacer(Modifier.height(PazSpacing.Lg)) }

                    item {
                        PazSectionHeader(title = "Preferências", modifier = Modifier.padding(horizontal = PazSpacing.Lg + 4.dp))
                        Spacer(Modifier.height(PazSpacing.Sm))
                        MenuCard(Modifier.padding(horizontal = PazSpacing.Lg)) {
                            PazMenuRow(
                                title = "Notificações",
                                icon = Icons.Outlined.Notifications,
                                iconTint = PazColors.PrimaryMid,
                                onClick = viewModel::onNotificationPrefs,
                            )
                            PazMenuRow(
                                title = "Modo escuro",
                                icon = if (uiState.isDarkMode) Icons.Outlined.DarkMode else Icons.Outlined.LightMode,
                                iconTint = PazColors.PrimaryMid,
                                showDivider = false,
                                trailing = {
                                    Switch(
                                        checked = uiState.isDarkMode,
                                        onCheckedChange = viewModel::onToggleDarkMode,
                                        colors =
                                            SwitchDefaults.colors(
                                                checkedThumbColor = Color.White,
                                                checkedTrackColor = PazColors.PrimaryLight,
                                            ),
                                    )
                                },
                            )
                        }
                    }

                    item { Spacer(Modifier.height(PazSpacing.Lg)) }

                    item {
                        MenuCard(Modifier.padding(horizontal = PazSpacing.Lg)) {
                            PazMenuRow(
                                title = "Sair da conta",
                                icon = Icons.AutoMirrored.Outlined.Logout,
                                iconTint = PazColors.Error,
                                titleColor = PazColors.Error,
                                onClick = { showLogoutDialog = true },
                                showDivider = false,
                                tintIcon = false,
                            )
                        }
                    }

                    item { Spacer(Modifier.height(PazSpacing.Xl)) }
                }
            }
        }
    }
}

@Composable
private fun ProfileCard(
    user: User,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier =
            modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(22.dp))
                .background(
                    if (MaterialTheme.colorScheme.background ==
                        PazColors.Background
                    ) {
                        PazColors.PrimaryTint
                    } else {
                        PazColors.DarkPrimaryContainer
                    },
                ).border(1.dp, PazColors.Primary.copy(alpha = 0.13f), RoundedCornerShape(22.dp))
                .clickable(onClick = onClick)
                .padding(PazSpacing.Md),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        PazAvatar(name = user.name, imageUrl = user.picture, size = 56.dp)
        Column(
            Modifier.weight(1f).padding(horizontal = PazSpacing.Md),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Text(user.name, style = MaterialTheme.typography.titleMedium.copy(color = PazColors.Primary))
            Text(user.email, style = MaterialTheme.typography.bodySmall.copy(color = PazColors.Accent), maxLines = 1)
            Spacer(Modifier.height(4.dp))
            Box(
                Modifier
                    .clip(
                        RoundedCornerShape(20.dp),
                    ).background(PazColors.Primary.copy(alpha = 0.12f))
                    .padding(horizontal = 8.dp, vertical = 2.dp),
            ) {
                Text(user.role.displayName, style = MaterialTheme.typography.labelSmall.copy(color = PazColors.Primary))
            }
        }
    }
}

@Composable
private fun MenuCard(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Column(
        modifier =
            modifier
                .fillMaxWidth()
                .clip(PazShapes.large)
                .background(MaterialTheme.colorScheme.surface),
    ) { content() }
}

@Composable
private fun GuestAccountScreen(onSignIn: () -> Unit) {
    Column(
        modifier =
            Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(horizontal = PazSpacing.Xl),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = "Você está navegando como visitante",
            style = MaterialTheme.typography.titleMedium.copy(color = PazColors.Primary),
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(PazSpacing.Sm))
        Text(
            text = "Faça login para acessar sua conta e recursos exclusivos.",
            style = MaterialTheme.typography.bodyMedium.copy(color = PazColors.Slate),
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(PazSpacing.Xl))
        Button(
            onClick = onSignIn,
            colors = ButtonDefaults.buttonColors(containerColor = PazColors.Primary),
        ) {
            Text("Entrar na conta")
        }
    }
}

private val Settings = Icons.Outlined.Settings
