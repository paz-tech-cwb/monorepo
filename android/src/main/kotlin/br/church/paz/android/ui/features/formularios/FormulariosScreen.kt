package br.church.paz.android.ui.features.formularios

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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.Assignment
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.DynamicForm
import androidx.compose.material.icons.outlined.Favorite
import androidx.compose.material.icons.outlined.PersonAdd
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.navigation.Screen
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.components.PazIconContainer
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.FormCatalogItem
import org.koin.androidx.compose.koinViewModel

@Composable
fun FormulariosScreen(
    navController: NavController,
    viewModel: FormulariosViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                is FormulariosEffect.NavigateToForm ->
                    navController.navigate(Screen.FormDetail.createRoute(effect.formId))
                FormulariosEffect.NavigateBack -> navController.popBackStack()
            }
        }
    }

    Column(Modifier.fillMaxSize()) {
        // Hero with circle back button
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
                horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
            ) {
                Box(
                    Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(50))
                        .background(Color.White.copy(.15f))
                        .clickable { viewModel.onBack() },
                    Alignment.Center,
                ) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, "back", tint = Color.White, modifier = Modifier.size(20.dp))
                }
                Text(
                    "Formulários",
                    style = MaterialTheme.typography.headlineMedium.copy(color = Color.White),
                    modifier = Modifier.weight(1f),
                )
            }
        }

        Box(
            Modifier
                .fillMaxSize()
                .clip(RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                .background(MaterialTheme.colorScheme.background),
        ) {
            when {
                uiState.isLoading -> LoadingState()
                uiState.error != null -> ErrorState(error = uiState.error!!, onRetry = viewModel::onRetry)
                uiState.forms.isEmpty() -> EmptyState()
                else -> ContentState(forms = uiState.forms, onFormTap = viewModel::onFormTap)
            }
        }
    }
}

@Composable
private fun ContentState(
    forms: List<FormCatalogItem>,
    onFormTap: (String) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Sm)) }
        items(forms) { form ->
            FormCard(form = form, onClick = { onFormTap(form.id) })
        }
        item { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}

@Composable
private fun FormCard(
    form: FormCatalogItem,
    onClick: () -> Unit,
) {
    val tint = formTint(form.type.name)
    Row(
        modifier =
            Modifier
                .fillMaxWidth()
                .clip(PazShapes.large)
                .background(MaterialTheme.colorScheme.surface)
                .clickable(onClick = onClick)
                .padding(PazSpacing.Md),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        PazIconContainer(icon = formIcon(form.type.name), tint = tint, size = 42.dp)
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(form.title, style = MaterialTheme.typography.titleSmall)
            if (!form.description.isNullOrEmpty()) {
                Text(
                    form.description!!,
                    style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(.6f)),
                    maxLines = 1,
                )
            }
        }
        Icon(Icons.Default.ChevronRight, null, tint = MaterialTheme.colorScheme.onSurface.copy(.3f), modifier = Modifier.size(18.dp))
    }
}

private fun formTint(typeName: String): Color =
    when {
        typeName.contains("CONVERSION", true) -> Color(0xFF1565C0)
        typeName.contains("GUEST", true) -> Color(0xFF2E7D32)
        typeName.contains("SERVICE", true) -> Color(0xFF6A1B9A)
        typeName.contains("REPORT", true) -> Color(0xFFE65100)
        else -> PazColors.Primary
    }

private fun formIcon(typeName: String): ImageVector =
    when {
        typeName.contains("CONVERSION", true) -> Icons.Outlined.Favorite
        typeName.contains("GUEST", true) -> Icons.Outlined.PersonAdd
        typeName.contains("SERVICE", true) -> Icons.Outlined.AccountBalance
        typeName.contains("REPORT", true) -> Icons.AutoMirrored.Outlined.Assignment
        else -> Icons.Outlined.DynamicForm
    }

@Composable
private fun EmptyState() {
    Box(Modifier.fillMaxSize(), Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
            modifier = Modifier.padding(PazSpacing.Xl),
        ) {
            Text("Nenhum formulário disponível", style = MaterialTheme.typography.titleMedium)
            Text(
                "Volte mais tarde para conferir novos formulários",
                style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(.6f)),
            )
        }
    }
}

@Composable
private fun ErrorState(
    error: String,
    onRetry: () -> Unit,
) {
    Box(Modifier.fillMaxSize(), Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
            modifier = Modifier.padding(PazSpacing.Xl),
        ) {
            Text(error, style = MaterialTheme.typography.bodySmall)
            Spacer(Modifier.height(PazSpacing.Lg))
            PazButton(text = "Tentar Novamente", onClick = onRetry, modifier = Modifier.fillMaxWidth())
        }
    }
}

@Composable
private fun LoadingState() {
    Column(
        modifier = Modifier.fillMaxSize().padding(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        Spacer(Modifier.height(PazSpacing.Lg))
        repeat(3) { PazSkeleton(height = 72.dp) }
    }
}
