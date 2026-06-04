package br.church.paz.android.ui.features.home

import br.church.paz.shared.domain.model.AgendaEvent
import br.church.paz.shared.domain.model.Banner
import br.church.paz.shared.domain.model.BankInfo

data class HomeUiState(
    val isLoading: Boolean = true,
    val banners: List<Banner> = emptyList(),
    val agendaEvents: List<AgendaEvent> = emptyList(),
    val bank: BankInfo? = null,
    val sectionOrder: List<String> = listOf("announcements", "contribution", "agenda"),
    val userName: String = "",
    val error: String? = null,
)

sealed class HomeEffect {
    data class OpenUrl(val url: String) : HomeEffect()
    data class NavigateToAgenda(val eventId: String) : HomeEffect()
}
