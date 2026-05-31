package br.church.paz.android.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazSpacing
import kotlinx.coroutines.delay

@Composable
fun <T> PazCarousel(
    items: List<T>,
    modifier: Modifier = Modifier,
    autoScrollDelayMs: Long = 4_000L,
    content: @Composable (item: T, page: Int) -> Unit,
) {
    if (items.isEmpty()) return

    val pagerState = rememberPagerState { items.size }

    LaunchedEffect(pagerState.pageCount) {
        while (true) {
            delay(autoScrollDelayMs)
            val next = (pagerState.currentPage + 1) % items.size
            pagerState.animateScrollToPage(next)
        }
    }

    Box(modifier = modifier) {
        HorizontalPager(
            state    = pagerState,
            modifier = Modifier.fillMaxWidth(),
        ) { page -> content(items[page], page) }

        Row(
            modifier              = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = PazSpacing.Sm),
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            repeat(items.size) { index ->
                val isSelected = pagerState.currentPage == index
                Box(
                    Modifier
                        .width(if (isSelected) 18.dp else 6.dp)
                        .size(6.dp)
                        .background(
                            color = if (isSelected) PazColors.Primary
                                    else PazColors.Sky.copy(alpha = 0.6f),
                            shape = RoundedCornerShape(3.dp),
                        )
                )
            }
        }
    }
}
