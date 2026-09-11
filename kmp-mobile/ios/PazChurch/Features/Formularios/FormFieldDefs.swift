import Shared

// MARK: - Field Definitions

enum FormFieldType {
    case text
    case name
    case phone
    case email
    case date
    case integer
    case currency
    case multiline
    case toggle
    case select // enum: optionValues[i] = API value, label in options[i] displayed
    case userPicker // single user → stores id string
    case userMultiPicker // multi user → stores "1,2,3"
    case lgPicker // life-group → stores id string
    case selfOrSearch // invited_by: "" = self, else searched name

    /// True for field types backed by a plain keyboard text field (eligible for focus
    /// retention across step-mode screens).
    var isTextInput: Bool {
        switch self {
        case .text, .name, .phone, .email, .integer, .currency, .multiline:
            true

        default:
            false
        }
    }
}

struct FormFieldDef {
    let key: String
    let label: String
    let placeholder: String
    let required: Bool
    let fieldType: FormFieldType
    let options: [String] // display labels
    let optionValues: [String] // API values parallel to options; empty = value IS label

    init(
        _ key: String,
        _ label: String,
        placeholder: String = "",
        required: Bool = false,
        fieldType: FormFieldType = .text,
        options: [String] = [],
        optionValues: [String] = []
    ) {
        self.key = key
        self.label = label
        self.placeholder = placeholder
        self.required = required
        self.fieldType = fieldType
        self.options = options
        self.optionValues = optionValues
    }
}

