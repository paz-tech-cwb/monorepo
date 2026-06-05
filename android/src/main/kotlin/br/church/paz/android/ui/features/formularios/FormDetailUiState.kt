package br.church.paz.android.ui.features.formularios

import br.church.paz.shared.domain.model.FormCatalogItem
import br.church.paz.shared.domain.model.FormType

data class FormDetailUiState(
    val form: FormCatalogItem? = null,
    val isLoading: Boolean = true,
    val isSubmitting: Boolean = false,
    val error: String? = null,
    // Generic field map — keys are field names, values are user input
    val fields: Map<String, String> = emptyMap(),
)

sealed class FormDetailEffect {
    data object SubmitSuccess : FormDetailEffect()

    data object NavigateBack : FormDetailEffect()
}

// Field descriptors for each form type
data class FormFieldDef(
    val key: String,
    val label: String,
    val placeholder: String = "",
    val required: Boolean = false,
    val isNumeric: Boolean = false,
    val isMultiline: Boolean = false,
)

fun FormType.fieldDefs(): List<FormFieldDef> =
    when (this) {
        FormType.member_registration ->
            listOf(
                FormFieldDef("name", "Nome Completo", "Digite o nome", required = true),
                FormFieldDef("phone", "Telefone", "(41) 9 9999-9999"),
                FormFieldDef("email", "E-mail", "email@exemplo.com"),
            )
        FormType.conversion ->
            listOf(
                FormFieldDef("name", "Nome", "Nome do convertido", required = true),
                FormFieldDef("phone", "Telefone", "(41) 9 9999-9999"),
                FormFieldDef("date", "Data da Conversão", "DD/MM/YYYY", required = true),
                FormFieldDef("observations", "Observações", "Algo a registrar?", isMultiline = true),
            )
        FormType.guest ->
            listOf(
                FormFieldDef("name", "Nome do Visitante", required = true),
                FormFieldDef("phone", "Telefone", "(41) 9 9999-9999"),
                FormFieldDef("invited_by", "Convidado por"),
                FormFieldDef("date", "Data da Visita", "DD/MM/YYYY", required = true),
            )
        FormType.multiplication ->
            listOf(
                FormFieldDef("new_life_group_name", "Nome do Novo Grupo", required = true),
                FormFieldDef("date", "Data da Multiplicação", "DD/MM/YYYY", required = true),
            )
        FormType.service_report ->
            listOf(
                FormFieldDef("date", "Data do Culto", "DD/MM/YYYY", required = true),
                FormFieldDef("attendees", "Participantes", "0", required = true, isNumeric = true),
                FormFieldDef("visitors", "Visitantes", "0", isNumeric = true),
                FormFieldDef("offerings", "Ofertas (R$)", "0,00", isNumeric = true),
                FormFieldDef("observations", "Observações", isMultiline = true),
            )
        FormType.course ->
            listOf(
                FormFieldDef("course_name", "Nome do Curso", required = true),
                FormFieldDef("enrolled_at", "Data de Inscrição", "DD/MM/YYYY", required = true),
            )
        FormType.life_group_report,
        FormType.sector_supervisor_report,
        FormType.area_supervisor_report,
        ->
            listOf(
                FormFieldDef("date", "Data da Reunião", "DD/MM/YYYY", required = true),
                FormFieldDef("attendees", "Participantes", "0", required = true, isNumeric = true),
                FormFieldDef("visitors", "Visitantes", "0", isNumeric = true),
                FormFieldDef("offerings", "Ofertas (R$)", "0,00", isNumeric = true),
                FormFieldDef("observations", "Observações", isMultiline = true),
            )
    }
