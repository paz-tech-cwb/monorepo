package br.church.paz.shared.domain.model

import br.church.paz.shared.domain.repository.LifeGroupMeetingException
import kotlinx.datetime.DateTimeUnit
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.Instant
import kotlinx.datetime.LocalDate
import kotlinx.datetime.TimeZone
import kotlinx.datetime.minus
import kotlinx.datetime.toLocalDateTime

/**
 * Pure rules of the combined "Reunião" screen (presence + weekly report), shared by Android and iOS:
 * dates and weekdays, extra-meeting detection, presence toggles, local-draft handling, history
 * merging and input parsing. No I/O.
 */
object LifeGroupMeetingRules {
    const val MAX_COUNT = 100000
    const val MAX_ARRAY_ITEMS = 20
    const val MAX_ITEM_LENGTH = 80
    const val MAX_OTHER_LENGTH = 180

    /** A report filed before presence existed for that date: nothing to unlock, it is shown as is. */
    fun legacyReportMessage(): String = "Este relatório foi enviado sem registro de presença e não pode ser alterado aqui."

    /**
     * Who may CREATE/EDIT presence, reports and extra meetings of a group: admin, pastor, or the
     * group's own leader/co-leader ([isGroupLeadership], by id: works for a co-leader whose role is
     * `member`). Area/sector leaders reaching the group only through scope are read-only supervisors.
     * UI gate only: the server is the authority (403 `meeting_write_forbidden`).
     */
    fun canWrite(
        role: UserRole?,
        isGroupLeadership: Boolean,
    ): Boolean = isGroupLeadership || role == UserRole.admin || role == UserRole.pastor

    /** Banner of a meeting the viewer may read but not write (supervisor). */
    fun writeForbiddenMessage(): String =
        "Somente leitura: apenas o líder, o co-líder do grupo ou um administrador podem registrar presença e relatório."

    /** A supervisor opened a date with no recorded meeting: there is nothing to show and nothing to create. */
    fun noMeetingToViewMessage(): String = "Não há reunião registrada nesta data."

    /** Suggested chips for "Líder presente em" (the backend stores free strings; see design Q8). */
    val leaderAttendedOptions: List<LifeGroupMeetingOption> =
        listOf(LifeGroupMeetingOption("tadel", "Tadel"), LifeGroupMeetingOption("culto", "Culto"))

    private val saoPaulo = TimeZone.of("America/Sao_Paulo")

    // ---- dates -----------------------------------------------------------------------------

    /** Today's calendar day (`yyyy-MM-dd`) in the church timezone, the same day the backend uses. */
    fun todayInSaoPaulo(epochMillis: Long): String =
        Instant.fromEpochMilliseconds(epochMillis).toLocalDateTime(saoPaulo).date.toString()

    /** `yyyy-MM-dd` -> `dd/MM/yyyy` for display; returns the input untouched when it is not ISO. */
    fun displayDate(iso: String): String {
        val parsed = parseDate(iso) ?: return iso
        val day = parsed.dayOfMonth.toString().padStart(2, '0')
        val month = parsed.monthNumber.toString().padStart(2, '0')
        return "$day/$month/${parsed.year.toString().padStart(4, '0')}"
    }

    private fun parseDate(iso: String): LocalDate? = runCatching { LocalDate.parse(iso.trim()) }.getOrNull()

    /** True when [date] is a real ISO date that is not after [today]. */
    fun isSelectableDate(
        date: String,
        today: String,
    ): Boolean {
        val parsed = parseDate(date) ?: return false
        val limit = parseDate(today) ?: return true
        return parsed <= limit
    }

    /** Weekday of a fixed `meeting_day` ("Quarta-feira", "Sábado", "Domingo"...); null = "Sem dia fixo"/unknown. */
    fun weekdayOfMeetingDay(meetingDay: String?): DayOfWeek? {
        val name = meetingDay?.trim()?.lowercase() ?: return null
        return when {
            name.startsWith("seg") -> DayOfWeek.MONDAY
            name.startsWith("ter") -> DayOfWeek.TUESDAY
            name.startsWith("qua") -> DayOfWeek.WEDNESDAY
            name.startsWith("qui") -> DayOfWeek.THURSDAY
            name.startsWith("sex") -> DayOfWeek.FRIDAY
            name.startsWith("sáb") || name.startsWith("sab") -> DayOfWeek.SATURDAY
            name.startsWith("dom") -> DayOfWeek.SUNDAY
            else -> null
        }
    }

