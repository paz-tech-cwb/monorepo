package br.church.paz.android.ui.features.home

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import br.church.paz.android.ui.components.PazCardSkeleton
import br.church.paz.android.ui.components.PazCarousel
import br.church.paz.android.ui.components.PazSectionHeader
import br.church.paz.android.ui.components.PazSkeleton
import br.church.paz.android.ui.theme.PazColors
import br.church.paz.android.ui.theme.PazGradients
import br.church.paz.android.ui.theme.PazShapes
import br.church.paz.android.ui.theme.PazShapeXxl
import br.church.paz.android.ui.theme.PazSpacing
import br.church.paz.shared.domain.model.AgendaEvent
import br.church.paz.shared.domain.model.BankInfo
import br.church.paz.shared.domain.model.Banner
import coil3.compose.AsyncImage
import org.koin.androidx.compose.koinViewModel

@Composable
fun HomeScreen(
    navController: NavController,
    contentPadding: PaddingValues = PaddingValues(),
    viewModel: HomeViewModel = koinViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        viewModel.effect.collect { effect ->
            when (effect) {
                is HomeEffect.OpenUrl -> {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(effect.url))
                    context.startActivity(intent)
                }
                is HomeEffect.NavigateToAgenda -> { /* TODO Phase 4: navigate to agenda */ }
            }
        }
    }

    Column(Modifier.fillMaxSize()) {
        // ── Hero header (extends behind status bar) ─────────────────────
        HomeHeroHeader(
            userName = uiState.userName,
            modifier = Modifier.fillMaxWidth(),
        )

        // ── Scrollable body ──────────────────────────────────────────────
        when {
            uiState.isLoading -> LoadingSkeleton(contentPadding)
            uiState.error != null -> ErrorState(
                message = uiState.error!!,
                onRetry = viewModel::load,
                contentPadding = contentPadding,
            )
            else -> HomeContent(
                banners      = uiState.banners,
                agendaEvents = uiState.agendaEvents,
                bank         = uiState.bank,
                onBannerTap  = viewModel::onBannerTapped,
                onEventTap   = viewModel::onEventTapped,
                contentPadding = contentPadding,
            )
        }
    }
}

// ── Hero header ───────────────────────────────────────────────────────────────

@Composable
private fun HomeHeroHeader(userName: String, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .background(PazGradients.Hero)
            .statusBarsPadding()
            .padding(horizontal = PazSpacing.Xl, vertical = PazSpacing.Lg),
    ) {
        Row(
            modifier          = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text(
                    text  = "Bom dia 👋",
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = Color.White.copy(alpha = 0.6f),
                    ),
                )
                Text(
                    text  = userName.ifEmpty { "Bem-vindo" },
                    style = MaterialTheme.typography.headlineMedium.copy(color = Color.White),
                )
            }
            IconButton(
                onClick  = { /* TODO: notifications */ },
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.12f))
                    .border(1.dp, Color.White.copy(alpha = 0.2f), CircleShape),
            ) {
                Icon(
                    Icons.Outlined.Notifications,
                    contentDescription = "Notificações",
                    tint               = Color.White,
                    modifier           = Modifier.size(20.dp),
                )
            }
        }
    }
}

// ── Loaded content ────────────────────────────────────────────────────────────

@Composable
private fun HomeContent(
    banners: List<Banner>,
    agendaEvents: List<AgendaEvent>,
    bank: BankInfo?,
    onBannerTap: (String?) -> Unit,
    onEventTap: (String) -> Unit,
    contentPadding: PaddingValues,
) {
    // Lift body over hero with rounded top corners
    Box(
        Modifier
            .fillMaxSize()
            .clip(androidx.compose.foundation.shape.RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
            .background(MaterialTheme.colorScheme.background)
    ) {
        LazyColumn(
            contentPadding        = contentPadding,
            verticalArrangement   = Arrangement.spacedBy(PazSpacing.Xl),
            modifier              = Modifier.fillMaxSize(),
        ) {
            // Carousel
            if (banners.isNotEmpty()) {
                item {
                    Column(Modifier.padding(top = PazSpacing.Xl)) {
                        PazSectionHeader(
                            title    = "Em Destaque",
                            modifier = Modifier.padding(horizontal = PazSpacing.Lg),
                        )
                        Spacer(Modifier.height(PazSpacing.Md))
                        PazCarousel(
                            items    = banners,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(180.dp)
                                .padding(horizontal = PazSpacing.Lg),
                        ) { banner, _ ->
                            BannerCard(banner = banner, onClick = { onBannerTap(banner.actionUrl) })
                        }
                    }
                }
            }

            // Contribution card
            if (bank != null) {
                item {
                    ContributionCard(
                        bank     = bank,
                        modifier = Modifier.padding(horizontal = PazSpacing.Lg),
                    )
                }
            }

            // Agenda
            if (agendaEvents.isNotEmpty()) {
                item {
                    Column(Modifier.padding(horizontal = PazSpacing.Lg)) {
                        PazSectionHeader(title = "Agenda")
                    }
                }
                items(agendaEvents.take(3), key = { it.id }) { event ->
                    EventRow(
                        event    = event,
                        onClick  = { onEventTap(event.id) },
                        modifier = Modifier.padding(horizontal = PazSpacing.Lg),
                    )
                }
            }

            item { Spacer(Modifier.height(PazSpacing.Lg)) }
        }
    }
}

// ── Banner card ───────────────────────────────────────────────────────────────

@Composable
private fun BannerCard(banner: Banner, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .clip(PazShapes.large)
            .clickable(onClick = onClick),
    ) {
        AsyncImage(
            model              = banner.imageUrl,
            contentDescription = banner.title,
            contentScale       = ContentScale.Crop,
            modifier           = Modifier.fillMaxSize(),
        )
        // Gradient overlay
        Box(
            Modifier
                .fillMaxSize()
                .background(
                    androidx.compose.ui.graphics.Brush.verticalGradient(
                        listOf(Color.Transparent, Color(0xCC021020))
                    )
                )
        )
        Text(
            text     = banner.title,
            style    = MaterialTheme.typography.titleMedium.copy(color = Color.White),
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(PazSpacing.Md),
        )
    }
}

