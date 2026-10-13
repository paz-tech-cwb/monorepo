package br.church.paz.shared.domain.model

import kotlinx.datetime.Instant
import kotlinx.datetime.LocalDate
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime

/** Inputs of the weekly life-group report form (also the keys of validation errors). */
enum class LifeGroupReportField {
    DATE,
    LIFE_GROUP,
    COMMITTED_MEMBERS,
    COMMITTED_MEMBERS_PRESENT,
    KIDS_0_TO_11,
    GUESTS,
    MDAS,
    OFFERING,
    COMMITTED_AT_TADEL,
    COMMITTED_AT_CULTO,
    LEADER_ATTENDED,
    DISCIPLES_COUNT,
    DISCIPLES_DISCIPLED_THIS_WEEK,
    PASTORING_ACTIVITY_TYPE,
    PASTORING_ACTIVITY_OTHER,
    TRAINING_ACTIVITY_TYPE,
    TRAINING_ACTIVITY_OTHER,
}

/** Result of [LifeGroupReportDraft.validate]; one pt-BR message per invalid field. */
data class LifeGroupReportValidation(
    val errors: Map<LifeGroupReportField, String>,
) {
    val isValid: Boolean get() = errors.isEmpty()

    fun errorFor(field: LifeGroupReportField): String? = errors[field]

    /** The first error in form order, for a summary banner. */
    val firstError: String?
        get() = LifeGroupReportField.entries.firstNotNullOfOrNull { errors[it] }
}

/**
 * Raw (string) state of the weekly report form, shared by Android and iOS so that validation
 * and the wire payload are identical on both platforms.
 *
 * - Counts are digits-only strings; a blank count means 0 (placeholder "0" in the UI).
 * - `offering` accepts comma or dot decimals ("150,50", "150.5", "1.234,56") and is sent as "150.50".
 * - The three multi-value fields are free text separated by comma, semicolon or new line
 *   (option lists are an open product question), sent as string arrays.
 */
