package br.church.paz.android.ui.features.home

import br.church.paz.shared.domain.model.AgendaEvent
import br.church.paz.shared.domain.model.BankInfo
import br.church.paz.shared.domain.model.Banner
import br.church.paz.shared.domain.model.LifeGroupTask

data class HomeUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val banners: List<Banner> = emptyList(),
    val agendaEvents: List<AgendaEvent> = emptyList(),
    val bank: BankInfo? = null,
    val sectionOrder: List<String> = listOf("announcements", "contribution", "agenda"),
    val userName: String = "",
    val error: String? = null,
    // Any leadership role (role.isLeader) — gates the "Relatórios de Grupos
    // de Vida" shortcut card.
    val canManage: Boolean = false,
    // Shown only when `getMyLifeGroups()` succeeded AND came back empty —
    // see HomeViewModel.fetch() for why an error must never be read as "no
    // group".
    val showLifeGroupDiscoveryCTA: Boolean = false,
    // Upcoming assigned life group tasks ("Minhas tarefas"); empty hides the card, including
    // when the best-effort fetch failed.
    val myTasks: List<LifeGroupTask> = emptyList(),
)

sealed class HomeEffect {
    data class OpenUrl(
        val url: String,
    ) : HomeEffect()

    data class NavigateToAgenda(
        val eventId: String,
    ) : HomeEffect()

    data class NavigateToTask(
        val assignmentId: String,
    ) : HomeEffect()
}
