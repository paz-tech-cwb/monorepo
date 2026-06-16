package br.church.paz.android.ui.features.formularios

import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.ui.components.PazButton
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun FormDetailScreen(
    navController: NavController,
    formId: String,
    viewModel: FormDetailViewModel = koinViewModel(parameters = { parametersOf(formId) }),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                FormDetailEffect.SubmitSuccess -> {
                    snackbarHostState.showSnackbar("Formulário enviado com sucesso!")
                    navController.popBackStack()
                }
                FormDetailEffect.NavigateBack -> navController.popBackStack()
            }
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
                        uiState.form?.title ?: "Formulário",
                        style = MaterialTheme.typography.headlineMedium.copy(color = Color.White),
                        modifier = Modifier.weight(1f),
                        maxLines = 1,
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
                    uiState.form == null ->
                        ErrorState(error = uiState.error ?: "Formulário não encontrado", onRetry = null)
                    else ->
                        FormContent(
                            uiState = uiState,
                            onFieldChanged = viewModel::onFieldChanged,
                            onSubmit = viewModel::onSubmit,
                        )
                }
            }
        }

        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier.align(Alignment.BottomCenter).padding(PazSpacing.Lg),
        )
    }
}

@Composable
private fun FormContent(
    uiState: FormDetailUiState,
    onFieldChanged: (String, String) -> Unit,
    onSubmit: () -> Unit,
) {
    val form = uiState.form!!
    val fieldDefs = remember(form.type) { form.type.fieldDefs() }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
    ) {
        item { Spacer(Modifier.height(PazSpacing.Sm)) }

        if (!form.description.isNullOrEmpty()) {
            item {
                Text(
                    form.description!!,
                    style =
                        MaterialTheme.typography.bodySmall.copy(
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        ),
                )
            }
        }

        items(fieldDefs.size) { index ->
            val def = fieldDefs[index]
            val value = uiState.fields[def.key] ?: ""
            FieldRow(
                def = def,
                value = value,
                isSubmitting = uiState.isSubmitting,
                onValueChange = { onFieldChanged(def.key, it) },
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
                        uiState.error,
                        style =
                            MaterialTheme.typography.bodySmall.copy(
                                color = MaterialTheme.colorScheme.onErrorContainer,
                            ),
                    )
                }
            }
        }

        item { Spacer(Modifier.height(PazSpacing.Md)) }

        item {
            val canSubmit =
                !uiState.isSubmitting &&
                    fieldDefs.filter { it.required }.all { (uiState.fields[it.key] ?: "").isNotBlank() }

            PazButton(
                text = if (uiState.isSubmitting) "Enviando..." else "Enviar",
                onClick = onSubmit,
                modifier = Modifier.fillMaxWidth(),
                enabled = canSubmit,
            )
        }

        item { Spacer(Modifier.height(PazSpacing.Xl)) }
    }
}