data class LifeGroupReportDraft(
    // ISO `yyyy-MM-dd`.
    val date: String = "",
    val lifeGroupId: Int? = null,
    val committedMembers: String = "",
    val committedMembersPresent: String = "",
    val kids0To11: String = "",
    val guests: String = "",
    val mdas: String = "",
    val offering: String = "",
    val committedAtTadel: String = "",
    val committedAtCulto: String = "",
    val leaderAttended: String = "",
    val disciplesCount: String = "",
    val disciplesDiscipledThisWeek: String = "",
    val pastoringActivityType: String = "",
    val pastoringActivityOther: String = "",
    val trainingActivityType: String = "",
    val trainingActivityOther: String = "",
) {
    /** Validates against the backend limits; [today] is the church day, see [LifeGroupReportRules.todayInSaoPaulo]. */
    fun validate(today: String): LifeGroupReportValidation {
        val errors = linkedMapOf<LifeGroupReportField, String>()

        if (lifeGroupId == null) errors[LifeGroupReportField.LIFE_GROUP] = "Selecione o grupo."

        val dateError = LifeGroupReportRules.dateError(date, today)
        if (dateError != null) errors[LifeGroupReportField.DATE] = dateError

        fun count(
            field: LifeGroupReportField,
            raw: String,
            label: String,
        ) {
            if (LifeGroupReportRules.parseCount(raw) == null) {
                errors[field] = "$label: informe um número inteiro de 0 a ${LifeGroupReportRules.MAX_COUNT}."
            }
        }
        count(LifeGroupReportField.COMMITTED_MEMBERS, committedMembers, "Membros comprometidos")
        count(LifeGroupReportField.COMMITTED_MEMBERS_PRESENT, committedMembersPresent, "Comprometidos presentes")
        count(LifeGroupReportField.KIDS_0_TO_11, kids0To11, "Crianças (0 a 11 anos)")
        count(LifeGroupReportField.GUESTS, guests, "Convidados")
        count(LifeGroupReportField.MDAS, mdas, "MDAs")
        count(LifeGroupReportField.COMMITTED_AT_TADEL, committedAtTadel, "Comprometidos no Tadel")
        count(LifeGroupReportField.COMMITTED_AT_CULTO, committedAtCulto, "Comprometidos no culto")
        count(LifeGroupReportField.DISCIPLES_COUNT, disciplesCount, "Discípulos")
        count(
            LifeGroupReportField.DISCIPLES_DISCIPLED_THIS_WEEK,
            disciplesDiscipledThisWeek,
            "Discípulos discipulados na semana",
        )

        if (LifeGroupReportRules.normalizeOffering(offering) == null) {
            errors[LifeGroupReportField.OFFERING] =
                "Oferta: informe um valor válido, por exemplo 150,50 (até 8 dígitos e 2 casas decimais)."
        }

        fun values(
            field: LifeGroupReportField,
            raw: String,
            label: String,
        ) {
            val error = LifeGroupReportRules.valuesError(LifeGroupReportRules.splitValues(raw), label)
            if (error != null) errors[field] = error
        }
        values(LifeGroupReportField.LEADER_ATTENDED, leaderAttended, "Líder presente em")
        values(LifeGroupReportField.PASTORING_ACTIVITY_TYPE, pastoringActivityType, "Atividades de pastoreio")
        values(LifeGroupReportField.TRAINING_ACTIVITY_TYPE, trainingActivityType, "Atividades de treinamento")

        fun other(
            field: LifeGroupReportField,
            raw: String,
            label: String,
        ) {
            if (raw.trim().length > LifeGroupReportRules.MAX_OTHER_LENGTH) {
                errors[field] = "$label: use no máximo ${LifeGroupReportRules.MAX_OTHER_LENGTH} caracteres."
            }
        }
        other(LifeGroupReportField.PASTORING_ACTIVITY_OTHER, pastoringActivityOther, "Outra atividade de pastoreio")
        other(LifeGroupReportField.TRAINING_ACTIVITY_OTHER, trainingActivityOther, "Outra atividade de treinamento")

        return LifeGroupReportValidation(errors)
    }

    /** The wire payload, or null when [validate] would report any error. */
    fun toForm(today: String): LifeGroupReportForm? {
        if (!validate(today).isValid) return null
        val groupId = lifeGroupId ?: return null
        return LifeGroupReportForm(
            date = date.trim(),
            lifeGroupId = groupId,
            committedMembers = LifeGroupReportRules.parseCount(committedMembers) ?: return null,
            committedMembersPresent = LifeGroupReportRules.parseCount(committedMembersPresent) ?: return null,
            kids0To11 = LifeGroupReportRules.parseCount(kids0To11) ?: return null,
            guests = LifeGroupReportRules.parseCount(guests) ?: return null,
            mdas = LifeGroupReportRules.parseCount(mdas) ?: return null,
            offering = LifeGroupReportRules.normalizeOffering(offering) ?: return null,
            committedAtTadel = LifeGroupReportRules.parseCount(committedAtTadel) ?: return null,
            committedAtCulto = LifeGroupReportRules.parseCount(committedAtCulto) ?: return null,
            leaderAttended = LifeGroupReportRules.splitValues(leaderAttended),
            disciplesCount = LifeGroupReportRules.parseCount(disciplesCount) ?: return null,
            disciplesDiscipledThisWeek =
                LifeGroupReportRules.parseCount(disciplesDiscipledThisWeek) ?: return null,
            pastoringActivityType = LifeGroupReportRules.splitValues(pastoringActivityType),
            pastoringActivityOther = pastoringActivityOther.trim().ifEmpty { null },
            trainingActivityType = LifeGroupReportRules.splitValues(trainingActivityType),
            trainingActivityOther = trainingActivityOther.trim().ifEmpty { null },
        )
    }
}

/** Group picker content for the report form (see [LifeGroupReportRules.resolveGroups]). */
data class LifeGroupReportGroups(
    val groups: List<LifeGroup>,
    // Non-null when there is nothing to report for (the form is replaced by this message).
    val emptyMessage: String?,
    val initialGroupId: Int?,
)

