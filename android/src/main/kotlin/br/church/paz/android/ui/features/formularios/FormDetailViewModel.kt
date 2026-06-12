package br.church.paz.android.ui.features.formularios

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.church.paz.shared.domain.model.ConversionForm
import br.church.paz.shared.domain.model.CourseForm
import br.church.paz.shared.domain.model.FormType
import br.church.paz.shared.domain.model.GuestForm
import br.church.paz.shared.domain.model.LifeGroupReportForm
import br.church.paz.shared.domain.model.MemberRegistrationForm
import br.church.paz.shared.domain.model.MultiplicationForm
import br.church.paz.shared.domain.model.ServiceReportForm
import br.church.paz.shared.domain.repository.AuthRepository
import br.church.paz.shared.domain.repository.FormsRepository
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
                    val initialFields = form?.type?.fieldDefs()?.associate { def ->
                        def.key to if (def.fieldType == FormFieldType.DATE) today else ""
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

    fun onFieldChanged(key: String, value: String) {
        _uiState.update { state ->
            state.copy(fields = state.fields + (key to value), error = null)
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

    private suspend fun submitForm(type: FormType, f: Map<String, String>): Result<Unit> {
        val userId = authRepository.currentUser()?.id ?: ""
        return runCatching {
            when (type) {
                FormType.member_registration ->
                    formsRepository.submitMemberRegistration(
                        MemberRegistrationForm(name = f.req("name"), phone = f.opt("phone"), email = f.opt("email")),
                    )
                FormType.conversion ->
                    formsRepository.submitConversion(
                        ConversionForm(
                            name = f.req("name"),
                            phone = f.opt("phone"),
                            date = f.req("date"),
                            observations = f.opt("observations"),
                        ),
                    )
                FormType.guest ->
                    formsRepository.submitGuest(
                        GuestForm(
                            name = f.req("name"),
                            phone = f.opt("phone"),
                            invitedBy = f.opt("invited_by"),
                            viaCasaDePaz = f["via_casa_de_paz"]?.toBooleanStrictOrNull() ?: false,
                            date = f.req("date"),
                        ),
                    )
                FormType.multiplication ->
                    formsRepository.submitMultiplication(
                        MultiplicationForm(
                            originalLifeGroupId = userId,
                            newLifeGroupName = f.req("new_life_group_name"),
                            newLeaderId = userId,
                            date = f.req("date"),
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
                        CourseForm(courseName = f.req("course_name"), memberId = userId, enrolledAt = f.req("enrolled_at")),
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
                        LifeGroupReportForm(
                            lifeGroupId = userId,
                            date = f.req("date"),
                            attendees = f.int("attendees"),
                            visitors = f.int("visitors"),
                            offerings = f.brlOrNull("offerings"),
                            observations = f.opt("observations"),
                        ),
                    )
                FormType.area_supervisor_report ->
                    formsRepository.submitAreaReport(
                        LifeGroupReportForm(
                            lifeGroupId = userId,
                            date = f.req("date"),
                            attendees = f.int("attendees"),
                            visitors = f.int("visitors"),
                            offerings = f.brlOrNull("offerings"),
                            observations = f.opt("observations"),
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
}
