package br.church.paz.android.ui.features.formularios

import br.church.paz.shared.domain.model.FormCatalogItem
import br.church.paz.shared.domain.model.FormType

enum class FormFieldType {
    TEXT, NAME, PHONE, EMAIL, DATE, INTEGER, CURRENCY, MULTILINE, BOOLEAN,
    PICKER, // existing dropdown with string options (no separate value)
    SELECT, // enum picker: options = display labels, optionValues = API values
    USER_PICKER, // single user search picker → stores "id" as string
    USER_MULTI_PICKER, // multi user picker → stores "1,2,3" comma-separated IDs
    LG_PICKER, // life-group picker → stores "id" as string
    SELF_OR_SEARCH, // invited_by: "" = self, else searched name
}

data class FormFieldDef(
    val key: String,
    val label: String,
    val placeholder: String = "",
    val required: Boolean = false,
    val fieldType: FormFieldType = FormFieldType.TEXT,
    val options: List<String> = emptyList(), // display labels for SELECT/PICKER
    val optionValues: List<String> = emptyList(), // API values parallel to options; empty = value IS label
)

data class PickerState(
    val key: String, // which field is being picked
    val label: String, // field label for sheet header
    val isMulti: Boolean,
    val isLifeGroup: Boolean, // true = search life groups; false = search users
    val query: String = "",
    val results: List<Any> = emptyList(), // List<User> or List<LifeGroupSummary>
    val isLoading: Boolean = false,
    val error: String? = null,
)

data class FormDetailUiState(
    val form: FormCatalogItem? = null,
    val isLoading: Boolean = true,
    val isSubmitting: Boolean = false,
    val error: String? = null,
    val fields: Map<String, String> = emptyMap(),
    val pickerState: PickerState? = null, // non-null = picker sheet open
    val selfOrSearchIsSearch: Map<String, Boolean> = emptyMap(), // key → true if in search mode
)

sealed class FormDetailEffect {
    data object SubmitSuccess : FormDetailEffect()

    data object NavigateBack : FormDetailEffect()
}

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
                FormFieldDef("invited_by", "Convidado por", fieldType = FormFieldType.SELF_OR_SEARCH),
                FormFieldDef("via_casa_de_paz", "Veio de uma Casa de Paz?", fieldType = FormFieldType.BOOLEAN),
                FormFieldDef("date", "Data da Visita", "DD/MM/YYYY", required = true, fieldType = FormFieldType.DATE),
            )
        FormType.multiplication ->
            listOf(
                FormFieldDef("new_life_group_name", "Nome do Novo Grupo", "Ex: GL Norte", required = true),
                FormFieldDef("date", "Data da Multiplicação", "DD/MM/YYYY", required = true, fieldType = FormFieldType.DATE),
            )
        FormType.service_report ->
            listOf(
                FormFieldDef("date", "Data", "DD/MM/YYYY", required = true, fieldType = FormFieldType.DATE),
                FormFieldDef(
                    "report_type", "Tipo de relatório", "", required = true,
                    fieldType = FormFieldType.SELECT,
                    options = listOf("Tadel", "Culto", "Evento"),
                    optionValues = listOf("tadel", "culto_celebracao", "evento"),
                ),
                FormFieldDef(
                    "period", "Período", "", required = true,
                    fieldType = FormFieldType.SELECT,
                    options = listOf("Manhã", "Tarde-Noite"),
                    optionValues = listOf("manha", "tarde_noite"),
                ),
                FormFieldDef("atmosphere_team_id", "Equipe Atmosfera", "", fieldType = FormFieldType.INTEGER),
                FormFieldDef("atmosphere_responsible", "Responsável no dia", "", required = true),
                FormFieldDef("tadel_adults", "Adultos (Tadel)", "0", required = true, fieldType = FormFieldType.INTEGER),
                FormFieldDef("tadel_kids", "Crianças (Tadel)", "0", fieldType = FormFieldType.INTEGER),
                FormFieldDef("vehicles_cars", "Carros", "0", required = true, fieldType = FormFieldType.INTEGER),
                FormFieldDef("vehicles_motos", "Motos", "0", fieldType = FormFieldType.INTEGER),
                FormFieldDef("vehicles_bikes", "Bicicletas", "0", fieldType = FormFieldType.INTEGER),
                FormFieldDef("vehicles_others", "Outros veículos", "Ex: Ônibus - 2"),
                FormFieldDef("volunteers_atmosfera", "Voluntários Atmosfera", "0", fieldType = FormFieldType.INTEGER),
                FormFieldDef("volunteers_louvor", "Voluntários Louvor", "0", fieldType = FormFieldType.INTEGER),
                FormFieldDef("volunteers_midia", "Voluntários Mídia", "0", fieldType = FormFieldType.INTEGER),
                FormFieldDef("volunteers_danca", "Voluntários Dança", "0", fieldType = FormFieldType.INTEGER),
                FormFieldDef("notes", "Observação", "", fieldType = FormFieldType.MULTILINE),
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
