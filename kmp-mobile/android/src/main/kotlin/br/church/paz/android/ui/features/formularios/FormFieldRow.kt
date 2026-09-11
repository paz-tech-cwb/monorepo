package br.church.paz.android.ui.features.formularios

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
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
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Renders one form field (label + input) for a given [FormFieldDef]. Reused by both the
 * scrollable all-at-once [FormDetailScreen] and the one-question-per-screen [FormStepScreen].
 */
@Composable
fun FieldRow(
    def: FormFieldDef,
    value: String,
    isSubmitting: Boolean,
    uiState: FormDetailUiState,
    onValueChange: (String) -> Unit,
    onOpenPicker: (FormFieldDef) -> Unit,
    onSelfOrSearchMode: (String, Boolean) -> Unit,
    focusRequester: FocusRequester? = null,
    imeAction: ImeAction = ImeAction.Next,
    onImeAction: () -> Unit = {},
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
            FormFieldType.PICKER ->
                PickerField(
                    value = value,
                    options = def.options,
                    enabled = !isSubmitting,
                    onValueChange = onValueChange,
                )

            FormFieldType.DATE -> DateFieldRow(value = value, enabled = !isSubmitting, onValueChange = onValueChange)

            FormFieldType.PHONE ->
                MaskedTextField(
                    fieldKey = def.key,
                    value = value,
                    placeholder = def.placeholder,
                    enabled = !isSubmitting,
                    keyboardType = KeyboardType.Number,
                    mask = { old, new -> applyPhoneMask(old = old, new = new) },
                    onValueChange = onValueChange,
                    focusRequester = focusRequester,
                    imeAction = imeAction,
                    onImeAction = onImeAction,
                )

            FormFieldType.EMAIL ->
                OutlinedTextField(
                    value = value,
                    onValueChange = onValueChange,
                    modifier = Modifier.fillMaxWidth().focusable(focusRequester),
                    placeholder = { Text(def.placeholder) },
                    singleLine = true,
                    enabled = !isSubmitting,
                    keyboardOptions =
                        KeyboardOptions(
                            keyboardType = KeyboardType.Email,
                            capitalization = KeyboardCapitalization.None,
                            imeAction = imeAction,
                        ),
                    keyboardActions = androidx.compose.foundation.text.KeyboardActions(onNext = { onImeAction() }, onDone = { onImeAction() }),
                    shape = PazShapes.large,
                )

            FormFieldType.NAME ->
                OutlinedTextField(
                    value = value,
                    onValueChange = onValueChange,
                    modifier = Modifier.fillMaxWidth().focusable(focusRequester),
                    placeholder = { Text(def.placeholder) },
                    singleLine = true,
                    enabled = !isSubmitting,
                    keyboardOptions =
                        KeyboardOptions(
                            keyboardType = KeyboardType.Text,
                            capitalization = KeyboardCapitalization.Words,
                            imeAction = imeAction,
                        ),
                    keyboardActions = androidx.compose.foundation.text.KeyboardActions(onNext = { onImeAction() }, onDone = { onImeAction() }),
                    shape = PazShapes.large,
                )

            FormFieldType.INTEGER ->
                OutlinedTextField(
                    value = value,
                    onValueChange = { new -> onValueChange(new.filter { it.isDigit() }) },
                    modifier = Modifier.fillMaxWidth().focusable(focusRequester),
                    placeholder = { Text(def.placeholder) },
                    singleLine = true,
                    enabled = !isSubmitting,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = imeAction),
                    keyboardActions = androidx.compose.foundation.text.KeyboardActions(onNext = { onImeAction() }, onDone = { onImeAction() }),
                    shape = PazShapes.large,
                )

            FormFieldType.CURRENCY ->
                MaskedTextField(
                    fieldKey = def.key,
                    value = value,
                    placeholder = def.placeholder,
                    enabled = !isSubmitting,
                    keyboardType = KeyboardType.Number,
                    mask = { _, new -> applyCurrencyMask(new) },
                    onValueChange = onValueChange,
                    focusRequester = focusRequester,
                    imeAction = imeAction,
                    onImeAction = onImeAction,
                )

            FormFieldType.MULTILINE ->
                OutlinedTextField(
                    value = value,
                    onValueChange = onValueChange,
                    modifier = Modifier.fillMaxWidth().height(120.dp).focusable(focusRequester),
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
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Switch(
                        checked = value == "true",
                        onCheckedChange = { onValueChange(if (it) "true" else "false") },
                        enabled = !isSubmitting,
                    )
                }

            FormFieldType.SELECT -> {
                val displayValue = if (def.optionValues.isEmpty()) {
                    value
                } else {
                    def.options.getOrElse(def.optionValues.indexOf(value)) { value }
                }
                PickerField(
                    value = displayValue,
                    options = def.options,
                    enabled = !isSubmitting,
                    onValueChange = { label ->
                        val apiValue = if (def.optionValues.isEmpty()) {
                            label
                        } else {
                            def.optionValues.getOrElse(def.options.indexOf(label)) { label }
                        }
                        onValueChange(apiValue)
                    },
                )
            }

            FormFieldType.USER_PICKER, FormFieldType.USER_MULTI_PICKER -> {
                val displayName = uiState.fields["${def.key}_name"] ?: ""
                Box {
                    OutlinedTextField(
                        value = displayName,
                        onValueChange = {},
                        modifier = Modifier.fillMaxWidth(),
                        readOnly = true,
                        enabled = !isSubmitting,
                        placeholder = { Text(def.placeholder.ifEmpty { "Selecionar pessoa" }) },
                        trailingIcon = {
                            Icon(Icons.Default.KeyboardArrowDown, null)
                        },
                        shape = PazShapes.large,
                        singleLine = true,
                    )
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        onClick = { if (!isSubmitting) onOpenPicker(def) },
                        color = Color.Transparent,
                    ) {}
                }
            }

            FormFieldType.LG_PICKER -> {
                val displayName = uiState.fields["${def.key}_name"] ?: ""
                Box {
                    OutlinedTextField(
                        value = displayName,
                        onValueChange = {},
                        modifier = Modifier.fillMaxWidth(),
                        readOnly = true,
                        enabled = !isSubmitting,
                        placeholder = { Text(def.placeholder.ifEmpty { "Selecionar life group" }) },
                        trailingIcon = { Icon(Icons.Default.KeyboardArrowDown, null) },
                        shape = PazShapes.large,
                        singleLine = true,
                    )
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        onClick = { if (!isSubmitting) onOpenPicker(def) },
                        color = Color.Transparent,
                    ) {}
                }
            }

            FormFieldType.SELF_OR_SEARCH -> {
                val isSearchMode = uiState.selfOrSearchIsSearch[def.key] == true
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        FilterChip(
                            selected = !isSearchMode,
                            onClick = { onSelfOrSearchMode(def.key, false) },
                            label = { Text("Eu mesmo") },
                        )
                        Spacer(Modifier.width(PazSpacing.Sm))
                        FilterChip(
                            selected = isSearchMode,
                            onClick = { onSelfOrSearchMode(def.key, true) },
                            label = { Text("Buscar pessoa") },
                        )
                    }
                    if (isSearchMode) {
                        Spacer(Modifier.height(PazSpacing.Sm))
                        val displayName = uiState.fields["${def.key}_name"] ?: ""
                        Box {
                            OutlinedTextField(
                                value = displayName,
                                onValueChange = {},
                                modifier = Modifier.fillMaxWidth(),
                                readOnly = true,
                                enabled = !isSubmitting,
                                placeholder = { Text("Selecionar pessoa") },
                                trailingIcon = { Icon(Icons.Default.KeyboardArrowDown, null) },
                                shape = PazShapes.large,
                            )
                            Surface(
                                modifier = Modifier.fillMaxWidth(),
                                onClick = { if (!isSubmitting) onOpenPicker(def) },
                                color = Color.Transparent,
                            ) {}
                        }
                    }
                }
            }

            FormFieldType.TEXT ->
                OutlinedTextField(
                    value = value,
                    onValueChange = onValueChange,
                    modifier = Modifier.fillMaxWidth().focusable(focusRequester),
                    placeholder = { Text(def.placeholder) },
                    singleLine = true,
                    enabled = !isSubmitting,
                    keyboardOptions =
                        KeyboardOptions(
                            keyboardType = KeyboardType.Text,
                            capitalization = KeyboardCapitalization.Sentences,
                            imeAction = imeAction,
                        ),
                    keyboardActions = androidx.compose.foundation.text.KeyboardActions(onNext = { onImeAction() }, onDone = { onImeAction() }),
                    shape = PazShapes.large,
                )
        }
    }
}

