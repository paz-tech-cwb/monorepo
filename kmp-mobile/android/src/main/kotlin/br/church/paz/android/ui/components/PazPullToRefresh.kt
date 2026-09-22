package br.church.paz.android.ui.components

import androidx.compose.foundation.layout.BoxScope
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.PullToRefreshBox
import androidx.compose.material3.PullToRefreshDefaults
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import br.church.paz.android.ui.theme.PazColors

/**
 * Thin wrapper around Material3's [PullToRefreshBox] preset with Paz Church styling
 * (indicator tinted with [PazColors.Primary] over the surface container color), so
 * screens can just do `PazPullToRefresh(isRefreshing, onRefresh) { content }`.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PazPullToRefresh(
    isRefreshing: Boolean,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit,
) {
    val state = rememberPullToRefreshState()

    PullToRefreshBox(
        isRefreshing = isRefreshing,
        onRefresh = onRefresh,
        modifier = modifier,
        state = state,
        indicator = {
            PullToRefreshDefaults.Indicator(
                modifier = Modifier.align(Alignment.TopCenter),
                isRefreshing = isRefreshing,
                state = state,
                containerColor = MaterialTheme.colorScheme.surface,
                color = PazColors.Primary,
            )
        },
        content = content,
    )
}
