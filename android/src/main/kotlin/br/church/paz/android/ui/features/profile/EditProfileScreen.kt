package br.church.paz.android.ui.features.profile

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
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Snackbar
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import org.koin.androidx.compose.koinViewModel

@Composable
fun EditProfileScreen(
    navController: NavController,
    viewModel: EditProfileViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                EditProfileEffect.SaveSuccess -> {
                    snackbarHostState.showSnackbar("Perfil atualizado com sucesso")
                    navController.popBackStack()
                }
                EditProfileEffect.NavigateBack -> navController.popBackStack()
            }
        }
    }

    if (uiState.error != null) {
        LaunchedEffect(uiState.error) {
            snackbarHostState.showSnackbar(uiState.error!!)
        }
    }

    Box(Modifier.fillMaxSize()) {
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
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "back", tint = androidx.compose.ui.graphics.Color.White)
                    }
                    Text(
                        "Editar Perfil",
                        style = MaterialTheme.typography.headlineMedium.copy(color = androidx.compose.ui.graphics.Color.White),
                        modifier = Modifier.weight(1f),
                    )
                }
            }

            Box(
                Modifier
                    .fillMaxSize()
                    .clip(androidx.compose.foundation.shape.RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                    .background(MaterialTheme.colorScheme.background),
            ) {
                LazyColumn(
                    modifier            = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
                ) {
                    item { Spacer(Modifier.height(PazSpacing.Xl)) }

                    item {
                        Column(
                            Modifier
                                .fillMaxWidth()
                                .padding(horizontal = PazSpacing.Lg),
                        ) {
                            Text(
                                "Nome",
                                style = MaterialTheme.typography.labelMedium,
                            )
                            Spacer(Modifier.height(PazSpacing.Sm))
                            OutlinedTextField(
                                value        = uiState.name,
                                onValueChange = viewModel::onNameChanged,
                                modifier     = Modifier.fillMaxWidth(),
                                enabled      = !uiState.isSaving,
                                placeholder  = { Text("Seu nome completo") },
                                singleLine   = true,
                                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                                keyboardActions = KeyboardActions(onDone = { viewModel.onSave() }),
                                shape        = PazShapes.large,
                            )
                        }
                    }

                    item { Spacer(Modifier.height(PazSpacing.Lg)) }

                    item {
                        Column(Modifier.padding(horizontal = PazSpacing.Lg)) {
                            PazButton(
                                text     = if (uiState.isSaving) "Salvando..." else "Salvar",
                                onClick  = viewModel::onSave,
                                modifier = Modifier.fillMaxWidth(),
                                enabled  = !uiState.isSaving && uiState.name.isNotBlank(),
                            )
                        }
                    }

                    item { Spacer(Modifier.height(PazSpacing.Xl)) }
                }
            }
        }

        SnackbarHost(
            hostState = snackbarHostState,
            modifier  = Modifier
                .align(Alignment.BottomCenter)
                .padding(PazSpacing.Lg),
        ) { data ->
            Snackbar(
                containerColor = if (data.visuals.actionLabel != null) PazColors.Error else PazColors.Primary,
                contentColor   = androidx.compose.ui.graphics.Color.White,
            ) {
                Text(data.visuals.message)
            }
        }
    }
}