@Composable
private fun FieldRow(
    def: FormFieldDef,
    value: String,
    isSubmitting: Boolean,
    onValueChange: (String) -> Unit,
) {
    Column {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(PazSpacing.Xs),
        ) {
            Text(def.label, style = MaterialTheme.typography.labelMedium)
            if (def.required) {
                Text(
                    "*",
                    style = MaterialTheme.typography.labelMedium.copy(color = MaterialTheme.colorScheme.error),
                )
            }
        }
        Spacer(Modifier.height(PazSpacing.Sm))

        when (def.fieldType) {
            FormFieldType.DATE -> DateFieldRow(value = value, enabled = !isSubmitting, onValueChange = onValueChange)

            FormFieldType.PHONE ->
                MaskedTextField(
                    value = value,
                    placeholder = def.placeholder,
                    enabled = !isSubmitting,
                    keyboardType = KeyboardType.Number,
                    mask = { old, new -> applyPhoneMask(old = old, new = new) },
                    onValueChange = onValueChange,
                )

            FormFieldType.EMAIL ->
                OutlinedTextField(
                    value = value,
                    onValueChange = onValueChange,
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text(def.placeholder) },
                    singleLine = true,
                    enabled = !isSubmitting,
                    keyboardOptions =
                        KeyboardOptions(
                            keyboardType = KeyboardType.Email,
                            capitalization = KeyboardCapitalization.None,
                            imeAction = ImeAction.Next,
                        ),
                    shape = PazShapes.large,
                )

            FormFieldType.NAME ->
                OutlinedTextField(
                    value = value,
                    onValueChange = onValueChange,
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text(def.placeholder) },
                    singleLine = true,
                    enabled = !isSubmitting,
                    keyboardOptions =
                        KeyboardOptions(
                            keyboardType = KeyboardType.Text,
                            capitalization = KeyboardCapitalization.Words,
                            imeAction = ImeAction.Next,
                        ),
                    shape = PazShapes.large,
                )

            FormFieldType.INTEGER ->
                OutlinedTextField(
                    value = value,
                    onValueChange = { new -> onValueChange(new.filter { it.isDigit() }) },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text(def.placeholder) },
                    singleLine = true,
                    enabled = !isSubmitting,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Next),
                    shape = PazShapes.large,
                )

            FormFieldType.CURRENCY ->
                MaskedTextField(
                    value = value,
                    placeholder = def.placeholder,
                    enabled = !isSubmitting,
                    keyboardType = KeyboardType.Number,
                    mask = { _, new -> applyCurrencyMask(new) },
                    onValueChange = onValueChange,
                )

            FormFieldType.MULTILINE ->
                OutlinedTextField(
                    value = value,
                    onValueChange = onValueChange,
                    modifier = Modifier.fillMaxWidth().height(120.dp),
                    placeholder = { Text(def.placeholder) },
                    singleLine = false,
                    enabled = !isSubmitting,
                    keyboardOptions =
                        KeyboardOptions(
                            keyboardType = KeyboardType.Text,
                            capitalization = KeyboardCapitalization.Sentences,
                        ),
                    shape = PazShapes.large,
                )

            FormFieldType.BOOLEAN ->
                Row(
                    verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    androidx.compose.material3.Switch(
                        checked = value == "true",
                        onCheckedChange = { onValueChange(if (it) "true" else "false") },
                        enabled = !isSubmitting,
                    )
                }

            FormFieldType.TEXT ->
                OutlinedTextField(
                    value = value,
                    onValueChange = onValueChange,
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text(def.placeholder) },
                    singleLine = true,
                    enabled = !isSubmitting,
                    keyboardOptions =
                        KeyboardOptions(
                            keyboardType = KeyboardType.Text,
                            capitalization = KeyboardCapitalization.Sentences,
                            imeAction = ImeAction.Next,
                        ),
                    shape = PazShapes.large,
                )
        }
    }
}

