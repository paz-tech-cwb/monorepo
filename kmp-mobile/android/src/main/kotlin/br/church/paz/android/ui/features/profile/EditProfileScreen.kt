package br.church.paz.android.ui.features.profile

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SelectableDates
import androidx.compose.material3.Snackbar
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.components.PazGlassField
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazSpacing
import coil3.compose.AsyncImage
import org.koin.androidx.compose.koinViewModel
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditProfileScreen(
    navController: NavController,
    viewModel: EditProfileViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val context = LocalContext.current
    var isDatePickerOpen by remember { mutableStateOf(false) }

    val photoPicker =
        rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri: Uri? ->
            if (uri != null) viewModel.onPictureSelected(context, uri)
        }

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
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "back", tint = Color.White)
                    }
                    Text(
                        "Editar Perfil",
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
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
                ) {
                    item { Spacer(Modifier.height(PazSpacing.Xl)) }

                    item {
                        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                            Box(
                                modifier =
                                    Modifier
                                        .size(96.dp)
                                        .clip(CircleShape)
                                        .background(PazColors.PrimaryLight.copy(alpha = 0.2f))
                                        .clickable {
                                            photoPicker.launch(
                                                androidx.activity.result.PickVisualMediaRequest(
                                                    ActivityResultContracts.PickVisualMedia.ImageOnly,
                                                ),
                                            )
                                        },
                                contentAlignment = Alignment.Center,
                            ) {
                                if (uiState.isUploadingPicture) {
                                    CircularProgressIndicator()
                                } else if (!uiState.pictureUrl.isNullOrBlank()) {
                                    AsyncImage(
                                        model = uiState.pictureUrl,
                                        contentDescription = null,
                                        modifier = Modifier.fillMaxSize().clip(CircleShape),
                                    )
                                } else {
                                    Icon(Icons.Filled.Person, null, modifier = Modifier.size(48.dp), tint = PazColors.PrimaryLight)
                                }
                                Box(
                                    modifier =
                                        Modifier
                                            .align(Alignment.BottomEnd)
                                            .size(28.dp)
                                            .clip(CircleShape)
                                            .background(PazColors.Primary),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Icon(Icons.Filled.CameraAlt, null, tint = Color.White, modifier = Modifier.size(14.dp))
                                }
                            }
                        }
                    }

                    item {
                        Column(Modifier.fillMaxWidth().padding(horizontal = PazSpacing.Lg)) {
                            Text("Nome", style = MaterialTheme.typography.labelMedium)
                            Spacer(Modifier.height(PazSpacing.Sm))
                            PazGlassField(
                                value = uiState.name,
                                onValueChange = viewModel::onNameChanged,
                                placeholder = "Seu nome completo",
                                enabled = !uiState.isSaving,
                            )
                        }
                    }

                    item {
                        Column(Modifier.fillMaxWidth().padding(horizontal = PazSpacing.Lg)) {
                            Text("Telefone (WhatsApp)", style = MaterialTheme.typography.labelMedium)
                            Spacer(Modifier.height(PazSpacing.Sm))
                            PazGlassField(
                                value = uiState.phone,
                                onValueChange = viewModel::onPhoneChanged,
                                placeholder = "(41) 9 9999-9999",
                                enabled = !uiState.isSaving,
                                keyboardType = KeyboardType.Phone,
                            )
                        }
                    }

                    item {
                        Column(Modifier.fillMaxWidth().padding(horizontal = PazSpacing.Lg)) {
                            Text("Data de nascimento", style = MaterialTheme.typography.labelMedium)
                            Spacer(Modifier.height(PazSpacing.Sm))
                            val displayDate =
                                uiState.birthDate?.let {
                                    runCatching {
                                        LocalDate.parse(it).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                                    }.getOrNull()
                                }
                            PazGlassField(
                                value = displayDate ?: "",
                                onValueChange = {},
                                placeholder = "Selecionar data",
                                readOnly = true,
                                enabled = !uiState.isSaving,
                            )
                            // Transparent tap target over the read-only field, matching the
                            // onboarding birthday step's real-DatePicker-only pattern (the
                            // backend requires an ISO yyyy-MM-dd string, never free text).
                            Box(
                                Modifier
                                    .fillMaxWidth()
                                    .height(56.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .clickable { isDatePickerOpen = true },
                            )
                        }
                    }

                    item { AddressSection(uiState = uiState, viewModel = viewModel) }

                    if (uiState.error != null) {
                        item {
                            Text(
                                uiState.error!!,
                                color = MaterialTheme.colorScheme.error,
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier.padding(horizontal = PazSpacing.Lg),
                            )
                        }
                    }

                    item {
                        Column(Modifier.padding(horizontal = PazSpacing.Lg)) {
                            PazButton(
                                text = if (uiState.isSaving) "Salvando..." else "Salvar",
                                onClick = viewModel::onSave,
                                modifier = Modifier.fillMaxWidth(),
                                enabled = !uiState.isSaving && !uiState.isUploadingPicture && uiState.name.isNotBlank(),
                            )
                        }
                    }

                    item { Spacer(Modifier.height(PazSpacing.Xl)) }
                }
            }
        }

        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier.align(Alignment.BottomCenter).padding(PazSpacing.Lg),
        ) { data ->
            Snackbar(
                containerColor = if (data.visuals.actionLabel != null) PazColors.Error else PazColors.Primary,
                contentColor = Color.White,
            ) {
                Text(data.visuals.message)
            }
        }
    }

    if (isDatePickerOpen) {
        val initialMillis =
            uiState.birthDate
                ?.let { runCatching { LocalDate.parse(it) }.getOrNull() }
                ?.atStartOfDay(ZoneOffset.UTC)
                ?.toInstant()
                ?.toEpochMilli()
                ?: LocalDate
                    .now()
                    .minusYears(28)
                    .atStartOfDay(ZoneOffset.UTC)
                    .toInstant()
                    .toEpochMilli()
        val datePickerState =
            rememberDatePickerState(
                initialSelectedDateMillis = initialMillis,
                initialDisplayedMonthMillis = initialMillis,
                selectableDates =
                    object : SelectableDates {
                        override fun isSelectableYear(year: Int): Boolean = year <= LocalDate.now().year

                        override fun isSelectableDate(utcTimeMillis: Long): Boolean = utcTimeMillis <= System.currentTimeMillis()
                    },
            )
        DatePickerDialog(
            onDismissRequest = { isDatePickerOpen = false },
            confirmButton = {
                TextButton(onClick = {
                    datePickerState.selectedDateMillis?.let { millis ->
                        val iso =
                            Instant
                                .ofEpochMilli(millis)
                                .atZone(ZoneOffset.UTC)
                                .toLocalDate()
                                .format(DateTimeFormatter.ISO_LOCAL_DATE)
                        viewModel.onBirthDateChanged(iso)
                    }
                    isDatePickerOpen = false
                }) { Text("OK") }
            },
            dismissButton = {
                TextButton(onClick = { isDatePickerOpen = false }) { Text("Cancelar") }
            },
        ) {
            DatePicker(state = datePickerState)
        }
    }
}