extension FormType {
    var fieldDefs: [FormFieldDef] {
        switch self {
        case .serviceReport:
            [
                FormFieldDef("date", "Data", placeholder: "DD/MM/YYYY", required: true, fieldType: .date),
                FormFieldDef(
                    "report_type",
                    "Tipo de relatório",
                    required: true,
                    fieldType: .select,
                    options: ["Tadel", "Culto de celebração", "Evento"],
                    optionValues: ["tadel", "culto_celebracao", "evento"]
                ),
                FormFieldDef(
                    "period",
                    "Período",
                    required: true,
                    fieldType: .select,
                    options: ["Manhã", "Tarde/Noite"],
                    optionValues: ["manha", "tarde_noite"]
                ),
                FormFieldDef("atmosphere_team_id", "Equipe Atmosfera", fieldType: .integer),
                FormFieldDef("atmosphere_responsible", "Responsável no dia", required: true),
                FormFieldDef("tadel_adults", "Adultos (Tadel)", placeholder: "0", required: true, fieldType: .integer),
                FormFieldDef("tadel_kids", "Crianças (Tadel)", placeholder: "0", fieldType: .integer),
                FormFieldDef("vehicles_cars", "Carros", placeholder: "0", required: true, fieldType: .integer),
                FormFieldDef("vehicles_motos", "Motos", placeholder: "0", fieldType: .integer),
                FormFieldDef("vehicles_bikes", "Bicicletas", placeholder: "0", fieldType: .integer),
                FormFieldDef("vehicles_others", "Outros veículos", placeholder: "Ex: Ônibus - 2"),
                FormFieldDef("volunteers_atmosfera", "Voluntários Atmosfera", placeholder: "0", fieldType: .integer),
                FormFieldDef("volunteers_louvor", "Voluntários Louvor", placeholder: "0", fieldType: .integer),
                FormFieldDef("volunteers_midia", "Voluntários Mídia", placeholder: "0", fieldType: .integer),
                FormFieldDef("volunteers_danca", "Voluntários Dança", placeholder: "0", fieldType: .integer),
                FormFieldDef("notes", "Observação", fieldType: .multiline),
            ]

        case .guest:
            [
                FormFieldDef("date", "Data da Visita", placeholder: "DD/MM/YYYY", required: true, fieldType: .date),
                FormFieldDef(
                    "full_name",
                    "Nome do Visitante",
                    placeholder: "Nome completo",
                    required: true,
                    fieldType: .name
                ),
                FormFieldDef("email", "E-mail", placeholder: "email@exemplo.com", required: true, fieldType: .email),
                FormFieldDef("phone", "Telefone", placeholder: "(41) 9 9999-9999", fieldType: .phone),
                FormFieldDef("invited_by", "Convidado por", fieldType: .selfOrSearch),
                FormFieldDef("via_casa_de_paz", "Veio de uma Casa de Paz?", fieldType: .toggle),
                FormFieldDef("how_met_church", "Como conheceu a igreja?"),
                FormFieldDef("address", "Endereço"),
            ]

        case .multiplication:
            [
                FormFieldDef(
                    "date",
                    "Data da Multiplicação",
                    placeholder: "DD/MM/YYYY",
                    required: true,
                    fieldType: .date
                ),
                FormFieldDef("source_life_group_id", "Life Group de Origem", required: true, fieldType: .lgPicker),
                FormFieldDef("new_life_group_name", "Nome do Novo Grupo", placeholder: "Ex: GL Norte", required: true),
                FormFieldDef("new_leader_id", "Novo Líder", required: true, fieldType: .userPicker),
                FormFieldDef("host_id", "Anfitrião", required: true, fieldType: .userPicker),
                FormFieldDef("leader_phone", "Telefone do Líder", required: true, fieldType: .phone),
                FormFieldDef("meeting_day_time", "Dia e Horário", placeholder: "Ex: Sexta 19h", required: true),
                FormFieldDef("address", "Endereço", required: true),
                FormFieldDef("members_to_move", "Membros a Transferir", fieldType: .userMultiPicker),
                FormFieldDef("new_members", "Novos Membros", fieldType: .userMultiPicker),
                FormFieldDef("completed_leadership_track", "Completou Trilha de Liderança", fieldType: .toggle),
                FormFieldDef("legally_married", "Casado Legalmente", fieldType: .toggle),
                FormFieldDef("faithful_tither", "Dizimista Fiel", fieldType: .toggle),
                FormFieldDef("evangelizing_and_consolidating", "Evangelizando e Consolidando", fieldType: .toggle),
                FormFieldDef("good_testimony", "Bom Testemunho", fieldType: .toggle),
                FormFieldDef("single_living_in_purity", "Solteiro Vivendo em Pureza", fieldType: .toggle),
            ]

        case .memberRegistration:
            [
                FormFieldDef("full_name", "Nome Completo", required: true, fieldType: .name),
                FormFieldDef("email", "E-mail", placeholder: "email@exemplo.com", fieldType: .email),
                FormFieldDef(
                    "birth_date",
                    "Data de Nascimento",
                    placeholder: "DD/MM/YYYY",
                    required: true,
                    fieldType: .date
                ),
                FormFieldDef("phone", "Telefone", placeholder: "(41) 9 9999-9999", required: true, fieldType: .phone),
                FormFieldDef(
                    "gender",
                    "Gênero",
                    required: true,
                    fieldType: .select,
                    options: ["Masculino", "Feminino"],
                    optionValues: ["m", "f"]
                ),
                FormFieldDef(
                    "civil_state",
                    "Estado Civil",
                    required: true,
                    fieldType: .select,
                    options: ["Solteiro", "Casado", "Divorciado", "Viúvo"],
                    optionValues: ["solteiro", "casado", "divorciado", "viuvo"]
                ),
                FormFieldDef("sector_id", "Setor", required: true, fieldType: .userPicker), // TODO: sector picker
                FormFieldDef("life_group_id", "Life Group", fieldType: .lgPicker),
                FormFieldDef("address", "Endereço"),
            ]

        case .conversion:
            [
                FormFieldDef("full_name", "Nome Completo", required: true, fieldType: .name),
                FormFieldDef("email", "E-mail", placeholder: "email@exemplo.com", required: true, fieldType: .email),
                FormFieldDef("phone", "Telefone", placeholder: "(41) 9 9999-9999", required: true, fieldType: .phone),
                FormFieldDef(
                    "decision_type",
                    "Tipo de Decisão",
                    required: true,
                    fieldType: .select,
                    options: ["Primeira vez", "Reconciliação"],
                    optionValues: ["first_time", "reconciliation"]
                ),
                FormFieldDef("how_met_church", "Como conheceu a igreja?", required: true),
                FormFieldDef(
                    "gender",
                    "Gênero",
                    required: true,
                    fieldType: .select,
                    options: ["Masculino", "Feminino"],
                    optionValues: ["m", "f"]
                ),
                FormFieldDef(
                    "birth_date",
                    "Data de Nascimento",
                    placeholder: "DD/MM/YYYY",
                    required: true,
                    fieldType: .date
                ),
                FormFieldDef(
                    "civil_state",
                    "Estado Civil",
                    required: true,
                    fieldType: .select,
                    options: ["Solteiro", "Casado", "Divorciado", "Viúvo"],
                    optionValues: ["solteiro", "casado", "divorciado", "viuvo"]
                ),
                FormFieldDef("address", "Endereço", required: true),
                FormFieldDef("attendance_count", "Quantidade de visitas", required: true),
                FormFieldDef("life_group_status", "Status do Life Group", required: true),
                FormFieldDef("life_group_leader_or_name", "Líder ou nome do Life Group"),
                FormFieldDef("invited_by", "Convidado por"),
                FormFieldDef("notes", "Observações", fieldType: .multiline),
            ]

        case .lifeGroupReport:
            [
                FormFieldDef("date", "Data da Reunião", placeholder: "DD/MM/YYYY", required: true, fieldType: .date),
                FormFieldDef(
                    "attendees",
                    "Quantidade de Participantes",
                    placeholder: "0",
                    required: true,
                    fieldType: .integer
                ),
                FormFieldDef("visitors", "Quantidade de Visitantes", placeholder: "0", fieldType: .integer),
                FormFieldDef("offerings", "Oferta (R$)", placeholder: "0,00", fieldType: .currency),
                FormFieldDef("observations", "Observações", fieldType: .multiline),
            ]

        case .course:
            [
                FormFieldDef("course_name", "Nome do Curso", placeholder: "Ex: Escola de Membros", required: true),
                FormFieldDef(
                    "enrolled_at",
                    "Data de Inscrição",
                    placeholder: "DD/MM/YYYY",
                    required: true,
                    fieldType: .date
                ),
            ]

        case .sectorSupervisorReport:
            [
                FormFieldDef("date", "Data do Relatório", placeholder: "DD/MM/YYYY", required: true, fieldType: .date),
                FormFieldDef("sector_id", "Setor", required: true, fieldType: .userPicker), // TODO: sector picker
                FormFieldDef("life_groups_visited", "Grupos Visitados", fieldType: .lgPicker),
                FormFieldDef("leaders_pastored", "Líderes Pastoreados", fieldType: .userMultiPicker),
                FormFieldDef("multiplication_candidates", "Candidatos à Multiplicação", fieldType: .userMultiPicker),
                FormFieldDef(
                    "life_groups_count",
                    "Total de Grupos",
                    placeholder: "0",
                    required: true,
                    fieldType: .integer
                ),
                FormFieldDef(
                    "life_groups_supervised",
                    "Grupos Supervisionados",
                    placeholder: "0",
                    required: true,
                    fieldType: .integer
                ),
                FormFieldDef("life_group_observations", "Observações dos Grupos", fieldType: .multiline),
                FormFieldDef("sector_multiplication_date", "Data de Multiplicação do Setor", fieldType: .date),
                FormFieldDef("notes", "Observações", fieldType: .multiline),
            ]

        default: // areaSupervisorReport
            [
                FormFieldDef("date", "Data do Relatório", placeholder: "DD/MM/YYYY", required: true, fieldType: .date),
                FormFieldDef("area_id", "Área", required: true, fieldType: .userPicker), // TODO: area picker
                FormFieldDef("sector_leaders_pastored", "Líderes de Setor Pastoreados", fieldType: .userMultiPicker),
                FormFieldDef(
                    "life_groups_count",
                    "Total de Grupos",
                    placeholder: "0",
                    required: true,
                    fieldType: .integer
                ),
                FormFieldDef(
                    "life_groups_supervised",
                    "Grupos Supervisionados",
                    placeholder: "0",
                    required: true,
                    fieldType: .integer
                ),
                FormFieldDef("life_group_observations", "Observações dos Grupos", fieldType: .multiline),
                FormFieldDef("notes", "Observações", fieldType: .multiline),
            ]
        }
    }

    var displayName: String {
        switch self {
        case .memberRegistration: "Registro de Membro"
        case .conversion: "Conversão"
        case .guest: "Visitante"
        case .multiplication: "Multiplicação"
        case .serviceReport: "Relatório de Culto"
        case .course: "Curso"
        case .lifeGroupReport: "Relatório de Grupo"
        case .sectorSupervisorReport: "Rel. Supervisor de Setor"
        default: "Rel. Supervisor de Área"
        }
    }
}
