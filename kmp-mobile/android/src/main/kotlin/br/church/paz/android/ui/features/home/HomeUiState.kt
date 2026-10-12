package br.church.paz.android.ui.features.home

import br.church.paz.shared.domain.model.AgendaEvent
import br.church.paz.shared.domain.model.BankInfo
import br.church.paz.shared.domain.model.Banner
import br.church.paz.shared.domain.model.HomeLifeGroupCard
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
    // One card per life group the viewer belongs to (leader/co-leader groups first), with the
    // viewer's upcoming tasks folded in. Empty hides the cards, including when the best-effort
    // groups fetch failed.
    val lifeGroupCards: List<HomeLifeGroupCard> = emptyList(),
    // Groups beyond the card cap; > 0 shows the "Ver todos (N)" row.
    val hiddenLifeGroupsCount: Int = 0,
    // Legacy tasks-only card: used ONLY when the groups fetch failed but the tasks fetch worked,
    // so the existing "Minhas tarefas" feature does not regress.
    val legacyTasks: List<LifeGroupTask> = emptyList(),
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

    data class NavigateToLifeGroup(
        val lifeGroupId: Int,
    ) : HomeEffect()

    data object NavigateToAllLifeGroups : HomeEffect()
}
