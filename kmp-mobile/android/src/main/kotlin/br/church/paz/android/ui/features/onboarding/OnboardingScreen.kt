package br.church.paz.android.ui.features.onboarding

import android.net.Uri
import android.widget.VideoView
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SelectableDates
import androidx.compose.material3.Surface
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import br.church.paz.android.BuildConfig
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.CepLookupOutcome
import br.church.paz.shared.domain.model.OnboardingStep
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

@Composable
fun OnboardingScreen(
    onFinished: () -> Unit,
    // Non-null when this onboarding session was launched to satisfy a
    // BirthDateRequiredException raised during sign-in (see LoginViewModel):
    // there is no authenticated session yet, so the Birthday step must complete
    // the pending sign-in instead of calling OnboardingRepository.submitBirthday.
    pendingBirthDateLogin: (suspend (String) -> Result<Unit>)? = null,
    viewModel: OnboardingViewModel = koinViewModel(parameters = { parametersOf(pendingBirthDateLogin) }),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val isDark = isSystemInDarkTheme()

    LaunchedEffect(state.isFinished) {
        if (state.isFinished) onFinished()
    }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = if (isDark) PazColors.DarkBackground else PazColors.Background,
    ) {
        when {
            state.loadErrorMessage != null ->
                OnboardingLoadError(
                    message = state.loadErrorMessage!!,
                    onRetry = viewModel::retryLoad,
                )
            state.isLoadingMissingSteps -> OnboardingLoading()
            else ->
                when (state.currentStep) {
                    OnboardingStep.Video -> WelcomeVideoStep(onFinished = viewModel::onVideoFinished)
                    OnboardingStep.Birthday ->
                        BirthdayStep(
                            isSubmitting = state.isSubmitting,
                            errorMessage = state.errorMessage,
                            onSubmit = viewModel::onBirthdaySubmitted,
                            onSkip = viewModel::onSkipCurrentStep,
                            onDismissError = viewModel::onDismissError,
                        )
                    OnboardingStep.Whatsapp ->
                        WhatsappStep(
                            isSubmitting = state.isSubmitting,
                            errorMessage = state.errorMessage,
                            onSubmit = viewModel::onWhatsappSubmitted,
                            onSkip = viewModel::onSkipCurrentStep,
                            onDismissError = viewModel::onDismissError,
                        )
                    OnboardingStep.Address ->
                        AddressStep(
                            isSubmitting = state.isSubmitting,
                            isLookingUpCep = state.isLookingUpCep,
                            cepResult = state.cepResult,
                            errorMessage = state.errorMessage,
                            onLookupCep = viewModel::onLookupCep,
                            onSubmit = viewModel::onAddressSubmitted,
                            onSkip = viewModel::onSkipCurrentStep,
                            onDismissError = viewModel::onDismissError,
                        )
                }
        }
    }
}

/**
 * The initial `missingSteps()` fetch failed (e.g. network error). Never fall through to
 * `onFinished()` here — that would silently skip onboarding for a member who still has
 * missing fields. Mirrors iOS's `OnboardingLoadErrorView`.
 */
@Composable
private fun OnboardingLoadError(
    message: String,
    onRetry: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxSize().padding(PazSpacing.Xl),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = "Não foi possível carregar seu cadastro",
            style = MaterialTheme.typography.headlineSmall,
            textAlign = TextAlign.Center,
        )
        Spacer(modifier = Modifier.height(PazSpacing.Sm))
        Text(
            text = message,
            style = MaterialTheme.typography.bodyMedium,
            color = PazColors.Slate,
            textAlign = TextAlign.Center,
        )
        Spacer(modifier = Modifier.height(PazSpacing.Lg))
        Button(
            onClick = onRetry,
            colors = ButtonDefaults.buttonColors(containerColor = PazColors.Primary),
        ) { Text("Tentar novamente") }
    }
}

@Composable
private fun OnboardingLoading() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = PazColors.Primary)
    }
}

/**
 * Plays the welcome video and blocks progression until it ends — this step is
 * intentionally NOT skippable. Uses the built-in [VideoView] (no extra Media3/
 * ExoPlayer dependency exists in this module yet) — swap for a Media3 PlayerView
 * in a later task if richer playback controls are needed.
 */
