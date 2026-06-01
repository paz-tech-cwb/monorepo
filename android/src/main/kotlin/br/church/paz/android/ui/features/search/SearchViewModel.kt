package br.church.paz.android.ui.features.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.repository.AcademyRepository
import br.church.paz.shared.domain.repository.ChurchRepository
import br.church.paz.shared.domain.repository.FormsRepository
import br.church.paz.shared.domain.repository.HomeRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class SearchViewModel(
    private val homeRepository: HomeRepository,
    private val academyRepository: AcademyRepository,
    private val formsRepository: FormsRepository,
    private val churchRepository: ChurchRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(SearchUiState())
    val uiState: StateFlow<SearchUiState> = _uiState.asStateFlow()

    private val _effect = Channel<SearchEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    private var searchJob: Job? = null

    fun onQueryChanged(query: String) {
        _uiState.update { it.copy(query = query) }

        searchJob?.cancel()
        if (query.isBlank()) {
            _uiState.update { it.copy(results = SearchResults(), hasSearched = false, isSearching = false) }
            return
        }

        searchJob = viewModelScope.launch {
            delay(300) // debounce
            search(query.trim())
        }
    }

    private suspend fun search(query: String) {
        _uiState.update { it.copy(isSearching = true) }

        val q = query.lowercase()

        val homeResult = homeRepository.getHomeContent()
        val academyResult = academyRepository.getAcademyContent()
        val formsResult = formsRepository.getCatalog()
        val churchResult = churchRepository.getChurch()
        val lifeGroupsResult = churchRepository.getAllLifeGroups()

        val events = homeResult.getOrNull()?.agenda
            ?.filter { it.title.lowercase().contains(q) || it.description?.lowercase()?.contains(q) == true }
            ?: emptyList()

        val videos = academyResult.getOrNull()?.videos
            ?.filter { it.title.lowercase().contains(q) || it.category?.lowercase()?.contains(q) == true }
            ?: emptyList()

        val forms = formsResult.getOrNull()
            ?.filter { it.title.lowercase().contains(q) || it.description?.lowercase()?.contains(q) == true }
            ?: emptyList()

        val ministries = churchResult.getOrNull()?.ministries
            ?.filter { it.name.lowercase().contains(q) || it.description?.lowercase()?.contains(q) == true }
            ?: emptyList()

        val lifeGroups = lifeGroupsResult.getOrNull()
            ?.filter { it.name.lowercase().contains(q) || it.leader?.lowercase()?.contains(q) == true }
            ?: emptyList()

        _uiState.update {
            it.copy(
                isSearching = false,
                hasSearched = true,
                results = SearchResults(
                    events = events,
                    videos = videos,
                    forms = forms,
                    ministries = ministries,
                    lifeGroups = lifeGroups,
                ),
            )
        }
    }

    fun onEventTap(eventId: String) {
        viewModelScope.launch { _effect.send(SearchEffect.NavigateToAgendaDetail(eventId)) }
    }

    fun onFormTap(formId: String) {
        viewModelScope.launch { _effect.send(SearchEffect.NavigateToFormDetail(formId)) }
    }

    fun onMinistryTap(ministryId: String) {
        viewModelScope.launch { _effect.send(SearchEffect.NavigateToMinistryDetail(ministryId)) }
    }

    fun onLifeGroupTap(lifeGroupId: String) {
        viewModelScope.launch { _effect.send(SearchEffect.NavigateToLifeGroupDetail(lifeGroupId)) }
    }
}
