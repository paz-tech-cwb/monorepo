package br.church.paz.android.ui.features.lifegrouptasks

import br.church.paz.shared.domain.model.LifeGroupTaskEligibilitySource
import br.church.paz.shared.domain.model.LifeGroupTaskMember
import br.church.paz.shared.domain.model.LifeGroupTaskTemplateSummary

const val TASK_MIN_PRESENT_MEETINGS_MAX = 52
const val TASK_NOTE_MAX_LENGTH = 1000

/** Editable copy of one member's eligibility, diffed against [member] (the last saved server state). */
data class LifeGroupTaskMemberDraft(
    val member: LifeGroupTaskMember,
    val eligible: Boolean = member.eligible,
    val note: String = member.note.orEmpty(),
    val excludedTemplateIds: Set<Int> = member.excludedTemplateIds.toSet(),
    // "Voltar ao automático": deletes the explicit decision on save.
    val resetToAutomatic: Boolean = false,
) {
    val noteChanged: Boolean get() = note != member.note.orEmpty()
    val exclusionsChanged: Boolean get() = excludedTemplateIds != member.excludedTemplateIds.toSet()

    val isDirty: Boolean
        get() = resetToAutomatic || eligible != member.eligible || noteChanged || exclusionsChanged
}

data class LifeGroupTaskMembersUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val error: String? = null,
    val drafts: List<LifeGroupTaskMemberDraft> = emptyList(),
    // Only templates the group's leader has enabled; disabled ones can't be assigned anyway.
    val templates: List<LifeGroupTaskTemplateSummary> = emptyList(),
    val minPresentMeetings: Int = 3,
    val savedMinPresentMeetings: Int = 3,
    val isSaving: Boolean = false,
    val saveError: String? = null,
    val savedMessage: String? = null,
) {
    val hasChanges: Boolean
        get() = minPresentMeetings != savedMinPresentMeetings || drafts.any { it.isDirty }
}

sealed class LifeGroupTaskMembersEffect {
    data object NavigateBack : LifeGroupTaskMembersEffect()
}

/** Source badge text: manual / leader default / automatic / pending (with present count vs minimum). */
fun LifeGroupTaskMember.sourceBadgeLabel(): String =
    when (eligibilitySource) {
        LifeGroupTaskEligibilitySource.MANUAL -> "Manual"
        LifeGroupTaskEligibilitySource.LEADER -> "Liderança"
        LifeGroupTaskEligibilitySource.AUTO -> "Automático · $presentCount de $minPresentMeetings presenças"
        LifeGroupTaskEligibilitySource.PENDING -> "Pendente · $presentCount de $minPresentMeetings presenças"
        LifeGroupTaskEligibilitySource.UNKNOWN -> "Automático"
    }
