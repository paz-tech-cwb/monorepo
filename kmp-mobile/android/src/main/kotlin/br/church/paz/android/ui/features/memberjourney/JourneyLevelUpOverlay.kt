package br.church.paz.android.ui.features.memberjourney

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.JourneyTrack
import kotlinx.coroutines.delay

/**
 * Short celebration layered on top of the journey screen when a track newly reaches 100%,
 * modeled on [br.church.paz.android.ui.components.PazSuccessState]. Auto-dismisses after a
 * couple seconds so it never blocks the member from continuing to use the screen.
 */
@Composable
fun JourneyLevelUpOverlay(
    track: JourneyTrack?,
    onDismiss: () -> Unit,
) {
    AnimatedVisibility(
        visible = track != null,
        enter = fadeIn(tween(200)) + scaleIn(tween(200), initialScale = 0.9f),
        exit = fadeOut(tween(200)) + scaleOut(tween(200), targetScale = 0.9f),
    ) {
        if (track != null) {
            LaunchedEffect(track.key) {
                delay(2_500)
                onDismiss()
            }

            Box(
                modifier =
                    Modifier
                        .fillMaxSize()
                        .background(PazColors.Primary.copy(alpha = 0.45f)),
                contentAlignment = Alignment.Center,
            ) {
                Column(
                    modifier =
                        Modifier
                            .padding(PazSpacing.Xl)
                            .background(MaterialTheme.colorScheme.surface, PazShapes.large)
                            .padding(PazSpacing.Xl),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
                ) {
                    Box(
                        modifier =
                            Modifier
                                .size(72.dp)
                                .background(PazColors.GoldLight.copy(alpha = 0.25f), CircleShape),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            Icons.Filled.EmojiEvents,
                            contentDescription = null,
                            tint = PazColors.Gold,
                            modifier = Modifier.size(40.dp),
                        )
                    }
                    Text(
                        "Etapa concluída!",
                        style = MaterialTheme.typography.titleLarge,
                        textAlign = TextAlign.Center,
                    )
                    Text(
                        "Você completou \"${track.title}\" na sua jornada.",
                        style =
                            MaterialTheme.typography.bodyMedium.copy(
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                            ),
                        textAlign = TextAlign.Center,
                    )
                }
            }
        }
    }
}
