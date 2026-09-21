package br.church.paz.android.ui.features.academy

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.repository.CourseCertificateEntry
import br.church.paz.shared.domain.repository.CourseRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class CertificatesUiState(
    val isLoading: Boolean = true,
    val certificates: List<CourseCertificateEntry> = emptyList(),
    val error: String? = null,
)

class CertificatesViewModel(
    private val courseRepository: CourseRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(CertificatesUiState())
    val uiState: StateFlow<CertificatesUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            runCatching { courseRepository.listCertificates() }
                .onSuccess { certificates -> _uiState.update { it.copy(isLoading = false, certificates = certificates) } }
                .onFailure { e -> _uiState.update { it.copy(isLoading = false, error = e.message) } }
        }
    }
}
