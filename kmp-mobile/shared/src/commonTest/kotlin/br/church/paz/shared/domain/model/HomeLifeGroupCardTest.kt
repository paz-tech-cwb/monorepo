package br.church.paz.shared.domain.model

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class HomeLifeGroupCardTest {

    private fun group(
        id: Int,
        name: String,
        leaderId: Int? = null,
        coLeaderId: Int? = null,
    ) = LifeGroup(id = id, name = name, leaderId = leaderId, coLeaderId = coLeaderId)

    private fun task(
        id: String,
        lifeGroupId: Int,
        date: String,
        status: LifeGroupTaskStatus = LifeGroupTaskStatus.ASSIGNED,
    ) = LifeGroupTask(
        id = id,
        lifeGroupId = lifeGroupId,
        lifeGroupName = "Grupo $lifeGroupId",
        meetingDate = date,
        name = "Tarefa $id",
        description = "",
        guidance = "",
        status = status,
    )

    private fun build(
        groups: List<LifeGroup>,
        tasks: List<LifeGroupTask> = emptyList(),
        userId: Int? = 5,
    ) = buildHomeLifeGroupCards(userId, groups, tasks, "2026-10-12", maxCards = 3, maxTasks = 3)

    @Test
    fun `no groups gives no cards`() {
        val result = build(emptyList(), listOf(task("a", 1, "2026-10-13")))
        assertTrue(result.cards.isEmpty())
        assertEquals(0, result.hiddenCount)
    }

    @Test
    fun `one group folds only its own tasks`() {
        val result =
            build(
                listOf(group(1, "Alfa")),
                listOf(task("mine", 1, "2026-10-13"), task("other", 2, "2026-10-13")),
            )
        assertEquals(1, result.cards.size)
        assertEquals(listOf("mine"), result.cards.single().tasks.map { it.id })
    }

    @Test
    fun `tasks are filtered sorted and capped per card`() {
        val tasks =
            listOf(
                task("past", 1, "2026-10-05"),
                task("d", 1, "2026-11-02"),
                task("declined", 1, "2026-10-13", LifeGroupTaskStatus.DECLINED),
                task("today", 1, "2026-10-12"),
                task("c", 1, "2026-10-26"),
                task("b", 1, "2026-10-19"),
            )
        val card = build(listOf(group(1, "Alfa")), tasks).cards.single()
        assertEquals(listOf("today", "b", "c"), card.tasks.map { it.id })
    }

    @Test
    fun `leadership groups come first then by name`() {
        val result =
            build(
                listOf(
                    group(1, "Alfa"),
                    group(2, "beta", coLeaderId = 5),
                    group(3, "Zeta", leaderId = 5),
                ),
            )
        assertEquals(listOf(2, 3, 1), result.cards.map { it.group.id })
        assertEquals(listOf(true, true, false), result.cards.map { it.isLeadership })
    }

    @Test
    fun `unknown viewer id means no leadership ordering`() {
        val result = build(listOf(group(2, "B", leaderId = 5), group(1, "A")), userId = null)
        assertEquals(listOf(1, 2), result.cards.map { it.group.id })
        assertTrue(result.cards.none { it.isLeadership })
    }

    @Test
    fun `more than max cards reports the hidden count`() {
        val groups = (1..5).map { group(it, "G$it") }
        val result = build(groups)
        assertEquals(3, result.cards.size)
        assertEquals(2, result.hiddenCount)
    }

    @Test
    fun `selectUpcomingLifeGroupTasks honors the limit`() {
        val tasks = listOf(task("a", 1, "2026-10-13"), task("b", 1, "2026-10-14"))
        assertEquals(listOf("a"), selectUpcomingLifeGroupTasks(tasks, "2026-10-12", 1).map { it.id })
    }
}
