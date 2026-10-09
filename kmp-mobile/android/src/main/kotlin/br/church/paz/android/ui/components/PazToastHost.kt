package br.church.paz.android.ui.components

import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier

/**
 * Transient, non-blocking message presenter for non-critical failures (e.g. a failed
 * save/toggle where the rest of the screen's content is still usable). For blocking
 * errors (screen has nothing useful to show), use `PazErrorState` instead.
 *
 * Thin wrapper around Material 3's [SnackbarHostState] so screens stop hand-rolling their
 * own `SnackbarHost` + `LaunchedEffect(error)` boilerplate individually.
 */
@Composable
fun rememberPazToastHost(): SnackbarHostState = remember { SnackbarHostState() }

/**
 * Shows [message] as a transient toast via [hostState] whenever it changes to a non-null
 * value, then clears it via [onShown] once presented.
 */
@Composable
fun PazToastEffect(
    message: String?,
    hostState: SnackbarHostState,
    onShown: () -> Unit,
) {
    LaunchedEffect(message) {
        if (message != null) {
            hostState.showSnackbar(message)
            onShown()
        }
    }
}

/**
 * Drop-in `Scaffold` wrapper wiring [hostState] to a [SnackbarHost] so screens don't need
 * to repeat the `snackbarHost = { SnackbarHost(hostState) }` boilerplate.
 */
@Composable
fun PazToastScaffold(
    hostState: SnackbarHostState,
    modifier: Modifier = Modifier,
    content: @Composable (androidx.compose.foundation.layout.PaddingValues) -> Unit,
) {
    Scaffold(
        modifier = modifier,
        snackbarHost = { SnackbarHost(hostState) },
        content = content,
    )
}