@Composable
private fun WelcomeVideoStep(onFinished: () -> Unit) {
    var isBuffering by remember { mutableStateOf(true) }
    var hasError by remember { mutableStateOf(false) }

    Box(modifier = Modifier.fillMaxSize()) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { context ->
                VideoView(context).apply {
                    // !!! ONBOARDING_VIDEO_URL is still the cdn.example.org PLACEHOLDER !!!
                    // See android/build.gradle.kts — it MUST be replaced with the real
                    // hosted welcome video before any production release. Until then this
                    // step always falls through to the error state below.
                    setVideoURI(Uri.parse(BuildConfig.ONBOARDING_VIDEO_URL))
                    setOnPreparedListener {
                        isBuffering = false
                        start()
                    }
                    setOnCompletionListener { onFinished() }
                    setOnErrorListener { _, _, _ ->
                        isBuffering = false
                        hasError = true
                        true
                    }
                }
            },
        )

        if (isBuffering && !hasError) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Color.White)
            }
        }

        if (hasError) {
            Column(
                modifier = Modifier.fillMaxSize().padding(PazSpacing.Xl),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    text = "Não foi possível carregar o vídeo de boas-vindas.",
                    color = Color.White,
                    textAlign = TextAlign.Center,
                    style = MaterialTheme.typography.bodyLarge,
                )
                Spacer(modifier = Modifier.height(PazSpacing.Lg))
                Button(onClick = onFinished) { Text("Continuar") }
            }
        }
    }
}

@Composable
private fun StepScaffold(
    title: String,
    subtitle: String,
    errorMessage: String?,
    onDismissError: () -> Unit,
    onSkip: (() -> Unit)?,
    content: @Composable () -> Unit,
) {
    Column(
        modifier =
            Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(PazSpacing.Xl),
    ) {
        Text(text = title, style = MaterialTheme.typography.headlineSmall)
        Spacer(modifier = Modifier.height(PazSpacing.Sm))
        Text(text = subtitle, style = MaterialTheme.typography.bodyMedium, color = PazColors.Slate)
        Spacer(modifier = Modifier.height(PazSpacing.Xl))

        if (errorMessage != null) {
            Text(
                text = errorMessage,
                color = PazColors.Error,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.padding(bottom = PazSpacing.Md),
            )
        }

        content()

        Spacer(modifier = Modifier.height(PazSpacing.Lg))
        if (onSkip != null) {
            TextButton(onClick = onSkip) { Text("Pular por agora") }
        }
    }
}

