package br.church.paz.shared.domain.model

import kotlinx.serialization.Serializable

/**
 * Why the report half of a meeting cannot be filed (server-resolved, `report_blocked_reason`).
 * [UNKNOWN] covers any value a newer backend adds: the report stays blocked and the UI shows a
 * generic message.
 */
enum class MeetingReportBlockedReason {
    GROUP_HAS_NO_SECTOR,
    SECTOR_HAS_NO_AREA,
    UNKNOWN,
}

/** The attendance half of a meeting (`attendance` of `GET /life-groups/:id/meetings/:date`). */
data class LifeGroupMeetingAttendance(
    // null while it is a draft built from the current roster (never saved yet).
    val id: String?,
    val meetingDate: String,
    val presentCount: Int,
    val membersCount: Int,
    val entries: List<LifeGroupAttendanceEntry>,
    // True until the first save: entries come from the current roster, everyone present.
    val isDraft: Boolean,
    // The meeting is an extra one (not on the group's fixed weekday). Fixed once saved.
    val isExtra: Boolean,
    // Non-null only for drafts: the presence every entry was pre-filled with (true = "Todos presentes").
    val defaultPresent: Boolean?,
)

/**
 * One meeting (group + date): attendance and report halves plus server-derived counts and the
 * edit window. `committed_*` are derived by the server from the attendance; never typed by the user.
 */
data class LifeGroupMeeting(
    val lifeGroupId: Int,
    // ISO `yyyy-MM-dd`.
    val meetingDate: String,
    // null only for a legacy report on a date that has no attendance and is not a regular day.
    val attendance: LifeGroupMeetingAttendance?,
    val report: LifeGroupWeeklyReport?,
    // "Comprometidos" (= roster snapshot size) and "Presentes" (= present count); null without attendance.
    val committedMembers: Int?,
    val committedMembersPresent: Int?,
    // False after the edit window (14 days) for non-admins: the screen is read-only.
    val canEdit: Boolean,
    // Last day (ISO `yyyy-MM-dd`, inclusive) a non-admin may still edit.
    val editDeadline: String,
    // Non-null when a report cannot be filed for this group (no sector/area).
    val reportBlockedReason: MeetingReportBlockedReason?,
) {
    /** Attendance exists on the server (a saved record, not a draft). */
    val isAttendanceSaved: Boolean get() = attendance != null && !attendance.isDraft

    val isReportSaved: Boolean get() = report != null
}

/** The 13 report values a leader types (everything else in the report is derived by the server). */
data class LifeGroupMeetingReportInput(
    val kids0To11: Int,
    val guests: Int,
    val mdas: Int,
    // Decimal string with up to 2 decimals, e.g. "150.50".
    val offering: String,
    val committedAtTadel: Int,
    val committedAtCulto: Int,
    val leaderAttended: List<String>,
    val disciplesCount: Int,
    val disciplesDiscipledThisWeek: Int,
    val pastoringActivityType: List<String>,
    val pastoringActivityOther: String?,
    val trainingActivityType: List<String>,
    val trainingActivityOther: String?,
)

