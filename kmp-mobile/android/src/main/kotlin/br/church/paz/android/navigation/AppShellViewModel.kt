package br.church.paz.android.navigation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.model.isPastorOrAdmin
import br.church.paz.shared.domain.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class AppShellViewModel(
    private val authRepository: AuthRepository,
) : ViewModel() {
    private val _showRelatorios = MutableStateFlow(false)
    val showRelatorios: StateFlow<Boolean> = _showRelatorios.asStateFlow()

    init {
        viewModelScope.launch {
            val user = runCatching { authRepository.currentUser() }.getOrNull()
            _showRelatorios.value = user?.role?.isPastorOrAdmin == true
        }
    }
}