private fun Modifier.focusable(focusRequester: FocusRequester?): Modifier =
    if (focusRequester != null) this.focusRequester(focusRequester) else this

// TextFieldValue gives us cursor control — without it, every mask application
// resets the cursor to position 0, making the field appear broken.
// [fieldKey] re-seeds the remembered TextFieldValue and cursor position whenever the
// underlying question changes, so a stable field instance (reused across step-mode
// screens) doesn't leak cursor/selection state between different questions.
@Composable
fun MaskedTextField(
    fieldKey: String,
    value: String,
    placeholder: String,
    enabled: Boolean,
    keyboardType: KeyboardType,
    mask: (old: String, new: String) -> String,
    onValueChange: (String) -> Unit,
    focusRequester: FocusRequester? = null,
    imeAction: ImeAction = ImeAction.Next,
    onImeAction: () -> Unit = {},
) {
    var tfv by remember(fieldKey) { mutableStateOf(TextFieldValue(value, selection = TextRange(value.length))) }

    LaunchedEffect(fieldKey) {
        tfv = TextFieldValue(value, selection = TextRange(value.length))
    }

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
        modifier = Modifier.fillMaxWidth().focusable(focusRequester),
        placeholder = { Text(placeholder) },
        singleLine = true,
        enabled = enabled,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = imeAction),
        keyboardActions = androidx.compose.foundation.text.KeyboardActions(onNext = { onImeAction() }, onDone = { onImeAction() }),
        shape = PazShapes.large,
    )
}

@Composable
fun PickerField(
    value: String,
    options: List<String>,
    enabled: Boolean,
    onValueChange: (String) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }

    Box {
        OutlinedTextField(
            value = value,
            onValueChange = {},
            modifier = Modifier.fillMaxWidth(),
            readOnly = true,
            enabled = enabled,
            trailingIcon = {
                Icon(
                    if (expanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurface,
                )
            },
            shape = PazShapes.large,
            singleLine = true,
        )

        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
            modifier = Modifier.fillMaxWidth(0.9f),
        ) {
            options.forEach { option ->
                DropdownMenuItem(
                    text = { Text(option) },
                    onClick = {
                        onValueChange(option)
                        expanded = false
                    },
                    leadingIcon = if (value == option) {
                        {
                            Icon(
                                Icons.Filled.Check,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                            )
                        }
                    } else {
                        null
                    },
                )
            }
        }

        Surface(
            modifier = Modifier.fillMaxWidth(),
            onClick = { if (enabled) expanded = !expanded },
            color = Color.Transparent,
        ) {
            // Invisible surface to handle clicks
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DateFieldRow(
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

// Input helpers

fun applyPhoneMask(
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

fun applyCurrencyMask(input: String): String {
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
