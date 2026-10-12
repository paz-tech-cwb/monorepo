package br.church.paz.android.ui.features.lifegroupreports

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.data.remote.httpStatusCodeOrNull
import br.church.paz.shared.domain.repository.LifeGroupReportRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class LifeGroupReportsViewModel(
    private val lifeGroupId: Int,
    private val repository: LifeGroupReportRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(LifeGroupReportsUiState())
    val uiState: StateFlow<LifeGroupReportsUiState> = _uiState.asStateFlow()

    private val _effect = Channel<LifeGroupReportsEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        load(showSkeleton = true)
    }

    fun load() {
        load(showSkeleton = true)
    }

    /** Pull-to-refresh entry point — re-invokes the same load path without the full-screen skeleton. */
    fun refresh() {
        load(showSkeleton = false)
    }

    private fun load(showSkeleton: Boolean) {
        viewModelScope.launch {
            _uiState.update {
                it.copy(isLoading = showSkeleton, isRefreshing = !showSkeleton, error = null, noAccess = false)
            }
            try {
                val reports = repository.getReports(lifeGroupId)
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        isRefreshing = false,
                        reports = reports.sortedByDescending { r -> r.date },
                    )
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                val forbidden = e.httpStatusCodeOrNull() == 403
                val message = e.message ?: "Erro ao carregar relatórios"
                // A failed refresh must not wipe a list the user is already reading:
                // keep it and surface the failure transiently instead.
                val keepContent = !forbidden && _uiState.value.reports.isNotEmpty()
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        isRefreshing = false,
                        noAccess = forbidden,
                        error = if (forbidden || keepContent) null else message,
                    )
                }
                if (keepContent) _effect.send(LifeGroupReportsEffect.ShowError(message))
            }
        }
    }

    fun onReportTapped(reportId: String) {
        viewModelScope.launch { _effect.send(LifeGroupReportsEffect.NavigateToDetail(reportId)) }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(LifeGroupReportsEffect.NavigateBack) }
    }
}

class LifeGroupReportDetailViewModel(
    private val reportId: String,
    private val repository: LifeGroupReportRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(LifeGroupReportDetailUiState())
    val uiState: StateFlow<LifeGroupReportDetailUiState> = _uiState.asStateFlow()

    private val _effect = Channel<LifeGroupReportDetailEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null, noAccess = false) }
            try {
                val report = repository.getReport(reportId)
                _uiState.update { it.copy(isLoading = false, report = report) }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                val status = e.httpStatusCodeOrNull()
                val outOfScope = status == 403 || status == 404
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        noAccess = outOfScope,
                        error = if (outOfScope) null else e.message ?: "Erro ao carregar relatório",
                    )
                }
            }
        }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(LifeGroupReportDetailEffect.NavigateBack) }
    }
}