/** Keys of report validation errors, in form order. */
enum class LifeGroupMeetingReportField {
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

/** Result of [LifeGroupMeetingReportDraft.validate]; one pt-BR message per invalid field. */
data class LifeGroupMeetingReportValidation(
    val errors: Map<LifeGroupMeetingReportField, String>,
) {
    val isValid: Boolean get() = errors.isEmpty()

    fun errorFor(field: LifeGroupMeetingReportField): String? = errors[field]

    /** The first error in form order, for a summary line. */
    val firstError: String?
        get() = LifeGroupMeetingReportField.entries.firstNotNullOfOrNull { errors[it] }
}

/**
 * Raw (string) state of the report section, shared by Android and iOS so validation and the wire
 * payload are identical on both platforms. Also the persisted local draft of that section.
 *
 * - Counts are digits-only strings; blank means 0.
 * - `offering` accepts "150,50", "150.5", "1.234,56" and is sent as "150.50".
 * - The three multi-value fields are comma/semicolon/new-line separated text (option lists are an
 *   open product question), sent as string arrays.
 */
@Serializable
data class LifeGroupMeetingReportDraft(
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
    fun validate(): LifeGroupMeetingReportValidation {
        val errors = linkedMapOf<LifeGroupMeetingReportField, String>()

        fun count(
            field: LifeGroupMeetingReportField,
            raw: String,
            label: String,
        ) {
            if (LifeGroupMeetingRules.parseCount(raw) == null) {
                errors[field] = "$label: informe um número inteiro de 0 a ${LifeGroupMeetingRules.MAX_COUNT}."
            }
        }
        count(LifeGroupMeetingReportField.KIDS_0_TO_11, kids0To11, "Crianças (0 a 11 anos)")
        count(LifeGroupMeetingReportField.GUESTS, guests, "Convidados")
        count(LifeGroupMeetingReportField.MDAS, mdas, "MDAs")
        count(LifeGroupMeetingReportField.COMMITTED_AT_TADEL, committedAtTadel, "Comprometidos no Tadel")
        count(LifeGroupMeetingReportField.COMMITTED_AT_CULTO, committedAtCulto, "Comprometidos no culto")
        count(LifeGroupMeetingReportField.DISCIPLES_COUNT, disciplesCount, "Discípulos")
        count(
            LifeGroupMeetingReportField.DISCIPLES_DISCIPLED_THIS_WEEK,
            disciplesDiscipledThisWeek,
            "Discípulos discipulados na semana",
        )

        if (LifeGroupMeetingRules.normalizeOffering(offering) == null) {
            errors[LifeGroupMeetingReportField.OFFERING] =
                "Oferta: informe um valor válido, por exemplo 150,50 (até 8 dígitos e 2 casas decimais)."
        }

        fun values(
            field: LifeGroupMeetingReportField,
            raw: String,
            label: String,
        ) {
            val error = LifeGroupMeetingRules.valuesError(LifeGroupMeetingRules.splitValues(raw), label)
            if (error != null) errors[field] = error
        }
        values(LifeGroupMeetingReportField.LEADER_ATTENDED, leaderAttended, "Líder presente em")
        values(LifeGroupMeetingReportField.PASTORING_ACTIVITY_TYPE, pastoringActivityType, "Atividades de pastoreio")
        values(LifeGroupMeetingReportField.TRAINING_ACTIVITY_TYPE, trainingActivityType, "Atividades de treinamento")

        fun other(
            field: LifeGroupMeetingReportField,
            raw: String,
            label: String,
        ) {
            if (raw.trim().length > LifeGroupMeetingRules.MAX_OTHER_LENGTH) {
                errors[field] = "$label: use no máximo ${LifeGroupMeetingRules.MAX_OTHER_LENGTH} caracteres."
            }
        }
        other(LifeGroupMeetingReportField.PASTORING_ACTIVITY_OTHER, pastoringActivityOther, "Outra atividade de pastoreio")
        other(LifeGroupMeetingReportField.TRAINING_ACTIVITY_OTHER, trainingActivityOther, "Outra atividade de treinamento")

        return LifeGroupMeetingReportValidation(errors)
    }

    /** The wire payload, or null when [validate] would report any error. */
    fun toInput(): LifeGroupMeetingReportInput? {
        if (!validate().isValid) return null
        return LifeGroupMeetingReportInput(
            kids0To11 = LifeGroupMeetingRules.parseCount(kids0To11) ?: return null,
            guests = LifeGroupMeetingRules.parseCount(guests) ?: return null,
            mdas = LifeGroupMeetingRules.parseCount(mdas) ?: return null,
            offering = LifeGroupMeetingRules.normalizeOffering(offering) ?: return null,
            committedAtTadel = LifeGroupMeetingRules.parseCount(committedAtTadel) ?: return null,
            committedAtCulto = LifeGroupMeetingRules.parseCount(committedAtCulto) ?: return null,
            leaderAttended = LifeGroupMeetingRules.splitValues(leaderAttended),
            disciplesCount = LifeGroupMeetingRules.parseCount(disciplesCount) ?: return null,
            disciplesDiscipledThisWeek =
                LifeGroupMeetingRules.parseCount(disciplesDiscipledThisWeek) ?: return null,
            pastoringActivityType = LifeGroupMeetingRules.splitValues(pastoringActivityType),
            pastoringActivityOther = pastoringActivityOther.trim().ifEmpty { null },
            trainingActivityType = LifeGroupMeetingRules.splitValues(trainingActivityType),
            trainingActivityOther = trainingActivityOther.trim().ifEmpty { null },
        )
    }

    companion object {
        /** Prefills the form from a saved report (offering stays the server's decimal string). */
        fun fromReport(report: LifeGroupWeeklyReport): LifeGroupMeetingReportDraft =
            LifeGroupMeetingReportDraft(
                kids0To11 = report.kids0To11.toString(),
                guests = report.guests.toString(),
                mdas = report.mdas.toString(),
                offering = report.offering,
                committedAtTadel = report.committedAtTadel.toString(),
                committedAtCulto = report.committedAtCulto.toString(),
                leaderAttended = report.leaderAttended.joinToString(", "),
                disciplesCount = report.disciplesCount.toString(),
                disciplesDiscipledThisWeek = report.disciplesDiscipledThisWeek.toString(),
                pastoringActivityType = report.pastoringActivityType.joinToString(", "),
                pastoringActivityOther = report.pastoringActivityOther.orEmpty(),
                trainingActivityType = report.trainingActivityType.joinToString(", "),
                trainingActivityOther = report.trainingActivityOther.orEmpty(),
            )
    }
}

/** One unsaved presence toggle in a persisted [LifeGroupMeetingDraft]. */
@Serializable
data class LifeGroupMeetingDraftEntry(
    val userId: Int,
    val present: Boolean,
)

/**
 * Locally persisted, not-yet-saved edits of one meeting, keyed by (user, group, date).
 * A null section means "no unsaved edits in that section". Counts/offering only, no sensitive data.
 */
@Serializable
data class LifeGroupMeetingDraft(
    val attendance: List<LifeGroupMeetingDraftEntry>? = null,
    val report: LifeGroupMeetingReportDraft? = null,
    // The "Reunião extra" choice, kept so a restored draft reloads the same draft roster.
    val extraMeeting: Boolean = false,
) {
    val isEmpty: Boolean get() = attendance == null && report == null && !extraMeeting
}

/** One row of the meetings history: which halves exist for a date. */
data class LifeGroupMeetingSummary(
    val date: String,
    val hasAttendance: Boolean,
    // False when the reports list could not be loaded: then [hasReport] is not meaningful and the
    // UI hides the report chip instead of claiming "pending".
    val reportStatusKnown: Boolean,
    val hasReport: Boolean,
    val presentCount: Int?,
    val membersCount: Int?,
)

/** A suggested chip: [value] goes on the wire, [label] is shown. */
data class LifeGroupMeetingOption(
    val value: String,
    val label: String,
)