    /**
     * True when [date] is NOT on the group's fixed weekday, i.e. recording it needs `extra_meeting`.
     * Groups without a fixed day (and unparseable dates) never need it: every date is regular.
     */
    fun needsExtraMeeting(
        meetingDay: String?,
        date: String,
    ): Boolean {
        val expected = weekdayOfMeetingDay(meetingDay) ?: return false
        val parsed = parseDate(date) ?: return false
        return parsed.dayOfWeek != expected
    }

    /**
     * The date "Nova reunião" opens with: the latest regular meeting date on or before [today]
     * (future dates are rejected by the backend); [today] itself for groups without a fixed day.
     */
    fun defaultNewMeetingDate(
        meetingDay: String?,
        today: String,
    ): String {
        val expected = weekdayOfMeetingDay(meetingDay) ?: return today
        val parsedToday = parseDate(today) ?: return today
        for (back in 0..6) {
            val candidate = parsedToday.minus(back, DateTimeUnit.DAY)
            if (candidate.dayOfWeek == expected) return candidate.toString()
        }
        return today
    }

    // ---- parsing ---------------------------------------------------------------------------

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
     * Returns null for an invalid amount (letters, negative, > 8 integer digits, > 2 decimals).
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
                    // "1.234" is a thousands separator, but "0.125" (leading zero) is a 3-decimal amount: keep it
                    // as is so the decimals check below rejects it instead of inflating it x1000.
                    if (decimals.length == 3 && whole.length in 1..3 && whole.first() != '0') text.replace(".", "") else text
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

    /** True when the free-text multi-value [raw] already contains [value] (case-insensitive). */
    fun hasValue(
        raw: String,
        value: String,
    ): Boolean = splitValues(raw).any { it.equals(value, ignoreCase = true) }

    /** Adds [value] to / removes it from the free-text multi-value [raw] (chip toggle). */
    fun toggleValue(
        raw: String,
        value: String,
    ): String {
        val current = splitValues(raw)
        val next =
            if (current.any { it.equals(value, ignoreCase = true) }) {
                current.filterNot { it.equals(value, ignoreCase = true) }
            } else {
                current + value
            }
        return next.joinToString(", ")
    }

    // ---- presence --------------------------------------------------------------------------

    fun presentCount(entries: List<LifeGroupAttendanceEntry>): Int = entries.count { it.present }

    fun allPresent(entries: List<LifeGroupAttendanceEntry>): Boolean = entries.isNotEmpty() && entries.all { it.present }

    fun setAllPresent(
        entries: List<LifeGroupAttendanceEntry>,
        present: Boolean,
    ): List<LifeGroupAttendanceEntry> = entries.map { it.copy(present = present) }

    fun togglePresent(
        entries: List<LifeGroupAttendanceEntry>,
        userId: Int,
    ): List<LifeGroupAttendanceEntry> = entries.map { if (it.userId == userId) it.copy(present = !it.present) else it }

    /** Null when the presence can be saved; else the pt-BR reason (an empty roster cannot be saved). */
    fun attendanceError(entries: List<LifeGroupAttendanceEntry>): String? =
        if (entries.isEmpty()) "Este grupo ainda não tem membros para lançar presença." else null

    /** "6 de 8 presentes". */
    fun presenceSummary(entries: List<LifeGroupAttendanceEntry>): String = "${presentCount(entries)} de ${entries.size} presentes"

    /**
     * What `extra_meeting` to send with a presence save: `true` only while CREATING an extra meeting
     * (the draft). For an existing record it is omitted (the stored value is immutable; a mismatch is
     * rejected by the backend with `extra_meeting_immutable`).
     */
    fun extraFlagForSave(
        attendance: LifeGroupMeetingAttendance?,
        extraSelected: Boolean,
    ): Boolean? = if (attendance != null && attendance.isDraft && extraSelected) true else null

    // ---- local draft -----------------------------------------------------------------------

    /** True when the toggles differ from what the server has (or from the draft roster it proposed). */
    fun isAttendanceDirty(
        meeting: LifeGroupMeeting,
        entries: List<LifeGroupAttendanceEntry>,
    ): Boolean {
        val server = meeting.attendance?.entries.orEmpty()
        return entries.map { it.userId to it.present }.toSet() != server.map { it.userId to it.present }.toSet()
    }

    /** True when the report fields differ from the saved report (or from an empty form when none exists). */
    fun isReportDirty(
        meeting: LifeGroupMeeting,
        reportDraft: LifeGroupMeetingReportDraft,
    ): Boolean {
        val baseline = meeting.report?.let { LifeGroupMeetingReportDraft.fromReport(it) } ?: LifeGroupMeetingReportDraft()
        return reportDraft != baseline
    }