// ── Contribution card ─────────────────────────────────────────────────────────

@Composable
private fun ContributionCard(bank: BankInfo, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(PazShapeXxl)
            .background(PazGradients.Contribution)
            .padding(PazSpacing.Xl),
    ) {
        Column {
            Text(
                text  = "DÍZIMOS & OFERTAS",
                style = MaterialTheme.typography.labelSmall.copy(
                    color = Color.White.copy(alpha = 0.5f),
                ),
            )
            Spacer(Modifier.height(PazSpacing.Xs))
            Text(
                text  = "Contribua com a visão",
                style = MaterialTheme.typography.titleLarge.copy(color = Color.White),
            )
            Text(
                text  = "Sua oferta transforma vidas na comunidade",
                style = MaterialTheme.typography.bodySmall.copy(
                    color = Color.White.copy(alpha = 0.55f),
                ),
            )
            Spacer(Modifier.height(PazSpacing.Lg))

            Row(horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md)) {
                if (bank.pixKey != null) {
                    ContributionButton(
                        label   = "PIX",
                        primary = true,
                        modifier = Modifier.weight(1f),
                        onClick = { /* TODO: copy PIX key */ },
                    )
                }
                ContributionButton(
                    label    = "Transferência",
                    primary  = false,
                    modifier = Modifier.weight(1f),
                    onClick  = { /* TODO: show bank details */ },
                )
            }
        }
    }
}

@Composable
private fun ContributionButton(
    label: String,
    primary: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Box(
        modifier = modifier
            .clip(androidx.compose.foundation.shape.RoundedCornerShape(999.dp))
            .background(if (primary) Color.White else Color.White.copy(alpha = 0.14f))
            .border(
                width = if (primary) 0.dp else 1.5.dp,
                color = if (primary) Color.Transparent else Color.White.copy(alpha = 0.25f),
                shape = androidx.compose.foundation.shape.RoundedCornerShape(999.dp),
            )
            .clickable(onClick = onClick)
            .padding(vertical = 11.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text  = label,
            style = MaterialTheme.typography.bodyMedium.copy(
                fontWeight = FontWeight.Bold,
                color      = if (primary) PazColors.Primary else Color.White,
            ),
        )
    }
}

// ── Agenda event row ──────────────────────────────────────────────────────────

@Composable
private fun EventRow(
    event: AgendaEvent,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier          = modifier
            .fillMaxWidth()
            .clip(PazShapes.large)
            .background(MaterialTheme.colorScheme.surface)
            .clickable(onClick = onClick)
            .padding(PazSpacing.Md),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(PazSpacing.Md),
    ) {
        // Time column
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier            = Modifier.width(40.dp),
        ) {
            val timeParts = event.startDate.split("T").getOrNull(1)?.take(5) ?: ""
            Text(
                text  = timeParts.ifEmpty { "--" },
                style = MaterialTheme.typography.bodySmall.copy(
                    fontWeight = FontWeight.Bold,
                    color      = PazColors.PrimaryLight,
                    fontSize   = 13.sp,
                ),
            )
        }

        // Dot indicator
        Box(
            Modifier
                .size(8.dp)
                .background(PazColors.Primary, CircleShape)
        )

        // Event info
        Column(Modifier.weight(1f)) {
            Text(
                text  = event.title,
                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
            )
            if (!event.location.isNullOrEmpty()) {
                Text(
                    text  = "📍 ${event.location}",
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                    ),
                )
            }
        }
    }
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

@Composable
private fun LoadingSkeleton(contentPadding: PaddingValues) {
    LazyColumn(
        contentPadding      = contentPadding,
        verticalArrangement = Arrangement.spacedBy(PazSpacing.Lg),
        modifier            = Modifier
            .fillMaxSize()
            .clip(androidx.compose.foundation.shape.RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
            .background(MaterialTheme.colorScheme.background)
            .padding(top = PazSpacing.Xl, start = PazSpacing.Lg, end = PazSpacing.Lg),
    ) {
        item { PazSkeleton(height = 180.dp) }
        item { PazCardSkeleton() }
        repeat(3) { item { PazCardSkeleton() } }
    }
}

// ── Error state ───────────────────────────────────────────────────────────────

@Composable
private fun ErrorState(
    message: String,
    onRetry: () -> Unit,
    contentPadding: PaddingValues,
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .clip(androidx.compose.foundation.shape.RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
            .background(MaterialTheme.colorScheme.background)
            .padding(contentPadding),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(PazSpacing.Md),
        ) {
            Text("Erro ao carregar", style = MaterialTheme.typography.titleMedium)
            Text(
                message,
                style = MaterialTheme.typography.bodySmall.copy(
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                ),
            )
            br.church.paz.android.ui.components.PazButton(text = "Tentar novamente", onClick = onRetry)
        }
    }
}