/** Pure rules of the weekly report form: input parsing, group eligibility and error copy. */
object LifeGroupReportRules {
    const val MAX_COUNT = 100000
    const val MAX_ARRAY_ITEMS = 20
    const val MAX_ITEM_LENGTH = 80
    const val MAX_OTHER_LENGTH = 180

    private val saoPaulo = TimeZone.of("America/Sao_Paulo")

    /** Today's calendar day (`yyyy-MM-dd`) in the church timezone, the same day the backend uses. */
    fun todayInSaoPaulo(epochMillis: Long): String =
        Instant.fromEpochMilliseconds(epochMillis).toLocalDateTime(saoPaulo).date.toString()

    /** `yyyy-MM-dd` -> `dd/MM/yyyy` for display; returns the input untouched when it is not ISO. */
    fun displayDate(iso: String): String {
        val parsed = runCatching { LocalDate.parse(iso.trim()) }.getOrNull() ?: return iso
        val day = parsed.dayOfMonth.toString().padStart(2, '0')
        val month = parsed.monthNumber.toString().padStart(2, '0')
        return "$day/$month/${parsed.year.toString().padStart(4, '0')}"
    }

    /** Null when [date] is a real ISO date not after [today]; else a pt-BR message. */
    fun dateError(
        date: String,
        today: String,
    ): String? {
        val parsed = runCatching { LocalDate.parse(date.trim()) }.getOrNull() ?: return "Informe a data da reunião."
        val limit = runCatching { LocalDate.parse(today) }.getOrNull() ?: return null
        return if (parsed > limit) "A data não pode ser futura." else null
    }

    /** A non-negative integer up to [MAX_COUNT]; blank means 0; anything else (sign, decimals) is null. */
    fun parseCount(raw: String): Int? {
        val text = raw.trim()
        if (text.isEmpty()) return 0
        if (text.length > 7 || !text.all { it in '0'..'9' }) return null
        val value = text.toIntOrNull() ?: return null
        return if (value in 0..MAX_COUNT) value else null
    }

    /**
     * "150,50" / "150.5" / "R$ 1.234,56" / "150" -> "150.50" / "150.50" / "1234.56" / "150.00".
     * Blank means no offering ("0.00"). A single dot followed by exactly three digits is read as a
     * thousands separator ("1.234" -> "1234.00"), since the backend allows at most two decimals.
     * Returns null when the value is not a valid amount (letters, negative, > 8 integer digits,
     * > 2 decimals).
     */
    fun normalizeOffering(raw: String): String? {
        var text = raw.trim().removePrefix("R$").trim().replace(" ", "")
        if (text.isEmpty()) return "0.00"
        if (!text.all { it in '0'..'9' || it == ',' || it == '.' }) return null

        text =
            when {
                ',' in text -> {
                    if (text.count { it == ',' } > 1) return null
                    text.replace(".", "").replace(',', '.')
                }
                text.count { it == '.' } > 1 -> text.replace(".", "")
                '.' in text -> {
                    val decimals = text.substringAfter('.')
                    val whole = text.substringBefore('.')
                    if (decimals.length == 3 && whole.length in 1..3) text.replace(".", "") else text
                }
                else -> text
            }

        val whole = text.substringBefore('.')
        val decimals = if ('.' in text) text.substringAfter('.') else ""
        if (whole.isEmpty() || whole.length > 8 || decimals.length > 2) return null
        if (!whole.all { it in '0'..'9' } || !decimals.all { it in '0'..'9' }) return null
        return "${whole.trimStart('0').ifEmpty { "0" }}.${decimals.padEnd(2, '0')}"
    }

    /** Free text -> trimmed, non-blank, de-duplicated values (comma, semicolon or new line separated). */
    fun splitValues(raw: String): List<String> =
        raw
            .split(',', ';', '\n')
            .map { it.trim() }
            .filter { it.isNotEmpty() }
            .distinct()

    fun valuesError(
        values: List<String>,
        label: String,
    ): String? =
        when {
            values.size > MAX_ARRAY_ITEMS -> "$label: informe no máximo $MAX_ARRAY_ITEMS itens."
            values.any { it.length > MAX_ITEM_LENGTH } ->
                "$label: cada item deve ter no máximo $MAX_ITEM_LENGTH caracteres."
            else -> null
        }

