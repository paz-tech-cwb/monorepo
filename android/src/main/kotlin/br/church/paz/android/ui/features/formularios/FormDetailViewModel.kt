package br.church.paz.android.ui.features.formularios

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.model.AreaSupervisorReportForm
import br.church.paz.shared.domain.model.ConversionForm
import br.church.paz.shared.domain.model.CourseForm
import br.church.paz.shared.domain.model.FormType
import br.church.paz.shared.domain.model.GuestForm
import br.church.paz.shared.domain.model.LifeGroupReportForm
import br.church.paz.shared.domain.model.MemberRegistrationForm
import br.church.paz.shared.domain.model.MultiplicationForm
import br.church.paz.shared.domain.model.SectorSupervisorReportForm
import br.church.paz.shared.domain.model.ServiceReportForm
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.domain.repository.FormsRepository
import br.church.paz.shared.domain.model.LifeGroupSummary
import br.church.paz.shared.domain.model.User
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class FormDetailViewModel(
    private val formId: String,
    private val formsRepository: FormsRepository,
    private val authRepository: AuthRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(FormDetailUiState())
    val uiState: StateFlow<FormDetailUiState> = _uiState.asStateFlow()

    private val _effect = Channel<FormDetailEffect>(Channel.BUFFERED)
    val effect = _effect.receiveAsFlow()

    private val brazilianDate = SimpleDateFormat("dd/MM/yyyy", Locale("pt", "BR"))

    init {
        loadForm()
    }

    private fun loadForm() {
        viewModelScope.launch {
            runCatching { formsRepository.getCatalog() }
                .onSuccess { catalog ->
                    val form = catalog.find { it.id == formId }
                    val today = brazilianDate.format(Date())
                    val initialFields =
                        form?.type?.fieldDefs()?.associate { def ->
                            def.key to when {
                                def.fieldType == FormFieldType.DATE -> today
                                def.fieldType == FormFieldType.PICKER && def.options.isNotEmpty() -> def.options[0]
                                def.fieldType == FormFieldType.SELECT && def.optionValues.isNotEmpty() -> def.optionValues[0]
                                else -> ""
                            }
                        } ?: emptyMap()
                    _uiState.update {
                        it.copy(form = form, isLoading = false, fields = initialFields)
                    }
                }.onFailure { e ->
                    _uiState.update {
                        it.copy(isLoading = false, error = e.message ?: "Erro ao carregar formulário")
                    }
                }
        }
    }

    fun onFieldChanged(
        key: String,
        value: String,
    ) {
        _uiState.update { state ->
            state.copy(fields = state.fields + (key to value), error = null)
        }
    }

    fun openPicker(def: FormFieldDef) {
        val isLifeGroup = def.fieldType == FormFieldType.LG_PICKER
        _uiState.update {
            it.copy(
                pickerState = PickerState(
                    key = def.key,
                    label = def.label,
                    isMulti = def.fieldType == FormFieldType.USER_MULTI_PICKER,
                    isLifeGroup = isLifeGroup,
                ),
            )
        }
    }

    fun closePicker() {
        _uiState.update { it.copy(pickerState = null) }
    }

    fun onPickerQueryChanged(query: String) {
        val state = _uiState.value.pickerState ?: return
        _uiState.update { it.copy(pickerState = state.copy(query = query, isLoading = true, error = null)) }
        viewModelScope.launch {
            runCatching {
                if (state.isLifeGroup) formsRepository.searchLifeGroups(query)
                else formsRepository.searchUsers(query)
            }.onSuccess { results ->
                _uiState.update { s ->
                    s.copy(pickerState = s.pickerState?.copy(results = results, isLoading = false))
                }
            }.onFailure { e ->
                _uiState.update { s ->
                    s.copy(pickerState = s.pickerState?.copy(error = e.message, isLoading = false))
                }
            }
        }
    }

    fun onPickerSelect(id: String, name: String) {
        val state = _uiState.value.pickerState ?: return
        if (state.isMulti) {
            val current = (_uiState.value.fields[state.key] ?: "")
                .split(",").filter { it.isNotBlank() }.toMutableList()
            if (id in current) current.remove(id) else current.add(id)
            _uiState.update { it.copy(fields = it.fields + (state.key to current.joinToString(","))) }
        } else {
            _uiState.update {
                it.copy(
                    fields = it.fields + (state.key to id) + ("${state.key}_name" to name),
                    pickerState = null,
                )
            }
        }
    }

    fun setSelfOrSearchMode(key: String, isSearch: Boolean) {
        _uiState.update {
            val newMap = it.selfOrSearchIsSearch.toMutableMap().also { m -> m[key] = isSearch }
            val newFields = if (!isSearch) it.fields + (key to "") else it.fields
            it.copy(selfOrSearchIsSearch = newMap, fields = newFields)
        }
    }

    fun onSubmit() {
        val state = _uiState.value
        val form = state.form ?: return
        val fields = state.fields

        val missingField = form.type.fieldDefs().firstOrNull { it.required && fields[it.key].isNullOrEmpty() }
        if (missingField != null) {
            _uiState.update { it.copy(error = "${missingField.label} é obrigatório") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, error = null) }

            val result = submitForm(form.type, fields)
            result
                .onSuccess {
                    _uiState.update { it.copy(isSubmitting = false) }
                    _effect.send(FormDetailEffect.SubmitSuccess)
                }.onFailure { e ->
                    _uiState.update {
                        it.copy(isSubmitting = false, error = e.message ?: "Erro ao enviar formulário")
                    }
                }
        }
    }

    private suspend fun submitForm(
        type: FormType,
        f: Map<String, String>,
    ): Result<Unit> {
        val userId = authRepository.currentUser()?.id ?: ""
        return runCatching {
            when (type) {
                FormType.member_registration ->
                    formsRepository.submitMemberRegistration(
                        MemberRegistrationForm(
                            fullName = f.req("full_name"),
                            birthDate = f.isoDate("birth_date"),
                            phone = f.req("phone").filter { it.isDigit() }.let { "+55$it" }.takeIf { it.length > 3 } ?: f.req("phone"),
                            gender = f.req("gender"),
                            civilState = f.req("civil_state"),
                            sectorId = f.idInt("sector_id"),
                            email = f.opt("email"),
                            lifeGroupId = f.idInt("life_group_id").takeIf { it > 0 },
                            address = f.opt("address"),
                        ),
                    )
                FormType.conversion ->
                    formsRepository.submitConversion(
                        ConversionForm(
                            fullName = f.req("full_name"),
                            email = f.req("email"),
                            phone = f.req("phone"),
                            decisionType = f.req("decision_type"),
                            howMetChurch = f.req("how_met_church"),
                            gender = f.req("gender"),
                            birthDate = f.isoDate("birth_date"),
                            civilState = f.req("civil_state"),
                            address = f.req("address"),
                            attendanceCount = f.req("attendance_count"),
                            lifeGroupStatus = f.req("life_group_status"),
                            lifeGroupLeaderOrName = f.opt("life_group_leader_or_name"),
                            invitedBy = f.opt("invited_by"),
                            notes = f.opt("notes"),
                        ),
                    )
                FormType.guest -> {
                    val invitedBy = if (f["invited_by"].isNullOrEmpty()) {
                        authRepository.currentUser()?.name
                    } else {
                        f["invited_by"]
                    }
                    formsRepository.submitGuest(
                        GuestForm(
                            fullName = f.req("full_name"),
                            email = f.opt("email"),
                            phone = f.opt("phone"),
                            invitedBy = invitedBy,
                            viaCasaDePaz = f["via_casa_de_paz"] == "true",
                            howMetChurch = f.opt("how_met_church"),
                            address = f.opt("address"),
                            date = f.req("date"),
                        ),
                    )
                }
                FormType.multiplication ->
                    formsRepository.submitMultiplication(
                        MultiplicationForm(
                            date = f.req("date"),
                            sourceLifeGroupId = f.idInt("source_life_group_id"),
                            newLifeGroupName = f.req("new_life_group_name"),
                            newLeaderId = f.idInt("new_leader_id"),
                            hostId = f.idInt("host_id"),
                            leaderPhone = f.req("leader_phone"),
                            meetingDayTime = f.req("meeting_day_time"),
                            address = f.req("address"),
                            membersToMove = f.ids("members_to_move"),
                            newMembers = f.ids("new_members"),
                            completedLeadershipTrack = f["completed_leadership_track"] == "true",
                            legallyMarried = f["legally_married"]?.let { it == "true" },
                            faithfulTither = f["faithful_tither"] == "true",
                            evangelizingAndConsolidating = f["evangelizing_and_consolidating"] == "true",
                            goodTestimony = f["good_testimony"] == "true",
                            singleLivingInPurity = f["single_living_in_purity"]?.let { it == "true" },
                        ),
                    )
                FormType.service_report ->
                    formsRepository.submitServiceReport(
                        ServiceReportForm(
                            date = f.req("date"),
                            reportType = f.req("report_type"),
                            period = f.req("period"),
                            atmosphereTeamId = f.intOrNull("atmosphere_team_id"),
                            atmosphereResponsible = f.req("atmosphere_responsible"),
                            tadelAdults = f.int("tadel_adults"),
                            tadelKids = f.int("tadel_kids"),
                            vehiclesCars = f.int("vehicles_cars"),
                            vehiclesMotos = f.int("vehicles_motos"),
                            vehiclesBikes = f.int("vehicles_bikes"),
                            vehiclesOthers = f["vehicles_others"],
                            volunteersAtmosfera = f.int("volunteers_atmosfera"),
                            volunteersLouvor = f.int("volunteers_louvor"),
                            volunteersMiddia = f.int("volunteers_midia"),
                            volunteersDanca = f.int("volunteers_danca"),
                            notes = f["notes"],
                        ),
                    )
                FormType.course ->
                    formsRepository.submitCourse(
                        CourseForm(
                            courseName = f.req("course_name"),
                            memberId = userId,
                            enrolledAt = f.isoDate("enrolled_at"),
                        ),
                    )
                FormType.life_group_report ->
                    formsRepository.submitLifeGroupReport(
                        LifeGroupReportForm(
                            lifeGroupId = userId,
                            date = f.req("date"),
                            attendees = f.int("attendees"),
                            visitors = f.int("visitors"),
                            offerings = f.brlOrNull("offerings"),
                            observations = f.opt("observations"),
                        ),
                    )
                FormType.sector_supervisor_report ->
                    formsRepository.submitSectorReport(
                        SectorSupervisorReportForm(
                            date = f.req("date"),
                            sectorId = f.idInt("sector_id"),
                            lifeGroupsVisited = f.ids("life_groups_visited"),
                            leadersPastored = f.ids("leaders_pastored"),
                            multiplicationCandidates = f.ids("multiplication_candidates"),
                            lifeGroupsCount = f.int("life_groups_count"),
                            lifeGroupsSupervised = f.int("life_groups_supervised"),
                            lifeGroupObservations = (f.opt("life_group_observations") ?: "")
                                .split("\n").filter { it.isNotBlank() },
                            notes = f.opt("notes"),
                        ),
                    )
                FormType.area_supervisor_report ->
                    formsRepository.submitAreaReport(
                        AreaSupervisorReportForm(
                            date = f.req("date"),
                            areaId = f.idInt("area_id"),
                            sectorLeadersPastored = f.ids("sector_leaders_pastored"),
                            lifeGroupsCount = f.int("life_groups_count"),
                            lifeGroupsSupervised = f.int("life_groups_supervised"),
                            lifeGroupObservations = (f.opt("life_group_observations") ?: "")
                                .split("\n").filter { it.isNotBlank() },
                            notes = f.opt("notes"),
                        ),
                    )
            }
        }
    }

    fun onBack() {
        viewModelScope.launch { _effect.send(FormDetailEffect.NavigateBack) }
    }

    private fun Map<String, String>.req(key: String) = get(key)?.trim() ?: ""

    private fun Map<String, String>.opt(key: String) = get(key)?.trim()?.ifEmpty { null }

    private fun Map<String, String>.int(key: String) = get(key)?.trim()?.toIntOrNull() ?: 0

    private fun Map<String, String>.intOrNull(key: String) = get(key)?.trim()?.toIntOrNull()

    // Parse BRL-masked value e.g. "1.234,56" → 1234.56
    private fun Map<String, String>.brl(key: String): Double {
        val raw = get(key)?.trim() ?: return 0.0
        return raw.replace(".", "").replace(",", ".").toDoubleOrNull() ?: 0.0
    }

    private fun Map<String, String>.brlOrNull(key: String): Double? {
        val raw = get(key)?.trim() ?: return null
        if (raw == "0,00" || raw.isEmpty()) return null
        return raw.replace(".", "").replace(",", ".").toDoubleOrNull()
    }

    private fun Map<String, String>.isoDate(key: String): String {
        val raw = get(key)?.trim() ?: return ""
        return runCatching {
            val sdf = java.text.SimpleDateFormat("dd/MM/yyyy", java.util.Locale("pt", "BR"))
            val iso = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
            iso.format(sdf.parse(raw)!!)
        }.getOrDefault(raw)
    }

    private fun Map<String, String>.ids(key: String): List<Int> =
        (get(key) ?: "").split(",").filter { it.isNotBlank() }.mapNotNull { it.trim().toIntOrNull() }

    private fun Map<String, String>.idInt(key: String): Int =
        get(key)?.trim()?.toIntOrNull() ?: 0
}
