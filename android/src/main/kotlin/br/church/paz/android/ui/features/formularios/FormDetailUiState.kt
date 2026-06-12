package br.church.paz.android.ui.features.formularios

import br.church.paz.shared.domain.model.FormCatalogItem
import br.church.paz.shared.domain.model.FormType

data class FormDetailUiState(
    val form: FormCatalogItem? = null,
    val isLoading: Boolean = true,
    val isSubmitting: Boolean = false,
    val error: String? = null,
    val fields: Map<String, String> = emptyMap(),
)

sealed class FormDetailEffect {
    data object SubmitSuccess : FormDetailEffect()
    data object NavigateBack : FormDetailEffect()
}

enum class FormFieldType { TEXT, NAME, PHONE, EMAIL, DATE, INTEGER, CURRENCY, MULTILINE }

data class FormFieldDef(
    val key: String,
    val label: String,
    val placeholder: String = "",
    val required: Boolean = false,
    val fieldType: FormFieldType = FormFieldType.TEXT,
)

fun FormType.fieldDefs(): List<FormFieldDef> =
    when (this) {
        FormType.member_registration ->
            listOf(
                FormFieldDef("name", "Nome Completo", "Digite o nome completo", required = true, fieldType = FormFieldType.NAME),
                FormFieldDef("phone", "Telefone", "(41) 9 9999-9999", fieldType = FormFieldType.PHONE),
                FormFieldDef("email", "E-mail", "email@exemplo.com", fieldType = FormFieldType.EMAIL),
            )
        FormType.conversion ->
            listOf(
                FormFieldDef("name", "Nome", "Nome do convertido", required = true, fieldType = FormFieldType.NAME),
                FormFieldDef("phone", "Telefone", "(41) 9 9999-9999", fieldType = FormFieldType.PHONE),
                FormFieldDef("date", "Data da Conversão", "DD/MM/YYYY", required = true, fieldType = FormFieldType.DATE),
                FormFieldDef("observations", "Observações", fieldType = FormFieldType.MULTILINE),
            )
        FormType.guest ->
            listOf(
                FormFieldDef("name", "Nome do Visitante", "Nome completo", required = true, fieldType = FormFieldType.NAME),
                FormFieldDef("phone", "Telefone", "(41) 9 9999-9999", fieldType = FormFieldType.PHONE),
                FormFieldDef("invited_by", "Convidado por", "Nome de quem convidou"),
                FormFieldDef("date", "Data da Visita", "DD/MM/YYYY", required = true, fieldType = FormFieldType.DATE),
            )
        FormType.multiplication ->
            listOf(
                FormFieldDef("new_life_group_name", "Nome do Novo Grupo", "Ex: GL Norte", required = true),
                FormFieldDef("date", "Data da Multiplicação", "DD/MM/YYYY", required = true, fieldType = FormFieldType.DATE),
            )
        FormType.service_report ->
            listOf(
                FormFieldDef("date", "Data do Culto", "DD/MM/YYYY", required = true, fieldType = FormFieldType.DATE),
                FormFieldDef("attendees", "Quantidade de Participantes", "0", required = true, fieldType = FormFieldType.INTEGER),
                FormFieldDef("visitors", "Quantidade de Visitantes", "0", fieldType = FormFieldType.INTEGER),
                FormFieldDef("offerings", "Oferta (R$)", "0,00", fieldType = FormFieldType.CURRENCY),
                FormFieldDef("observations", "Observações", fieldType = FormFieldType.MULTILINE),
            )
        FormType.course ->
            listOf(
                FormFieldDef("course_name", "Nome do Curso", "Ex: Escola de Membros", required = true),
                FormFieldDef("enrolled_at", "Data de Inscrição", "DD/MM/YYYY", required = true, fieldType = FormFieldType.DATE),
            )
        FormType.life_group_report ->
            listOf(
                FormFieldDef("date", "Data da Reunião", "DD/MM/YYYY", required = true, fieldType = FormFieldType.DATE),
                FormFieldDef("attendees", "Quantidade de Participantes", "0", required = true, fieldType = FormFieldType.INTEGER),
                FormFieldDef("visitors", "Quantidade de Visitantes", "0", fieldType = FormFieldType.INTEGER),
                FormFieldDef("offerings", "Oferta (R$)", "0,00", fieldType = FormFieldType.CURRENCY),
                FormFieldDef("observations", "Observações", fieldType = FormFieldType.MULTILINE),
            )
        FormType.sector_supervisor_report ->
            listOf(
                FormFieldDef("date", "Data do Relatório", "DD/MM/YYYY", required = true, fieldType = FormFieldType.DATE),
                FormFieldDef("attendees", "Total de Participantes", "0", required = true, fieldType = FormFieldType.INTEGER),
                FormFieldDef("visitors", "Total de Visitantes", "0", fieldType = FormFieldType.INTEGER),
                FormFieldDef("offerings", "Total de Ofertas (R$)", "0,00", fieldType = FormFieldType.CURRENCY),
                FormFieldDef("observations", "Observações", fieldType = FormFieldType.MULTILINE),
            )
        FormType.area_supervisor_report ->
            listOf(
                FormFieldDef("date", "Data do Relatório", "DD/MM/YYYY", required = true, fieldType = FormFieldType.DATE),
                FormFieldDef("attendees", "Total de Participantes", "0", required = true, fieldType = FormFieldType.INTEGER),
                FormFieldDef("visitors", "Total de Visitantes", "0", fieldType = FormFieldType.INTEGER),
                FormFieldDef("offerings", "Total de Ofertas (R$)", "0,00", fieldType = FormFieldType.CURRENCY),
                FormFieldDef("observations", "Observações", fieldType = FormFieldType.MULTILINE),
            )
    }