/**
 * Collects the birth date through a real [DatePicker], never free text: the backend
 * validates `birth_date` with `@IsDateString()`, so the value submitted MUST be an
 * ISO `yyyy-MM-dd` string. A typed "DD/MM/AAAA" string would 400 on every submission.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun BirthdayStep(
    isSubmitting: Boolean,
    errorMessage: String?,
    onSubmit: (String) -> Unit,
    onSkip: () -> Unit,
    onDismissError: () -> Unit,
) {
    val datePickerState =
        rememberDatePickerState(
            // Future birth dates are never valid.
            selectableDates =
                object : SelectableDates {
                    override fun isSelectableYear(year: Int): Boolean = year <= LocalDate.now().year

                    override fun isSelectableDate(utcTimeMillis: Long): Boolean = utcTimeMillis <= System.currentTimeMillis()
                },
        )
    var isPickerOpen by remember { mutableStateOf(false) }

    val selectedMillis = datePickerState.selectedDateMillis
    // The picker reports UTC-midnight millis, so format in UTC — using the device
    // time zone would shift the date by a day for negative-offset zones.
    val isoDate =
        selectedMillis?.let {
            Instant
                .ofEpochMilli(it)
                .atZone(ZoneOffset.UTC)
                .toLocalDate()
                .format(DateTimeFormatter.ISO_LOCAL_DATE)
        }
    val displayDate =
        selectedMillis?.let {
            Instant
                .ofEpochMilli(it)
                .atZone(ZoneOffset.UTC)
                .toLocalDate()
                .format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
        }

    StepScaffold(
        title = "Qual sua data de nascimento?",
        subtitle =
            "Usamos isso para conectar você a grupos e ministérios da sua faixa etária, e para " +
                "confirmar seu cadastro caso já exista um registro seu na igreja.",
        errorMessage = errorMessage,
        onDismissError = onDismissError,
        onSkip = onSkip,
    ) {
        OutlinedButton(
            onClick = {
                onDismissError()
                isPickerOpen = true
            },
            modifier = Modifier.fillMaxWidth().height(56.dp),
        ) {
            Text(displayDate ?: "Selecionar data")
        }

        if (isPickerOpen) {
            DatePickerDialog(
                onDismissRequest = { isPickerOpen = false },
                confirmButton = {
                    TextButton(onClick = { isPickerOpen = false }) { Text("OK") }
                },
                dismissButton = {
                    TextButton(onClick = { isPickerOpen = false }) { Text("Cancelar") }
                },
            ) {
                DatePicker(state = datePickerState)
            }
        }

        Spacer(modifier = Modifier.height(PazSpacing.Lg))
        SubmitButton(
            text = "Continuar",
            isSubmitting = isSubmitting,
            enabled = isoDate != null,
            onClick = { isoDate?.let(onSubmit) },
        )
    }
}

@Composable
private fun WhatsappStep(
    isSubmitting: Boolean,
    errorMessage: String?,
    onSubmit: (String) -> Unit,
    onSkip: () -> Unit,
    onDismissError: () -> Unit,
) {
    var phone by remember { mutableStateOf("") }
    StepScaffold(
        title = "Qual seu WhatsApp?",
        subtitle =
            "É por ele que a equipe da igreja vai entrar em contato com você sobre grupos, " +
                "eventos e novidades.",
        errorMessage = errorMessage,
        onDismissError = onDismissError,
        onSkip = onSkip,
    ) {
        OutlinedTextField(
            value = phone,
            onValueChange = {
                phone = it
                onDismissError()
            },
            label = { Text("(11) 91234-5678") },
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(modifier = Modifier.height(PazSpacing.Lg))
        SubmitButton(
            text = "Continuar",
            isSubmitting = isSubmitting,
            enabled = phone.isNotBlank(),
            onClick = { onSubmit(phone) },
        )
    }
}

@Composable
private fun AddressStep(
    isSubmitting: Boolean,
    isLookingUpCep: Boolean,
    cepResult: CepLookupOutcome?,
    errorMessage: String?,
    onLookupCep: (String) -> Unit,
    onSubmit: (String, String, String?, String, String, String, String) -> Unit,
    onSkip: () -> Unit,
    onDismissError: () -> Unit,
) {
    var cep by remember { mutableStateOf("") }
    var number by remember { mutableStateOf("") }
    var complement by remember { mutableStateOf("") }
    var manualStreet by remember { mutableStateOf("") }
    var manualNeighborhood by remember { mutableStateOf("") }
    var manualCity by remember { mutableStateOf("") }
    var manualState by remember { mutableStateOf("") }

    StepScaffold(
        title = "Qual seu endereço?",
        subtitle = "Usamos para visitas pastorais e para conectar você com o que acontece perto de você.",
        errorMessage = errorMessage,
        onDismissError = onDismissError,
        onSkip = onSkip,
    ) {
        OutlinedTextField(
            value = cep,
            onValueChange = {
                cep = it
                onDismissError()
            },
            label = { Text("CEP") },
            trailingIcon = {
                if (isLookingUpCep) {
                    CircularProgressIndicator(modifier = Modifier.height(20.dp), strokeWidth = 2.dp)
                } else {
                    TextButton(onClick = { onLookupCep(cep) }, enabled = cep.isNotBlank()) { Text("Buscar") }
                }
            },
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(modifier = Modifier.height(PazSpacing.Lg))

        when (cepResult) {
            is CepLookupOutcome.Found -> {
                // ViaCEP returns an empty logradouro/bairro for some municipalities.
                // The backend's CreateAddressDto requires both to be non-empty, so those
                // specific fields are rendered as editable inputs (pre-filled when known)
                // rather than read-only text — never silently submit a blank.
                val lookedUpStreet = cepResult.result.street
                val lookedUpNeighborhood = cepResult.result.neighborhood
                val effectiveStreet = if (lookedUpStreet.isNotBlank()) lookedUpStreet else manualStreet
                val effectiveNeighborhood =
                    if (lookedUpNeighborhood.isNotBlank()) lookedUpNeighborhood else manualNeighborhood

                if (lookedUpStreet.isNotBlank()) {
                    Text(text = lookedUpStreet, style = MaterialTheme.typography.bodyMedium)
                } else {
                    OutlinedTextField(
                        value = manualStreet,
                        onValueChange = {
                            manualStreet = it
                            onDismissError()
                        },
                        label = { Text("Rua") },
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(modifier = Modifier.height(PazSpacing.Md))
                }

                if (lookedUpNeighborhood.isNotBlank()) {
                    Text(text = lookedUpNeighborhood, style = MaterialTheme.typography.bodyMedium)
                } else {
                    OutlinedTextField(
                        value = manualNeighborhood,
                        onValueChange = {
                            manualNeighborhood = it
                            onDismissError()
                        },
                        label = { Text("Bairro") },
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(modifier = Modifier.height(PazSpacing.Md))
                }

                Text(
                    text = "${cepResult.result.city} - ${cepResult.result.state}",
                    style = MaterialTheme.typography.bodySmall,
                    color = PazColors.Slate,
                )
                Spacer(modifier = Modifier.height(PazSpacing.Md))
                OutlinedTextField(
                    value = number,
                    onValueChange = {
                        number = it
                        onDismissError()
                    },
                    label = { Text("Número") },
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(modifier = Modifier.height(PazSpacing.Md))
                OutlinedTextField(
                    value = complement,
                    onValueChange = {
                        complement = it
                        onDismissError()
                    },
                    label = { Text("Complemento (opcional)") },
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(modifier = Modifier.height(PazSpacing.Lg))
                SubmitButton(
                    text = "Continuar",
                    isSubmitting = isSubmitting,
                    // Every field CreateAddressDto marks @IsNotEmpty must be non-blank,
                    // or the submit 400s.
                    enabled =
                        effectiveStreet.isNotBlank() &&
                            number.isNotBlank() &&
                            effectiveNeighborhood.isNotBlank() &&
                            cepResult.result.city.isNotBlank() &&
                            cepResult.result.state.isNotBlank(),
                    onClick = {
                        onSubmit(
                            effectiveStreet,
                            number,
                            complement.ifBlank { null },
                            effectiveNeighborhood,
                            cepResult.result.city,
                            cepResult.result.state,
                            cep,
                        )
                    },
                )
            }
            is CepLookupOutcome.NotFound, is CepLookupOutcome.Error -> {
                Text(
                    text = "Não encontramos esse CEP. Preencha seu endereço manualmente:",
                    style = MaterialTheme.typography.bodySmall,
                    color = PazColors.Slate,
                )
                Spacer(modifier = Modifier.height(PazSpacing.Md))
                OutlinedTextField(
                    value = manualStreet,
                    onValueChange = {
                        manualStreet = it
                        onDismissError()
                    },
                    label = { Text("Rua") },
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(modifier = Modifier.height(PazSpacing.Md))
                OutlinedTextField(
                    value = number,
                    onValueChange = {
                        number = it
                        onDismissError()
                    },
                    label = { Text("Número") },
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(modifier = Modifier.height(PazSpacing.Md))
                OutlinedTextField(
                    value = complement,
                    onValueChange = {
                        complement = it
                        onDismissError()
                    },
                    label = { Text("Complemento (opcional)") },
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(modifier = Modifier.height(PazSpacing.Md))
                OutlinedTextField(
                    value = manualNeighborhood,
                    onValueChange = {
                        manualNeighborhood = it
                        onDismissError()
                    },
                    label = { Text("Bairro") },
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(modifier = Modifier.height(PazSpacing.Md))
                OutlinedTextField(
                    value = manualCity,
                    onValueChange = {
                        manualCity = it
                        onDismissError()
                    },
                    label = { Text("Cidade") },
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(modifier = Modifier.height(PazSpacing.Md))
                OutlinedTextField(
                    value = manualState,
                    onValueChange = {
                        manualState = it
                        onDismissError()
                    },
                    label = { Text("Estado") },
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(modifier = Modifier.height(PazSpacing.Lg))
                SubmitButton(
                    text = "Continuar",
                    isSubmitting = isSubmitting,
                    // Mirrors CreateAddressDto's @IsNotEmpty fields: street, neighborhood,
                    // city and state are all required by the backend.
                    enabled =
                        manualStreet.isNotBlank() &&
                            number.isNotBlank() &&
                            manualNeighborhood.isNotBlank() &&
                            manualCity.isNotBlank() &&
                            manualState.isNotBlank(),
                    onClick = {
                        onSubmit(
                            manualStreet,
                            number,
                            complement.ifBlank { null },
                            manualNeighborhood,
                            manualCity,
                            manualState,
                            cep,
                        )
                    },
                )
            }
            null -> {
                Text(
                    text = "Digite seu CEP e toque em Buscar para preenchermos o resto.",
                    style = MaterialTheme.typography.bodySmall,
                    color = PazColors.Slate,
                )
            }
        }
    }
}

@Composable
private fun SubmitButton(
    text: String,
    isSubmitting: Boolean,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    Button(
        onClick = onClick,
        enabled = enabled && !isSubmitting,
        modifier =
            Modifier
                .fillMaxWidth()
                .height(48.dp),
        colors = ButtonDefaults.buttonColors(containerColor = PazColors.Primary),
    ) {
        if (isSubmitting) {
            CircularProgressIndicator(modifier = Modifier.height(20.dp), color = Color.White, strokeWidth = 2.dp)
        } else {
            Text(text)
        }
    }
}