    /**
     * Builds the draft to persist from the current edits, or null when there is nothing unsaved.
     * Only the sections that differ from the server are kept (see [isAttendanceDirty], [isReportDirty]).
     */
    fun buildDraft(
        meeting: LifeGroupMeeting,
        entries: List<LifeGroupAttendanceEntry>,
        reportDraft: LifeGroupMeetingReportDraft,
        extraMeeting: Boolean,
    ): LifeGroupMeetingDraft? {
        val draft =
            LifeGroupMeetingDraft(
                attendance =
                    if (isAttendanceDirty(meeting, entries)) {
                        entries.map { LifeGroupMeetingDraftEntry(it.userId, it.present) }
                    } else {
                        null
                    },
                report = if (isReportDirty(meeting, reportDraft)) reportDraft else null,
                extraMeeting = extraMeeting && meeting.attendance?.isDraft == true,
            )
        return draft.takeUnless { it.isEmpty }
    }

    /** Applies the persisted unsaved toggles on top of the server [entries] (unknown users are ignored). */
    fun applyDraftEntries(
        entries: List<LifeGroupAttendanceEntry>,
        draft: List<LifeGroupMeetingDraftEntry>?,
    ): List<LifeGroupAttendanceEntry> {
        if (draft == null) return entries
        val byUser = draft.associate { it.userId to it.present }
        return entries.map { entry -> byUser[entry.userId]?.let { entry.copy(present = it) } ?: entry }
    }

    // ---- entry (Formulários / deep link `paz://form/life-group-reports`) ---------------------

    /**
     * Resolves where the "report" entry points lead (Formulários list, `paz://form/life-group-reports`):
     * - admin / pastor: picker over EVERY group ([allGroups], sorted by name), write-capable;
     * - exactly one led (leader/co-leader) group: open its Reuniões directly ([LifeGroupMeetingEntry.directGroupId]);
     * - several led groups: picker over them;
     * - supervisor only: the supervised groups, read-only (a single one opens directly);
     * - otherwise: an explanatory message.
     * Pure, shared by Android and iOS. [myGroups] is `GET /life-groups/me`.
     */
    fun resolveEntry(
        role: UserRole?,
        myGroups: List<LifeGroup>,
        allGroups: List<LifeGroup>,
    ): LifeGroupMeetingEntry {
        if (role == UserRole.admin || role == UserRole.pastor) {
            val groups =
                allGroups
                    .distinctBy { it.id }
                    .sortedBy { it.name.lowercase() }
                    .map { LifeGroupMeetingEntryGroup(it, canWrite = true) }
            return LifeGroupMeetingEntry(
                groups = groups,
                directGroupId = null,
                emptyMessage = if (groups.isEmpty()) "Nenhum Life Group cadastrado." else null,
            )
        }
        val led =
            myGroups
                .filter { isLeadership(it) }
                .distinctBy { it.id }
                .sortedBy { it.name.lowercase() }
        if (led.isNotEmpty()) {
            val groups = led.map { LifeGroupMeetingEntryGroup(it, canWrite = canWrite(role, true)) }
            return LifeGroupMeetingEntry(groups = groups, directGroupId = groups.singleOrNull()?.group?.id, emptyMessage = null)
        }
        val supervised =
            myGroups
                .filter { it.relationship == "supervisor" || it.isSupervised }
                .distinctBy { it.id }
                .sortedBy { it.name.lowercase() }
        if (supervised.isNotEmpty()) {
            val groups = supervised.map { LifeGroupMeetingEntryGroup(it, canWrite = false) }
            return LifeGroupMeetingEntry(groups = groups, directGroupId = groups.singleOrNull()?.group?.id, emptyMessage = null)
        }
        return LifeGroupMeetingEntry(
            groups = emptyList(),
            directGroupId = null,
            emptyMessage = "Apenas o líder ou co-líder de um Life Group pode registrar reuniões e relatórios.",
        )
    }

    /** The viewer leads or co-leads [group] (`GET /life-groups/me` -> `relationship`). */
    fun isLeadership(group: LifeGroup): Boolean = group.relationship == "leader" || group.relationship == "co_leader"

    // ---- history ---------------------------------------------------------------------------

    /**
     * Merges the attendance history and the reports list into one row per date, newest first.
     * [reports] is null when the reports list could not be loaded (report status unknown).
     */
    fun mergeHistory(
        attendance: List<LifeGroupAttendance>,
        reports: List<LifeGroupWeeklyReport>?,
    ): List<LifeGroupMeetingSummary> {
        val saved = attendance.filter { !it.isDraft }.associateBy { it.meetingDate }
        val reportDates = reports?.map { it.date }?.toSet().orEmpty()
        return (saved.keys + reportDates)
            .sortedDescending()
            .map { date ->
                val record = saved[date]
                LifeGroupMeetingSummary(
                    date = date,
                    hasAttendance = record != null,
                    reportStatusKnown = reports != null,
                    hasReport = date in reportDates,
                    presentCount = record?.presentCount,
                    membersCount = record?.membersCount,
                )
            }
    }

