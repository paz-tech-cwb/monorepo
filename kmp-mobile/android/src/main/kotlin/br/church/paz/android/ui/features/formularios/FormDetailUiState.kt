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

fun FormType.fieldDefs(): List<FormFieldDef> = when (this) {
    FormType.service_report -> listOf(
        FormFieldDef("date", "Data", "DD/MM/YYYY", required = true, fieldType = FormFieldType.DATE),
        FormFieldDef("report_type", "Tipo de relatório", required = true, fieldType = FormFieldType.SELECT,
            options = listOf("Tadel", "Culto de celebração", "Evento"),
            optionValues = listOf("tadel", "culto_celebracao", "evento")),
        FormFieldDef("period", "Período", required = true, fieldType = FormFieldType.SELECT,
            options = listOf("Manhã", "Tarde/Noite"),
            optionValues = listOf("manha", "tarde_noite")),
        FormFieldDef("atmosphere_team_id", "Equipe Atmosfera", fieldType = FormFieldType.INTEGER),
        FormFieldDef("atmosphere_responsible", "Responsável no dia", required = true),
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
        FormFieldDef("notes", "Observação", fieldType = FormFieldType.MULTILINE),
    )
    FormType.guest -> listOf(
        FormFieldDef("date", "Data da Visita", "DD/MM/YYYY", required = true, fieldType = FormFieldType.DATE),
        FormFieldDef("full_name", "Nome do Visitante", "Nome completo", required = true, fieldType = FormFieldType.NAME),
        FormFieldDef("email", "E-mail", "email@exemplo.com", required = true, fieldType = FormFieldType.EMAIL),
        FormFieldDef("phone", "Telefone", "(41) 9 9999-9999", fieldType = FormFieldType.PHONE),
        FormFieldDef("invited_by", "Convidado por", fieldType = FormFieldType.SELF_OR_SEARCH),
        FormFieldDef("via_casa_de_paz", "Veio de uma Casa de Paz?", fieldType = FormFieldType.BOOLEAN),
        FormFieldDef("how_met_church", "Como conheceu a igreja?"),
        FormFieldDef("address", "Endereço"),
    )
    FormType.multiplication -> listOf(
        FormFieldDef("date", "Data da Multiplicação", "DD/MM/YYYY", required = true, fieldType = FormFieldType.DATE),
        FormFieldDef("source_life_group_id", "Grupo de Vida de Origem", required = true, fieldType = FormFieldType.LG_PICKER),
        FormFieldDef("new_life_group_name", "Nome do Novo Grupo", "Ex: GL Norte", required = true),
        FormFieldDef("new_leader_id", "Novo Líder", required = true, fieldType = FormFieldType.USER_PICKER),
        FormFieldDef("host_id", "Anfitrião", required = true, fieldType = FormFieldType.USER_PICKER),
        FormFieldDef("leader_phone", "Telefone do Líder", required = true, fieldType = FormFieldType.PHONE),
        FormFieldDef("meeting_day_time", "Dia e Horário", "Ex: Sexta 19h", required = true),
        FormFieldDef("address", "Endereço", required = true),
        FormFieldDef("members_to_move", "Membros a Transferir", fieldType = FormFieldType.USER_MULTI_PICKER),
        FormFieldDef("new_members", "Novos Membros", fieldType = FormFieldType.USER_MULTI_PICKER),
        FormFieldDef("completed_leadership_track", "Completou Trilha de Liderança", fieldType = FormFieldType.BOOLEAN),
        FormFieldDef("legally_married", "Casado Legalmente", fieldType = FormFieldType.BOOLEAN),
        FormFieldDef("faithful_tither", "Dizimista Fiel", fieldType = FormFieldType.BOOLEAN),
        FormFieldDef("evangelizing_and_consolidating", "Evangelizando e Consolidando", fieldType = FormFieldType.BOOLEAN),
        FormFieldDef("good_testimony", "Bom Testemunho", fieldType = FormFieldType.BOOLEAN),
        FormFieldDef("single_living_in_purity", "Solteiro Vivendo em Pureza", fieldType = FormFieldType.BOOLEAN),
    )
    FormType.member_registration -> listOf(
        FormFieldDef("full_name", "Nome Completo", required = true, fieldType = FormFieldType.NAME),
        FormFieldDef("email", "E-mail", "email@exemplo.com", fieldType = FormFieldType.EMAIL),
        FormFieldDef("birth_date", "Data de Nascimento", "DD/MM/YYYY", required = true, fieldType = FormFieldType.DATE),
        FormFieldDef("phone", "Telefone", "(41) 9 9999-9999", required = true, fieldType = FormFieldType.PHONE),
        FormFieldDef("gender", "Gênero", required = true, fieldType = FormFieldType.SELECT,
            options = listOf("Masculino", "Feminino"), optionValues = listOf("m", "f")),
        FormFieldDef("civil_state", "Estado Civil", required = true, fieldType = FormFieldType.SELECT,
            options = listOf("Solteiro", "Casado", "Divorciado", "Viúvo"),
            optionValues = listOf("solteiro", "casado", "divorciado", "viuvo")),
        FormFieldDef("sector_id", "Setor", required = true, fieldType = FormFieldType.USER_PICKER), // TODO: replace with sector picker when available
        FormFieldDef("life_group_id", "Grupo de Vida", fieldType = FormFieldType.LG_PICKER),
        FormFieldDef("address", "Endereço"),
    )
    FormType.conversion -> listOf(
        FormFieldDef("full_name", "Nome Completo", required = true, fieldType = FormFieldType.NAME),
        FormFieldDef("email", "E-mail", "email@exemplo.com", required = true, fieldType = FormFieldType.EMAIL),
        FormFieldDef("phone", "Telefone", "(41) 9 9999-9999", required = true, fieldType = FormFieldType.PHONE),
        FormFieldDef("decision_type", "Tipo de Decisão", required = true, fieldType = FormFieldType.SELECT,
            options = listOf("Primeira vez", "Reconciliação"),
            optionValues = listOf("first_time", "reconciliation")),
        FormFieldDef("how_met_church", "Como conheceu a igreja?", required = true),
        FormFieldDef("gender", "Gênero", required = true, fieldType = FormFieldType.SELECT,
            options = listOf("Masculino", "Feminino"), optionValues = listOf("m", "f")),
        FormFieldDef("birth_date", "Data de Nascimento", "DD/MM/YYYY", required = true, fieldType = FormFieldType.DATE),
        FormFieldDef("civil_state", "Estado Civil", required = true, fieldType = FormFieldType.SELECT,
            options = listOf("Solteiro", "Casado", "Divorciado", "Viúvo"),
            optionValues = listOf("solteiro", "casado", "divorciado", "viuvo")),
        FormFieldDef("address", "Endereço", required = true),
        FormFieldDef("attendance_count", "Quantidade de visitas", required = true),
        FormFieldDef("life_group_status", "Status do Grupo de Vida", required = true),
        FormFieldDef("life_group_leader_or_name", "Líder ou nome do GV"),
        FormFieldDef("invited_by", "Convidado por"),
        FormFieldDef("notes", "Observações", fieldType = FormFieldType.MULTILINE),
    )
    FormType.sector_supervisor_report -> listOf(
        FormFieldDef("date", "Data do Relatório", "DD/MM/YYYY", required = true, fieldType = FormFieldType.DATE),
        FormFieldDef("sector_id", "Setor", required = true, fieldType = FormFieldType.USER_PICKER), // TODO: sector picker
        FormFieldDef("life_groups_visited", "Grupos Visitados", fieldType = FormFieldType.LG_PICKER),
        FormFieldDef("leaders_pastored", "Líderes Pastoreados", fieldType = FormFieldType.USER_MULTI_PICKER),
        FormFieldDef("multiplication_candidates", "Candidatos à Multiplicação", fieldType = FormFieldType.USER_MULTI_PICKER),
        FormFieldDef("life_groups_count", "Total de Grupos", "0", required = true, fieldType = FormFieldType.INTEGER),
        FormFieldDef("life_groups_supervised", "Grupos Supervisionados", "0", required = true, fieldType = FormFieldType.INTEGER),
        FormFieldDef("life_group_observations", "Observações dos Grupos", fieldType = FormFieldType.MULTILINE),
        FormFieldDef("sector_multiplication_date", "Data de Multiplicação do Setor", fieldType = FormFieldType.DATE),
        FormFieldDef("notes", "Observações", fieldType = FormFieldType.MULTILINE),
    )
    FormType.area_supervisor_report -> listOf(
        FormFieldDef("date", "Data do Relatório", "DD/MM/YYYY", required = true, fieldType = FormFieldType.DATE),
        FormFieldDef("area_id", "Área", required = true, fieldType = FormFieldType.USER_PICKER), // TODO: area picker
        FormFieldDef("sector_leaders_pastored", "Líderes de Setor Pastoreados", fieldType = FormFieldType.USER_MULTI_PICKER),
        FormFieldDef("life_groups_count", "Total de Grupos", "0", required = true, fieldType = FormFieldType.INTEGER),
        FormFieldDef("life_groups_supervised", "Grupos Supervisionados", "0", required = true, fieldType = FormFieldType.INTEGER),
        FormFieldDef("life_group_observations", "Observações dos Grupos", fieldType = FormFieldType.MULTILINE),
        FormFieldDef("notes", "Observações", fieldType = FormFieldType.MULTILINE),
    )
    FormType.life_group_report -> listOf(
        FormFieldDef("date", "Data da Reunião", "DD/MM/YYYY", required = true, fieldType = FormFieldType.DATE),
        FormFieldDef("attendees", "Quantidade de Participantes", "0", required = true, fieldType = FormFieldType.INTEGER),
        FormFieldDef("visitors", "Quantidade de Visitantes", "0", fieldType = FormFieldType.INTEGER),
        FormFieldDef("offerings", "Oferta (R$)", "0,00", fieldType = FormFieldType.CURRENCY),
        FormFieldDef("observations", "Observações", fieldType = FormFieldType.MULTILINE),
    )
    FormType.course -> listOf(
        FormFieldDef("course_name", "Nome do Curso", "Ex: Escola de Membros", required = true),
        FormFieldDef("enrolled_at", "Data de Inscrição", "DD/MM/YYYY", required = true, fieldType = FormFieldType.DATE),
    )
}
