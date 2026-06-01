package br.church.paz.android.ui.features.search

import br.church.paz.shared.domain.model.AcademyVideo
import br.church.paz.shared.domain.model.AgendaEvent
import br.church.paz.shared.domain.model.FormCatalogItem
import br.church.paz.shared.domain.model.LifeGroup
import br.church.paz.shared.domain.model.Ministry

data class SearchUiState(
    val query: String = "",
    val results: SearchResults = SearchResults(),
    val isSearching: Boolean = false,
    val hasSearched: Boolean = false,
)

data class SearchResults(
    val events: List<AgendaEvent> = emptyList(),
    val videos: List<AcademyVideo> = emptyList(),
    val forms: List<FormCatalogItem> = emptyList(),
    val ministries: List<Ministry> = emptyList(),
    val lifeGroups: List<LifeGroup> = emptyList(),
) {
    val isEmpty get() = events.isEmpty() && videos.isEmpty() && forms.isEmpty() && ministries.isEmpty() && lifeGroups.isEmpty()
    val totalCount get() = events.size + videos.size + forms.size + ministries.size + lifeGroups.size
}

sealed class SearchEffect {
    data class NavigateToAgendaDetail(val eventId: String) : SearchEffect()
    data class NavigateToFormDetail(val formId: String) : SearchEffect()
    data class NavigateToMinistryDetail(val ministryId: String) : SearchEffect()
    data class NavigateToLifeGroupDetail(val lifeGroupId: String) : SearchEffect()
}
