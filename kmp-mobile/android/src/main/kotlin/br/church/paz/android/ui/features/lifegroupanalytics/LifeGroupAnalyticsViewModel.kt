package br.church.paz.android.ui.features.lifegroupanalytics

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.repository.ChurchRepository
import br.church.paz.shared.domain.repository.LifeGroupAnalyticsRepository
import kotlinx.coroutines.async
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate

class LifeGroupAnalyticsViewModel(
    initialLifeGroupId: Int?,
    private val analyticsRepository: LifeGroupAnalyticsRepository,
    private val churchRepository: ChurchRepository,
) : ViewModel() {
    private val _uiState =
        MutableStateFlow(
            LifeGroupAnalyticsUiState(year = LocalDate.now().year, lifeGroupId = initialLifeGroupId),
        )
    val uiState: StateFlow<LifeGroupAnalyticsUiState> = _uiState.asStateFlow()

    private val _effect = Channel<LifeGroupAnalyticsEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        loadLifeGroups()
        load()
    }

    private fun loadLifeGroups() {
        viewModelScope.launch {
            runCatching { churchRepository.getAllLifeGroups() }
                .onSuccess { groups ->
                    _uiState.update { it.copy(lifeGroups = groups.map { g -> g.id to g.name }) }
                }
        }
    }

    fun load() {
        val state = _uiState.value
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            runCatching {
                val attendanceDeferred =
                    async {
                        analyticsRepository.getAttendance(
                            year = state.year,
                            month = state.month,
                            lifeGroupId = state.lifeGroupId,
                            granularity = if (state.month != null) "meeting" else "month",
                        )
                    }
                val distributionDeferred =
                    async { analyticsRepository.getDistribution(lifeGroupId = state.lifeGroupId) }
                attendanceDeferred.await() to distributionDeferred.await()
            }.onSuccess { (attendance, distribution) ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        attendanceRows = attendance.rows,
                        byDay = distribution.byDay,
                        byHour = distribution.byHour,
                        byNeighborhood = distribution.byNeighborhood,
                        byCity = distribution.byCity,
                    )
                }
            }.onFailure { e ->
                _uiState.update {
                    it.copy(isLoading = false, error = e.message ?: "Erro ao carregar relatórios")
                }
            }
        }
    }

    fun onYearSelected(year: Int) {
        _uiState.update { it.copy(year = year) }
        load()
    }

    fun onMonthSelected(month: Int?) {
        _uiState.update { it.copy(month = month) }
        load()
    }

    fun onLifeGroupSelected(lifeGroupId: Int?) {
        _uiState.update { it.copy(lifeGroupId = lifeGroupId) }
        load()
    }

    fun onDistributionTabSelected(tab: DistributionTab) {
        _uiState.update { it.copy(distributionTab = tab) }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(LifeGroupAnalyticsEffect.NavigateBack) }
    }
}