    // ---- copy ------------------------------------------------------------------------------

    /** "Prazo de edição encerrado em dd/MM/yyyy." for a read-only meeting. */
    fun readOnlyMessage(editDeadline: String): String =
        "O prazo para editar esta reunião terminou em ${displayDate(editDeadline)}. " +
            "Somente leitura: peça a um administrador para alterar."

    /** Banner for an editable meeting: "Você pode editar até dd/MM/yyyy." */
    fun editableUntilMessage(editDeadline: String): String = "Você pode editar até ${displayDate(editDeadline)}."

    fun reportBlockedMessage(reason: MeetingReportBlockedReason): String =
        when (reason) {
            MeetingReportBlockedReason.GROUP_HAS_NO_SECTOR ->
                "Este grupo ainda não tem setor, então o relatório não pode ser enviado. " +
                    "Peça a um administrador para vinculá-lo."
            MeetingReportBlockedReason.SECTOR_HAS_NO_AREA ->
                "O setor deste grupo ainda não tem área, então o relatório não pode ser enviado. " +
                    "Peça a um administrador para completar o cadastro."
            MeetingReportBlockedReason.UNKNOWN ->
                "O relatório não pode ser enviado para este grupo no momento."
        }
}

/** Maps meeting API failures to pt-BR copy and to the extra-meeting flow. */
object LifeGroupMeetingErrors {
    const val CODE_EXTRA_REQUIRED = "extra_meeting_required"
    const val CODE_EXTRA_ON_REGULAR_DAY = "extra_meeting_on_regular_day"
    const val CODE_EXTRA_NOT_APPLICABLE = "extra_meeting_not_applicable"
    const val CODE_EXTRA_IMMUTABLE = "extra_meeting_immutable"
    const val CODE_EXTRA_LIMIT = "extra_meeting_limit_reached"
    const val CODE_ATTENDANCE_REQUIRED = "attendance_required"
    const val CODE_EDIT_WINDOW_CLOSED = "edit_window_closed"
    const val CODE_GROUP_HAS_NO_SECTOR = "group_has_no_sector"
    const val CODE_SECTOR_HAS_NO_AREA = "sector_has_no_area"
    const val CODE_GROUP_NOT_FOUND = "group_not_found"

    /** Legacy Nest message of an unknown group, used while an older backend sends no `code`. */
    private val legacyGroupNotFound = Regex("^Life group with ID \\d+ not found$", RegexOption.IGNORE_CASE)

    /** What went wrong, in terms the screen can react to (copy and retry policy). */
    enum class Kind {
        // 404 `group_not_found`: the group really does not exist (or is not visible).
        GROUP_NOT_FOUND,

        // 404 without a group code: the route does not exist on the server (not deployed / old server).
        SERVER_UNAVAILABLE,
        NO_PERMISSION,
        SESSION_EXPIRED,

        // No HTTP answer at all (timeout, no connection, DNS...).
        OFFLINE,
        OTHER,
    }

    /**
     * Classifies [error]. A 404 is "group not found" ONLY with the explicit `group_not_found` code (or
     * the legacy "Life group with ID N not found" message); every other 404, such as Nest's generic
     * "Cannot GET /api/..." for a route that is not deployed, is [Kind.SERVER_UNAVAILABLE].
     */
    fun kind(error: Throwable): Kind {
        val e = error as? LifeGroupMeetingException ?: return Kind.OFFLINE
        return when {
            e.statusCode == 404 && isGroupNotFoundBody(e) -> Kind.GROUP_NOT_FOUND
            e.statusCode == 404 || e.statusCode == 501 || e.statusCode == 502 || e.statusCode == 503 -> Kind.SERVER_UNAVAILABLE
            e.statusCode == 401 -> Kind.SESSION_EXPIRED
            e.statusCode == 403 -> Kind.NO_PERMISSION
            else -> Kind.OTHER
        }
    }

    private fun isGroupNotFoundBody(e: LifeGroupMeetingException): Boolean =
        e.code == CODE_GROUP_NOT_FOUND ||
            (e.code == null && e.serverMessage?.trim()?.let { legacyGroupNotFound.matches(it) } == true)