    /**
     * Groups the viewer may report for: only those they lead or co-lead
     * (`GET /life-groups/me` -> `relationship` leader|co_leader). Supervisors and plain members cannot.
     */
    fun reportableGroups(groups: List<LifeGroup>): List<LifeGroup> =
        groups.filter { it.relationship == "leader" || it.relationship == "co_leader" }

    /** Admin and pastor see every life group (backend scope: unrestricted), not only the ones they lead. */
    fun seesAllGroups(role: UserRole?): Boolean = role == UserRole.admin || role == UserRole.pastor

    /**
     * Resolves the picker for [role]: admin/pastor get ALL groups ([allGroups], `GET /life-groups`,
     * sorted by name, de-duplicated by id) and nothing is preselected unless the form was opened from
     * a group; every other role keeps the leader/co-leader-only rule over [myGroups]
     * (`GET /life-groups/me`) and still auto-selects a single group.
     */
    fun resolveGroups(
        role: UserRole?,
        myGroups: List<LifeGroup>,
        allGroups: List<LifeGroup>,
        preselectedId: Int?,
    ): LifeGroupReportGroups {
        if (seesAllGroups(role)) {
            val groups = allGroups.distinctBy { it.id }.sortedBy { it.name.lowercase() }
            return LifeGroupReportGroups(
                groups = groups,
                emptyMessage = if (groups.isEmpty()) "Nenhum Life Group cadastrado." else null,
                initialGroupId = preselectedId?.takeIf { id -> groups.any { it.id == id } },
            )
        }
        val reportable = reportableGroups(myGroups)
        return LifeGroupReportGroups(
            groups = reportable,
            emptyMessage = if (reportable.isEmpty()) noReportableGroupsMessage(myGroups) else null,
            initialGroupId = initialGroupId(reportable, preselectedId),
        )
    }

    /** True when the viewer has groups but only supervises them (read-only access). */
    fun isSupervisorOnly(groups: List<LifeGroup>): Boolean =
        reportableGroups(groups).isEmpty() &&
            groups.any { it.relationship == "supervisor" || it.isSupervised }

    /** Copy for the empty state shown when [reportableGroups] is empty. */
    fun noReportableGroupsMessage(groups: List<LifeGroup>): String =
        if (isSupervisorOnly(groups)) {
            "Você supervisiona estes grupos e pode apenas consultar os relatórios. " +
                "O envio é feito pelo líder ou co-líder do grupo."
        } else {
            "Apenas o líder ou co-líder de um Life Group pode enviar o relatório semanal."
        }

    /**
     * The group to preselect: the one the form was opened from (when the viewer may report for it),
     * else the only reportable group, else null (the user must pick).
     */
    fun initialGroupId(
        reportable: List<LifeGroup>,
        preselectedId: Int?,
    ): Int? =
        when {
            preselectedId != null && reportable.any { it.id == preselectedId } -> preselectedId
            reportable.size == 1 -> reportable.first().id
            else -> null
        }

    /** Friendly pt-BR copy for a failed submit, by HTTP status (null = network/other failure). */
    fun submitErrorMessage(
        statusCode: Int?,
        serverMessage: String?,
    ): String =
        when (statusCode) {
            400 -> "Alguns dados não foram aceitos. Confira os campos e tente novamente."
            403 -> "Você não tem permissão para enviar o relatório deste grupo."
            404 -> "Grupo não encontrado. Atualize a tela e tente novamente."
            409 -> "Já existe um relatório deste grupo para essa data."
            422 ->
                "Este grupo ainda não está vinculado a um setor e área. " +
                    "Peça à liderança para completar o cadastro do grupo e tente novamente."
            429 -> serverMessage?.takeIf { it.isNotBlank() } ?: "Muitas tentativas. Aguarde um instante e tente de novo."
            in 500..599 -> "O servidor não conseguiu processar o envio. Tente novamente em instantes."
            else -> "Não foi possível enviar o relatório. Verifique sua conexão e tente novamente."
        }
}
