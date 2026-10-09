package br.church.paz.android.ui.features.ministries

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.model.isLeader
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.domain.repository.ChurchRepository
import br.church.paz.shared.domain.repository.CreateMinistryRequest
import br.church.paz.shared.domain.repository.FormsRepository
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class MinistryLeaderPickerTarget { LEADER, CO_LEADER }

class MinistriesViewModel(
    private val churchRepository: ChurchRepository,
    private val authRepository: AuthRepository,
    private val formsRepository: FormsRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(MinistriesUiState())
    val uiState: StateFlow<MinistriesUiState> = _uiState.asStateFlow()

    private val _effect = Channel<MinistriesEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    init {
        load()
    }

    fun load() = fetch(showSkeleton = true)

    /** Pull-to-refresh entry point — re-invokes the same load path without the full-screen skeleton. */
    fun refresh() = fetch(showSkeleton = false)

    private fun fetch(showSkeleton: Boolean) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = showSkeleton, isRefreshing = !showSkeleton, error = null) }
            val currentUser = runCatching { authRepository.currentUser() }.getOrNull()
            runCatching { churchRepository.getAllMinistries() }
                .onSuccess { ministries ->
                    _uiState.update {
                        it.copy(
                            ministries = ministries,
                            isLoading = false,
                            isRefreshing = false,
                            error = null,
                            canManage = currentUser?.role?.isLeader == true,
                        )
                    }
                }.onFailure { e ->
                    _uiState.update {
                        it.copy(isLoading = false, isRefreshing = false, error = e.message ?: "Erro ao carregar dados")
                    }
                }
        }
    }

    fun onMinistryTap(ministryId: String) {
        viewModelScope.launch { _effect.send(MinistriesEffect.NavigateToMinistryDetail(ministryId)) }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(MinistriesEffect.NavigateBack) }
    }

    fun onRetry() {
        _uiState.update { it.copy(isLoading = true, error = null) }
        load()
    }

    // ── Create ministry sheet ────────────────────────────────────────────

    fun onCreateMinistryOpen() {
        _uiState.update { it.copy(createForm = MinistryCreateFormState()) }
    }

    fun onCreateMinistryDismiss() {
        _uiState.update { it.copy(createForm = null) }
    }

    fun onCreateNameChanged(name: String) {
        _uiState.update { it.copy(createForm = it.createForm?.copy(name = name, error = null)) }
    }

    fun onCreateDescriptionChanged(description: String) {
        _uiState.update { it.copy(createForm = it.createForm?.copy(description = description)) }
    }

    fun onCreateMembershipModeChanged(mode: String) {
        _uiState.update { it.copy(createForm = it.createForm?.copy(membershipMode = mode)) }
    }

    fun onLeaderSearchQueryChanged(
        target: MinistryLeaderPickerTarget,
        query: String,
    ) {
        val form = _uiState.value.createForm ?: return
        _uiState.update {
            it.copy(
                createForm =
                    when (target) {
                        MinistryLeaderPickerTarget.LEADER ->
                            form.copy(leaderSearchQuery = query, isSearchingLeader = true)
                        MinistryLeaderPickerTarget.CO_LEADER ->
                            form.copy(coLeaderSearchQuery = query, isSearchingCoLeader = true)
                    },
            )
        }
        viewModelScope.launch {
            runCatching { formsRepository.searchUsers(query) }
                .onSuccess { results ->
                    _uiState.update { s ->
                        s.copy(
                            createForm =
                                when (target) {
                                    MinistryLeaderPickerTarget.LEADER ->
                                        s.createForm?.copy(leaderSearchResults = results, isSearchingLeader = false)
                                    MinistryLeaderPickerTarget.CO_LEADER ->
                                        s.createForm?.copy(coLeaderSearchResults = results, isSearchingCoLeader = false)
                                },
                        )
                    }
                }.onFailure { e ->
                    _uiState.update { s ->
                        s.copy(
                            createForm =
                                when (target) {
                                    MinistryLeaderPickerTarget.LEADER ->
                                        s.createForm?.copy(isSearchingLeader = false, error = e.message)
                                    MinistryLeaderPickerTarget.CO_LEADER ->
                                        s.createForm?.copy(isSearchingCoLeader = false, error = e.message)
                                },
                        )
                    }
                }
        }
    }

    fun onLeaderSelected(
        id: String,
        name: String,
    ) {
        _uiState.update {
            it.copy(createForm = it.createForm?.copy(leaderId = id.toIntOrNull(), leaderName = name))
        }
    }

    fun onCoLeaderSelected(
        id: String,
        name: String,
    ) {
        _uiState.update {
            it.copy(createForm = it.createForm?.copy(coLeaderId = id.toIntOrNull(), coLeaderName = name))
        }
    }

    fun onCreateConfirm() {
        val form = _uiState.value.createForm ?: return
        val leaderId = form.leaderId ?: return
        if (!form.canSubmit) return
        _uiState.update { it.copy(createForm = form.copy(isSaving = true, error = null)) }
        viewModelScope.launch {
            runCatching {
                churchRepository.createMinistry(
                    CreateMinistryRequest(
                        name = form.name,
                        description = form.description.takeIf { it.isNotBlank() },
                        leaderId = leaderId,
                        coLeaderId = form.coLeaderId,
                        membershipMode = form.membershipMode,
                    ),
                )
            }.onSuccess {
                _uiState.update { it.copy(createForm = null) }
                load()
            }.onFailure { e ->
                _uiState.update { s ->
                    s.copy(createForm = s.createForm?.copy(isSaving = false, error = e.message ?: "Erro ao criar ministério"))
                }
            }
        }
    }
}