    /** Retrying cannot help: the group is gone. Everything else may recover (server redeployed, network back). */
    fun isRetryable(error: Throwable): Boolean = kind(error) != Kind.GROUP_NOT_FOUND && kind(error) != Kind.NO_PERMISSION

    /** `extra_meeting=true` was sent for a group/date where the server no longer accepts the flag. */
    fun isExtraFlagRejected(error: Throwable): Boolean {
        val code = (error as? LifeGroupMeetingException)?.code
        return code == CODE_EXTRA_NOT_APPLICABLE || code == CODE_EXTRA_ON_REGULAR_DAY
    }

    /** The date is not the group's weekday: the user must tick "Reunião extra" before a draft exists. */
    fun requiresExtraChoice(error: Throwable): Boolean = (error as? LifeGroupMeetingException)?.code == CODE_EXTRA_REQUIRED

    /** The edit window closed while the screen was open: reload to show the read-only state. */
    fun isEditWindowClosed(error: Throwable): Boolean = (error as? LifeGroupMeetingException)?.code == CODE_EDIT_WINDOW_CLOSED

    /** Friendly pt-BR message; `null` [error] details (network etc.) fall back to a connectivity hint. */
    fun message(error: Throwable): String {
        val e = error as? LifeGroupMeetingException ?: return MESSAGE_OFFLINE
        return when (e.code) {
            CODE_EXTRA_REQUIRED ->
                "Esta data não é o dia da reunião do grupo. Marque \"Reunião extra\" para registrá-la."
            CODE_EXTRA_ON_REGULAR_DAY ->
                "Esta data é o dia regular de reunião do grupo. Desmarque \"Reunião extra\"."
            CODE_EXTRA_NOT_APPLICABLE ->
                "Este grupo não tem dia fixo: toda data é uma reunião regular."
            CODE_EXTRA_IMMUTABLE ->
                "O tipo desta reunião (regular ou extra) já foi salvo e não pode ser alterado."
            CODE_EXTRA_LIMIT ->
                "Este grupo já atingiu o limite de reuniões extras desta semana."
            CODE_ATTENDANCE_REQUIRED ->
                "Salve a presença antes de enviar o relatório."
            CODE_EDIT_WINDOW_CLOSED ->
                "O prazo para editar esta reunião terminou. Peça a um administrador."
            CODE_GROUP_HAS_NO_SECTOR ->
                "Este grupo ainda não tem setor. Peça a um administrador para vinculá-lo."
            CODE_SECTOR_HAS_NO_AREA ->
                "O setor deste grupo ainda não tem área. Peça a um administrador para completar o cadastro."
            CODE_GROUP_NOT_FOUND -> MESSAGE_GROUP_NOT_FOUND
            else -> byStatus(e)
        }
    }

    /**
     * Copy for a failed history/list request that has no meetings-API error body (attendance and reports
     * endpoints): [statusCode] null = no HTTP answer (offline).
     */
    fun messageForHttpStatus(statusCode: Int?): String =
        if (statusCode == null) MESSAGE_OFFLINE else message(LifeGroupMeetingException(statusCode, null, null))

    const val MESSAGE_GROUP_NOT_FOUND = "Grupo não encontrado. Atualize a tela e tente novamente."
    const val MESSAGE_SERVER_UNAVAILABLE = "Recurso indisponível no servidor. Tente novamente mais tarde."
    const val MESSAGE_NO_PERMISSION = "Você não tem permissão para esta reunião."
    const val MESSAGE_OFFLINE = "Não foi possível conectar. Verifique sua conexão e tente novamente."

    private fun byStatus(e: LifeGroupMeetingException): String =
        when (e.statusCode) {
            400 -> e.serverMessage?.takeIf { it.isNotBlank() } ?: "Alguns dados não foram aceitos. Confira os campos e tente novamente."
            401 -> "Sua sessão expirou. Entre novamente."
            403 -> MESSAGE_NO_PERMISSION
            404 -> if (isGroupNotFoundBody(e)) MESSAGE_GROUP_NOT_FOUND else MESSAGE_SERVER_UNAVAILABLE
            501, 502, 503 -> MESSAGE_SERVER_UNAVAILABLE
            409 -> "Esta reunião foi alterada ao mesmo tempo. Recarregue e tente novamente."
            422 -> "Este grupo ainda não está vinculado a um setor e área. Peça à liderança para completar o cadastro."
            429 -> "Muitas tentativas. Aguarde um instante e tente de novo."
            in 500..599 -> "O servidor não conseguiu processar o pedido. Tente novamente em instantes."
            else -> "Não foi possível concluir. Tente novamente."
        }
}
