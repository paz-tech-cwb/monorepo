package br.church.paz.android.ui.features.academy

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.WorkspacePremium
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.ui.components.PazErrorState
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.repository.CourseCertificateEntry
import org.koin.androidx.compose.koinViewModel

@Composable
fun CertificatesScreen(
    navController: NavController,
    viewModel: CertificatesViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Column(Modifier.fillMaxSize()) {
        Row(
            Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Sm),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = { navController.popBackStack() }) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, "voltar")
            }
            Text("Meus certificados", style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
        }

        when {
            uiState.isLoading -> CertificatesSkeleton()
            uiState.error != null -> PazErrorState(message = uiState.error ?: "Erro ao carregar certificados", onRetry = viewModel::load)
            uiState.certificates.isEmpty() -> CertificatesEmpty()
            else ->
                LazyColumn(
                    contentPadding = PaddingValues(PazSpacing.Lg),
                    verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    items(uiState.certificates, key = { it.certificate.id }) { entry ->
                        CertificateCard(entry)
                    }
                }
        }
    }
}

@Composable
private fun CertificateCard(entry: CourseCertificateEntry) {
    Surface(shape = PazShapes.large, color = MaterialTheme.colorScheme.surface, modifier = Modifier.fillMaxWidth()) {
        Row(
            Modifier.fillMaxWidth().padding(PazSpacing.Md),
            horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                Modifier.size(48.dp).clip(RoundedCornerShape(50)).background(PazColors.Gold.copy(alpha = .15f)),
                Alignment.Center,
            ) {
                Icon(Icons.Filled.WorkspacePremium, null, tint = PazColors.Gold)
            }
            Column(Modifier.weight(1f)) {
                Text(entry.courseTitle, style = MaterialTheme.typography.titleSmall, maxLines = 2)
                Text(
                    "Emitido em ${entry.certificate.issuedAt.take(10)} · Nota ${entry.certificate.scorePercentage}%",
                    style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurface.copy(.6f)),
                )
            }
        }
    }
}

@Composable
private fun CertificatesEmpty() {
    Box(Modifier.fillMaxSize(), Alignment.Center) {
        Text(
            "Você ainda não possui certificados",
            style = MaterialTheme.typography.bodyMedium.copy(color = MaterialTheme.colorScheme.onSurface.copy(.5f)),
        )
    }
}

@Composable
private fun CertificatesSkeleton() {
    Column(Modifier.fillMaxSize().padding(PazSpacing.Lg), verticalArrangement = Arrangement.spacedBy(PazSpacing.Md)) {
        repeat(3) { PazSkeleton(height = 72.dp) }
    }
}
