package br.church.paz.shared.domain.repository

import br.church.paz.shared.domain.model.LifeGroupTask
import br.church.paz.shared.domain.model.LifeGroupTaskDeclineResult
import br.church.paz.shared.domain.model.LifeGroupTaskMember
import br.church.paz.shared.domain.model.LifeGroupTaskMemberUpdate
import br.church.paz.shared.domain.model.LifeGroupTaskSettings
import br.church.paz.shared.domain.model.LifeGroupTaskTemplateSummary

interface LifeGroupTaskRepository {
    // ---- member ----

    /** Upcoming (today onward) tasks of the signed-in member. */
    @Throws(Exception::class)
    suspend fun getMyTasks(): List<LifeGroupTask>

    @Throws(Exception::class)
    suspend fun getMyTask(assignmentId: String): LifeGroupTask

    /** The backend auto re-rolls to another eligible member when one exists. */
    @Throws(Exception::class)
    suspend fun declineTask(assignmentId: String): LifeGroupTaskDeclineResult

    // ---- leader / co-leader / admin ----

    @Throws(Exception::class)
    suspend fun getTaskMembers(lifeGroupId: Int): List<LifeGroupTaskMember>

    /** Returns the refreshed full member list. */
    @Throws(Exception::class)
    suspend fun updateTaskMembers(
        lifeGroupId: Int,
        updates: List<LifeGroupTaskMemberUpdate>,
    ): List<LifeGroupTaskMember>

    @Throws(Exception::class)
    suspend fun getTaskSettings(lifeGroupId: Int): LifeGroupTaskSettings

    @Throws(Exception::class)
    suspend fun updateTaskSettings(lifeGroupId: Int, minPresentMeetings: Int): LifeGroupTaskSettings

    /**
     * Active templates for the group (derived from GET task-overrides; there is no
     * non-admin template listing). Used to pick per-member exclusions.
     */
    @Throws(Exception::class)
    suspend fun getTaskTemplates(lifeGroupId: Int): List<LifeGroupTaskTemplateSummary>
}
