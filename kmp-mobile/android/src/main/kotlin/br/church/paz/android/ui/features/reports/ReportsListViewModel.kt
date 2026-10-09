package br.church.paz.android.ui.features.reports

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.model.isLeader
import br.church.paz.shared.domain.repository.AuthRepository
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class ReportsListViewModel(
    private val authRepository: AuthRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(ReportsListUiState())
    val uiState: StateFlow<ReportsListUiState> = _uiState.asStateFlow()

    private val _effect = Channel<ReportsListEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        viewModelScope.launch {
            val user = authRepository.currentUser()
            _uiState.update { it.copy(isLoading = false, isLeader = user?.role?.isLeader == true) }
        }
    }

    fun onCasaDePaz() = emit(ReportsListEffect.NavigateToCasaDePaz)

    fun onLifeGroupAnalytics() = emit(ReportsListEffect.NavigateToLifeGroupAnalytics)

    fun onCasaDePazAnalytics() = emit(ReportsListEffect.NavigateToCasaDePazAnalytics)

    private fun emit(effect: ReportsListEffect) {
        viewModelScope.launch { _effect.send(effect) }
    }
}