// TextFieldValue gives us cursor control — without it, every mask application
// resets the cursor to position 0, making the field appear broken.
@Composable
private fun MaskedTextField(
    value: String,
    placeholder: String,
    enabled: Boolean,
    keyboardType: KeyboardType,
    mask: (old: String, new: String) -> String,
    onValueChange: (String) -> Unit,
) {
    var tfv by remember { mutableStateOf(TextFieldValue(value, selection = TextRange(value.length))) }

    LaunchedEffect(value) {
        if (tfv.text != value) {
            tfv = TextFieldValue(value, selection = TextRange(value.length))
        }
    }

    OutlinedTextField(
        value = tfv,
        onValueChange = { incoming ->
            val masked = mask(tfv.text, incoming.text)
            tfv = TextFieldValue(masked, selection = TextRange(masked.length))
            onValueChange(masked)
        },
        modifier = Modifier.fillMaxWidth(),
        placeholder = { Text(placeholder) },
        singleLine = true,
        enabled = enabled,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = ImeAction.Next),
        shape = PazShapes.large,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DateFieldRow(
    value: String,
    enabled: Boolean,
    onValueChange: (String) -> Unit,
) {
    val fmt = remember { SimpleDateFormat("dd/MM/yyyy", Locale("pt", "BR")) }
    var showDialog by remember { mutableStateOf(false) }

    val initialMs =
        remember(value) {
            if (value.isNotEmpty()) fmt.parse(value)?.time else null
        } ?: System.currentTimeMillis()

    val pickerState = rememberDatePickerState(initialSelectedDateMillis = initialMs)

    OutlinedTextField(
        value = value,
        onValueChange = {},
        modifier = Modifier.fillMaxWidth(),
        placeholder = { Text("DD/MM/YYYY") },
        singleLine = true,
        enabled = enabled,
        readOnly = true,
        trailingIcon = {
            IconButton(onClick = { if (enabled) showDialog = true }) {
                Icon(Icons.Default.CalendarMonth, contentDescription = "Selecionar data")
            }
        },
        shape = PazShapes.large,
    )

    if (showDialog) {
        DatePickerDialog(
            onDismissRequest = { showDialog = false },
            confirmButton = {
                TextButton(onClick = {
                    pickerState.selectedDateMillis?.let { ms ->
                        onValueChange(fmt.format(Date(ms)))
                    }
                    showDialog = false
                }) { Text("OK") }
            },
            dismissButton = {
                TextButton(onClick = { showDialog = false }) { Text("Cancelar") }
            },
        ) {
            DatePicker(state = pickerState)
        }
    }
}

@Composable
private fun ErrorState(
    error: String,
    onRetry: (() -> Unit)?,
) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            Modifier.padding(PazSpacing.Xl),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
        ) {
            Text(error, style = MaterialTheme.typography.bodySmall)
            if (onRetry != null) {
                Spacer(Modifier.height(PazSpacing.Lg))
                PazButton(text = "Tentar Novamente", onClick = onRetry, modifier = Modifier.fillMaxWidth())
            }
        }
    }
}

@Composable
private fun LoadingState() {
    Column(
        Modifier.fillMaxSize().padding(PazSpacing.Lg),
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
    ) {
        Spacer(Modifier.height(PazSpacing.Sm))
        repeat(3) {
            Column(verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
                PazSkeleton(height = 14.dp, width = 80.dp)
                PazSkeleton(height = 56.dp)
            }
        }
    }
}

// Input helpers

private fun applyPhoneMask(
    old: String,
    new: String,
): String {
    var digits = new.filter { it.isDigit() }
    val oldDigits = old.filter { it.isDigit() }
    // User deleted a separator character — drop the preceding digit too
    if (new.length < old.length && digits.length == oldDigits.length && digits.isNotEmpty()) {
        digits = digits.dropLast(1)
    }
    return formatPhone(digits.take(11))
}

// Separators go BEFORE the digit at boundary positions — no trailing chars at partial input
private fun formatPhone(digits: String): String {
    if (digits.isEmpty()) return ""
    val sb = StringBuilder()
    for ((i, c) in digits.withIndex()) {
        when (i) {
            0 -> sb.append("($c")
            1 -> sb.append("$c")
            2 -> sb.append(") $c") // ") " inserted before 3rd digit
            3 -> sb.append(" $c") // " " inserted before 4th digit
            7 -> sb.append("-$c") // "-" inserted before 8th digit
            else -> sb.append(c)
        }
    }
    return sb.toString()
}

private fun applyCurrencyMask(input: String): String {
    val digits = input.filter { it.isDigit() }
    if (digits.isEmpty()) return ""
    val value = digits.toLongOrNull() ?: return ""
    val reais = value / 100
    val centavos = value % 100
    val reaisStr = if (reais == 0L) "0" else formatThousands(reais)
    return "$reaisStr,${centavos.toString().padStart(2, '0')}"
}

private fun formatThousands(n: Long): String {
    val s = n.toString()
    val sb = StringBuilder()
    for ((i, c) in s.reversed().withIndex()) {
        if (i > 0 && i % 3 == 0) sb.insert(0, '.')
        sb.insert(0, c)
    }
    return sb.toString()
}