@Composable
private fun AddressSection(
    uiState: EditProfileUiState,
    viewModel: EditProfileViewModel,
) {
    Column(Modifier.fillMaxWidth().padding(horizontal = PazSpacing.Lg), verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
        Text("Endereço (opcional)", style = MaterialTheme.typography.labelMedium)

        PazGlassField(
            value = uiState.zipCode,
            onValueChange = viewModel::onZipCodeChanged,
            placeholder = "CEP",
            keyboardType = KeyboardType.Number,
            enabled = !uiState.isSaving,
        )
        if (uiState.isLookingUpCep) {
            Text("Buscando endereço...", style = MaterialTheme.typography.bodySmall, color = PazColors.PrimaryLight)
        }
        PazGlassField(
            value = uiState.street,
            onValueChange = viewModel::onStreetChanged,
            placeholder = "Rua",
            enabled = !uiState.isSaving,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
            Box(Modifier.weight(1f)) {
                PazGlassField(
                    value = uiState.number,
                    onValueChange = viewModel::onNumberChanged,
                    placeholder = "Número",
                    keyboardType = KeyboardType.Number,
                    enabled = !uiState.isSaving,
                )
            }
            Box(Modifier.weight(2f)) {
                PazGlassField(
                    value = uiState.complement,
                    onValueChange = viewModel::onComplementChanged,
                    placeholder = "Complemento",
                    enabled = !uiState.isSaving,
                )
            }
        }
        PazGlassField(
            value = uiState.neighborhood,
            onValueChange = viewModel::onNeighborhoodChanged,
            placeholder = "Bairro",
            enabled = !uiState.isSaving,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
            Box(Modifier.weight(2f)) {
                PazGlassField(
                    value = uiState.city,
                    onValueChange = viewModel::onCityChanged,
                    placeholder = "Cidade",
                    enabled = !uiState.isSaving,
                )
            }
            Box(Modifier.weight(1f)) {
                PazGlassField(
                    value = uiState.state,
                    onValueChange = viewModel::onStateChanged,
                    placeholder = "UF",
                    enabled = !uiState.isSaving,
                )
            }
        }
    }
}
