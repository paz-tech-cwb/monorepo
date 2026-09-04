package br.church.paz.android.ui.features.lifegroupstudy

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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.FormatBold
import androidx.compose.material.icons.filled.FormatItalic
import androidx.compose.material.icons.filled.FormatListBulleted
import androidx.compose.material.icons.filled.Title
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazSpacing
import coil3.compose.AsyncImage
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf

/**
 * Create/edit screen for "Estudo do Life" content. Authoring is gated by the caller
 * (only reachable from the list screen's FAB, which is only shown to leaders).
 *
 * Image handling gap: the backend does not expose an arbitrary image-upload endpoint for
 * this feature (the study entity only stores a plain `image_url` string). There is no
 * device photo picker here — a `content://`/`file://` URI can never be resolved into a
 * hosted URL and would be persisted as-is (a permanently broken image for every other
 * user/device), so the only way to set the cover image is by pasting an already-hosted
 * URL into the text field below.
 */
@Composable
fun LifeGroupStudyEditorScreen(
    navController: NavController,
    studyId: String?,
    viewModel: LifeGroupStudyEditorViewModel = koinViewModel(parameters = { parametersOf(studyId) }),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                is LifeGroupStudyEditorEffect.Saved -> navController.popBackStack()
                LifeGroupStudyEditorEffect.NavigateBack -> navController.popBackStack()
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
                Modifier.fillMaxWidth().padding(horizontal = PazSpacing.Lg, vertical = PazSpacing.Md),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = viewModel::onCancel) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, "voltar", tint = Color.White)
                }
                Text(
                    if (uiState.isEditMode) "Editar estudo" else "Novo estudo",
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
            Column(
                Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(PazSpacing.Lg),
                verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
            ) {
                Spacer(Modifier.height(PazSpacing.Sm))

                if (uiState.error != null) {
                    Text(uiState.error!!, style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.error))
                }

                OutlinedTextField(
                    value = uiState.title,
                    onValueChange = viewModel::onTitleChange,
                    label = { Text("Título") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                )

                OutlinedTextField(
                    value = uiState.author,
                    onValueChange = viewModel::onAuthorChange,
                    label = { Text("Autor") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                )

                Column(verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
                    Text("Imagem de capa (opcional)", style = MaterialTheme.typography.labelMedium)
                    if (uiState.imageUrl.isNotBlank()) {
                        AsyncImage(
                            model = uiState.imageUrl,
                            contentDescription = null,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxWidth().height(140.dp).clip(RoundedCornerShape(12.dp)),
                        )
                    }
                    OutlinedTextField(
                        value = uiState.imageUrl,
                        onValueChange = viewModel::onImageUrlChange,
                        label = { Text("URL da imagem") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                    )
                }

                Column(verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
                    Text("Conteúdo", style = MaterialTheme.typography.labelMedium)
                    MarkdownToolbar(viewModel = viewModel)
                    OutlinedTextField(
                        value = uiState.bodyMarkdown,
                        onValueChange = viewModel::onBodyChange,
                        modifier = Modifier.fillMaxWidth().height(260.dp),
                        placeholder = { Text("Escreva o estudo em Markdown...") },
                    )
                    // uiState.bodyMarkdown is a TextFieldValue so the markdown toolbar
                    // (applyMarkdownWrap) can wrap the actual selection instead of only
                    // appending markers at the end of the document.
                }

                HorizontalDivider()

                br.church.paz.android.ui.components.PazButton(
                    text = if (uiState.isEditMode) "Salvar alterações" else "Publicar estudo",
                    onClick = viewModel::onSave,
                    enabled = uiState.isValid && !uiState.isSaving,
                    loading = uiState.isSaving,
                    modifier = Modifier.fillMaxWidth(),
                )

                Spacer(Modifier.height(PazSpacing.Xl))
            }
        }
    }
}

@Composable
private fun MarkdownToolbar(viewModel: LifeGroupStudyEditorViewModel) {
    Row(horizontalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
        IconButton(onClick = { viewModel.applyMarkdownWrap("**") }) {
            Icon(Icons.Filled.FormatBold, contentDescription = "Negrito")
        }
        IconButton(onClick = { viewModel.applyMarkdownWrap("_") }) {
            Icon(Icons.Filled.FormatItalic, contentDescription = "Itálico")
        }
        IconButton(onClick = { viewModel.applyMarkdownLinePrefix("## ") }) {
            Icon(Icons.Filled.Title, contentDescription = "Título")
        }
        IconButton(onClick = { viewModel.applyMarkdownLinePrefix("- ") }) {
            Icon(Icons.Filled.FormatListBulleted, contentDescription = "Lista")
        }
    }
}
