package br.church.paz.android.ui.features.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.MaterialTheme
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
import br.church.paz.android.navigation.Screen
import br.church.paz.android.ui.components.PazAvatar
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.components.PazMenuRow
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.displayName
import org.koin.androidx.compose.koinViewModel

@Composable
fun ProfileScreen(
    navController: NavController,
    viewModel: ProfileViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                ProfileEffect.NavigateToEditProfile -> navController.navigate(Screen.EditProfile.route)
                ProfileEffect.NavigateToLogin -> navController.navigate(Screen.Login.route) { popUpTo(0) { inclusive = true } }
                ProfileEffect.Logout -> navController.navigate(Screen.Login.route) { popUpTo(0) { inclusive = true } }
            }
        }
    }

    Column(Modifier.fillMaxSize()) {
        Box(
            Modifier
                .fillMaxWidth()
                .background(PazGradients.Hero)
                .statusBarsPadding()
                .padding(horizontal = PazSpacing.Xl, vertical = PazSpacing.Lg),
        ) {
            Text(
                "Meu Perfil",
                style = MaterialTheme.typography.headlineMedium.copy(color = Color.White),
            )
        }

        Box(
            Modifier
                .fillMaxSize()
                .clip(
                    androidx.compose.foundation.shape
                        .RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
                ).background(MaterialTheme.colorScheme.background),
        ) {
            when {
                uiState.isLoading -> LoadingState()
                uiState.user == null -> LoggedOutState(onLogin = { navController.navigate(Screen.Login.route) })
                else -> LoggedInState(user = uiState.user!!, viewModel = viewModel)
            }
        }
    }
}

@Composable
private fun LoggedInState(
    user: br.church.paz.shared.domain.model.User,
    viewModel: ProfileViewModel,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Xl),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Xl)) }

        item {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = PazSpacing.Xl),
            ) {
                PazAvatar(
                    name = user.name,
                    imageUrl = user.picture,
                    size = 80.dp,
                )
                Spacer(Modifier.height(PazSpacing.Md))
                Text(user.name, style = MaterialTheme.typography.headlineSmall)
                Text(user.email, style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(.5f)))
                Spacer(Modifier.height(PazSpacing.Sm))
                Box(
                    Modifier
                        .clip(
                            androidx.compose.foundation.shape
                                .RoundedCornerShape(20.dp),
                        ).background(PazColors.Primary.copy(alpha = 0.12f))
                        .padding(horizontal = 12.dp, vertical = 4.dp),
                ) {
                    Text(
                        user.role.displayName,
                        style = MaterialTheme.typography.labelSmall.copy(color = PazColors.Primary),
                    )
                }
            }
        }

        item { Spacer(Modifier.height(PazSpacing.Lg)) }

        item {
            Column(Modifier.padding(horizontal = PazSpacing.Lg)) {
                PazButton(text = "Editar Perfil", onClick = viewModel::onEditProfile, modifier = Modifier.fillMaxWidth())
            }
        }

        item { Spacer(Modifier.height(PazSpacing.Lg)) }

        item {
            Column(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = PazSpacing.Lg)
                    .clip(PazShapes.large)
                    .background(MaterialTheme.colorScheme.surface),
            ) {
                PazMenuRow(
                    title = "Sair da conta",
                    icon = Icons.Outlined.Edit,
                    onClick = viewModel::onLogout,
                    showDivider = false,
                    tintIcon = false,
                )
            }
        }

        item { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}

@Composable
private fun LoggedOutState(onLogin: () -> Unit) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
            modifier = Modifier.padding(PazSpacing.Xl),
        ) {
            Text(
                "Faça login para ver seu perfil",
                style = MaterialTheme.typography.titleMedium,
            )
            Text(
                "Acesse sua conta para gerenciar informações pessoais e preferências",
                style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(.6f)),
            )
            Spacer(Modifier.height(PazSpacing.Lg))
            PazButton(text = "Entrar", onClick = onLogin, modifier = Modifier.fillMaxWidth())
        }
    }
}

@Composable
private fun LoadingState() {
    Column(
        modifier =
            Modifier
                .fillMaxSize()
                .padding(PazSpacing.Xl),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
    ) {
        Spacer(Modifier.height(PazSpacing.Xl))
        PazSkeleton(height = 80.dp, width = 80.dp)
        PazSkeleton(height = 24.dp, width = 200.dp)
        PazSkeleton(height = 16.dp, width = 150.dp)
        Spacer(Modifier.height(PazSpacing.Lg))
        PazSkeleton(height = 48.dp)
    }
}
