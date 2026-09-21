package br.church.paz.android.ui.components

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import br.church.paz.android.ui.theme.PazShapes

/**
 * A translucent, "glass"-styled text field — Compose has no true backdrop-blur primitive
 * without a third-party dependency, so this approximates the app's iOS glass-material look
 * with a semi-transparent surface tint + subtle border instead of a flat opaque background.
 */
@Composable
fun PazGlassField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    label: String? = null,
    placeholder: String? = null,
    enabled: Boolean = true,
    singleLine: Boolean = true,
    readOnly: Boolean = false,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardType: KeyboardType = KeyboardType.Text,
) {
    val isDark = MaterialTheme.colorScheme.surface.luminance() < 0.5f
    val glassTint = if (isDark) Color.White.copy(alpha = 0.08f) else Color.White.copy(alpha = 0.55f)
    val borderTint = if (isDark) Color.White.copy(alpha = 0.16f) else Color.White.copy(alpha = 0.7f)

    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier =
            modifier
                .fillMaxWidth()
                .clip(PazShapes.large)
                .border(1.dp, borderTint, PazShapes.large),
        enabled = enabled,
        readOnly = readOnly,
        singleLine = singleLine,
        label = label?.let { { Text(it) } },
        placeholder = placeholder?.let { { Text(it) } },
        textStyle = LocalTextStyle.current,
        keyboardOptions = if (keyboardType != KeyboardType.Text) keyboardOptions.copy(keyboardType = keyboardType) else keyboardOptions,
        shape = PazShapes.large,
        colors =
            OutlinedTextFieldDefaults.colors(
                focusedContainerColor = glassTint,
                unfocusedContainerColor = glassTint,
                disabledContainerColor = glassTint,
                focusedBorderColor = Color.Transparent,
                unfocusedBorderColor = Color.Transparent,
                disabledBorderColor = Color.Transparent,
            ),
    )
}
