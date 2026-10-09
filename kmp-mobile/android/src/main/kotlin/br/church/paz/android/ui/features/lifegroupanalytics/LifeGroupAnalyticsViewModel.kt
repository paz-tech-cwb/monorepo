package br.church.paz.android.ui.features.lifegroupanalytics

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.data.remote.httpStatusCodeOrNull
import br.church.paz.shared.domain.repository.LifeGroupAnalyticsRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.coroutineScope
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
) : ViewModel() {
    private val _uiState =
        MutableStateFlow(
            LifeGroupAnalyticsUiState(year = LocalDate.now().year, lifeGroupId = initialLifeGroupId),
        )
    val uiState: StateFlow<LifeGroupAnalyticsUiState> = _uiState.asStateFlow()

    private val _effect = Channel<LifeGroupAnalyticsEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    // `isLoading` must only ever be true for the genuine first load, before
    // any content has rendered — set once load() has run at least once so
    // every subsequent filter-triggered reload uses `isRefreshing` instead
    // and the filter row stays mounted (root cause C).
    private var hasLoadedOnce = false

    // Rapid successive filter taps (enabled by root cause C's fix keeping the
    // filter row tappable mid-reload) can otherwise fire overlapping load()
    // calls that resolve out of order — cancelling the previous one before
    // starting a new one guarantees only the latest filter selection's
    // response is ever applied to state.
    private var loadJob: Job? = null

    init {
        loadOverview()
        load()
    }

    // Best-effort — the stat cards + donuts this feeds are additive to the
    // attendance/distribution charts, so a failure here must not surface as
    // the screen's main error state. Also the sole source of the filter
    // dropdown's options: `overview.lifeGroups` is scoped server-side to
    // exactly the groups this user may query, so the dropdown can never
    // offer a group that 403s on attendance/distribution (root cause B).
    private fun loadOverview() {
        viewModelScope.launch {
            runCatching { analyticsRepository.getOverview() }
                .onSuccess { overview ->
                    _uiState.update {
                        it.copy(
                            overview = overview,
                            lifeGroups = overview.lifeGroups.map { g -> g.id to g.name },
                        )
                    }
                }
        }
    }

    /** Pull-to-refresh entry point — re-invokes the same load path; `hasLoadedOnce` ensures it never re-shows the full-screen skeleton. */
    fun refresh() = load()

    fun load() {
        val state = _uiState.value
        val isFirstLoad = !hasLoadedOnce
        hasLoadedOnce = true

        // Cancel any still-in-flight previous load before starting this one —
        // without this, two concurrent loads (e.g. tapping group A then
        // quickly group B) can resolve out of order and the stale response
        // overwrites the newer one's state.
        loadJob?.cancel()
        loadJob =
            viewModelScope.launch {
                _uiState.update {
                    if (isFirstLoad) {
                        it.copy(isLoading = true, error = null, attendanceError = null, distributionError = null)
                    } else {
                        it.copy(isRefreshing = true, error = null, attendanceError = null, distributionError = null)
                    }
                }
                try {
                    coroutineScope {
                        // Attendance and distribution are independent endpoints/charts — each
                        // result (success or failure) is tracked separately so a 403 (or any
                        // other failure) on one never hides the other's successfully-loaded
                        // content or the always-independent `overview` section.
                        val attendanceDeferred =
                            async {
                                runCatchingCancellable {
                                    analyticsRepository.getAttendance(
                                        year = state.year,
                                        month = state.month,
                                        lifeGroupId = state.lifeGroupId,
                                        granularity = if (state.month != null) "meeting" else "month",
                                    )
                                }
                            }
                        val distributionDeferred =
                            async {
                                runCatchingCancellable { analyticsRepository.getDistribution(lifeGroupId = state.lifeGroupId) }
                            }

                        val attendanceResult = attendanceDeferred.await()
                        val distributionResult = distributionDeferred.await()

                        _uiState.update { current ->
                            current.copy(
                                isLoading = false,
                                isRefreshing = false,
                                attendanceRows = attendanceResult.getOrNull()?.rows ?: current.attendanceRows,
                                attendanceError = attendanceResult.exceptionOrNull()?.toInlineErrorMessage(),
                                byDay = distributionResult.getOrNull()?.byDay ?: current.byDay,
                                byHour = distributionResult.getOrNull()?.byHour ?: current.byHour,
                                byNeighborhood = distributionResult.getOrNull()?.byNeighborhood ?: current.byNeighborhood,
                                byCity = distributionResult.getOrNull()?.byCity ?: current.byCity,
                                distributionError = distributionResult.exceptionOrNull()?.toInlineErrorMessage(),
                            )
                        }
                    }
                } catch (e: CancellationException) {
                    // A cancelled load (superseded by a newer filter selection) must
                    // not be treated as a failure — re-throw so structured
                    // cancellation keeps working and no spurious error is shown.
                    throw e
                } catch (e: Exception) {
                    _uiState.update {
                        it.copy(isLoading = false, isRefreshing = false, error = e.message ?: "Erro ao carregar relatórios")
                    }
                }
            }
    }

    private fun Throwable.toInlineErrorMessage(): String =
        // Defense in depth: even with the dropdown now scoped to only queryable
        // groups (root cause B), an unexpected 403 here (e.g. scoping drift) must
        // not wipe the whole screen — show an inline message on the affected
        // chart only and keep the rest of the report (and the filters) intact.
        if (httpStatusCodeOrNull() == 403) "Sem acesso a este grupo." else (message ?: "Erro ao carregar dados.")

    private suspend fun <T> runCatchingCancellable(block: suspend () -> T): Result<T> =
        try {
            Result.success(block())
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Result.failure(e)
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
