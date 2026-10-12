package br.church.paz.android.notifications

import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class PushNotificationHelperTest {
    @Test
    fun `parses agenda deep link`() {
        assertEquals(
            "agenda_detail/evt-1",
            PushNotificationHelper.parseDeepLink("paz://agenda/evt-1"),
        )
    }

    @Test
    fun `parses form deep link`() {
        assertEquals(
            "form_detail/form-1",
            PushNotificationHelper.parseDeepLink("paz://form/form-1"),
        )
    }

    @Test
    fun `parses journey deep link`() {
        assertEquals(
            "member_journey",
            PushNotificationHelper.parseDeepLink("paz://journey"),
        )
    }

    @Test
    fun `parses presenca deep link`() {
        assertEquals(
            "life_group_attendance_editor/42/2026-10-05",
            PushNotificationHelper.parseDeepLink("paz://presenca/42/2026-10-05"),
        )
    }

    @Test
    fun `parses estudo-do-life deep link`() {
        assertEquals(
            "life_group_study_detail/study-1",
            PushNotificationHelper.parseDeepLink("paz://estudo-do-life/study-1"),
        )
    }

    @Test
    fun `parses ministry deep link`() {
        assertEquals(
            "ministry_detail/min-1",
            PushNotificationHelper.parseDeepLink("paz://ministry/min-1"),
        )
    }

    @Test
    fun `parses lifegroup deep link`() {
        assertEquals(
            "life_group_detail/lg-1",
            PushNotificationHelper.parseDeepLink("paz://lifegroup/lg-1"),
        )
    }

    @Test
    fun `parses formularios deep link`() {
        assertEquals(
            "formularios",
            PushNotificationHelper.parseDeepLink("paz://formularios"),
        )
    }

    @Test
    fun `parses account deep link`() {
        assertEquals(
            "account",
            PushNotificationHelper.parseDeepLink("paz://account"),
        )
    }

    @Test
    fun `returns null for presenca missing meeting date`() {
        assertNull(PushNotificationHelper.parseDeepLink("paz://presenca/42"))
    }

    @Test
    fun `returns null for presenca missing lifeGroupId`() {
        assertNull(PushNotificationHelper.parseDeepLink("paz://presenca//2026-10-05"))
    }

    @Test
    fun `returns null for presenca with blank meeting date`() {
        assertNull(PushNotificationHelper.parseDeepLink("paz://presenca/42/"))
    }

    @Test
    fun `parses tarefa deep link to the life group task guide route`() {
        assertEquals(
            "life_group_task/9f1c2d3e-aaaa-bbbb-cccc-1234567890ab",
            PushNotificationHelper.parseDeepLink("paz://tarefa/9f1c2d3e-aaaa-bbbb-cccc-1234567890ab"),
        )
    }

    @Test
    fun `returns null for tarefa missing assignment id`() {
        assertNull(PushNotificationHelper.parseDeepLink("paz://tarefa/"))
        assertNull(PushNotificationHelper.parseDeepLink("paz://tarefa//"))
    }

    @Test
    fun `returns null for tarefa with extra path segments`() {
        assertNull(PushNotificationHelper.parseDeepLink("paz://tarefa/42/extra"))
    }

    @Test
    fun `returns null for unknown prefix`() {
        assertNull(PushNotificationHelper.parseDeepLink("paz://unknown/123"))
    }

    @Test
    fun `returns null for blank deep link`() {
        assertNull(PushNotificationHelper.parseDeepLink(""))
    }

    @Test
    fun `returns null for malformed scheme`() {
        assertNull(PushNotificationHelper.parseDeepLink("not-a-deep-link"))
    }

    @Test
    fun `routeFromExtras resolves the attendance route from FCM data extras`() {
        // Same shape the FCM SDK puts on the launcher Intent for a background/killed tap.
        val extras = mapOf("deep_link" to "paz://presenca/42/2026-10-05", "channel_id" to "paz_life_group")
        assertEquals(
            "life_group_attendance_editor/42/2026-10-05",
            PushNotificationHelper.routeFromExtras { extras[it] },
        )
    }

    @Test
    fun `routeFromExtras resolves every pilot category`() {
        val cases =
            mapOf(
                "paz://presenca/7/2026-01-04" to "life_group_attendance_editor/7/2026-01-04",
                "paz://tarefa/abc-1" to "life_group_task/abc-1",
                "paz://estudo-do-life/s-1" to "life_group_study_detail/s-1",
                "paz://form/relatorio-semanal" to "form_detail/relatorio-semanal",
                "paz://agenda/9" to "agenda_detail/9",
                "paz://journey" to "member_journey",
            )
        cases.forEach { (deepLink, route) ->
            val extras = mapOf("deep_link" to deepLink)
            assertEquals(route, PushNotificationHelper.routeFromExtras { extras[it] }, deepLink)
        }
    }

    @Test
    fun `routeFromExtras accepts the camelCase key`() {
        val extras = mapOf("deepLink" to "paz://tarefa/abc-1")
        assertEquals("life_group_task/abc-1", PushNotificationHelper.routeFromExtras { extras[it] })
    }

    @Test
    fun `routeFromExtras returns null without a deep link extra`() {
        val extras = mapOf("channel_id" to "paz_events")
        assertNull(PushNotificationHelper.routeFromExtras { extras[it] })
    }

    @Test
    fun `routeFromExtras returns null for blank or unknown deep link`() {
        assertNull(PushNotificationHelper.routeFromExtras { if (it == "deep_link") "  " else null })
        assertNull(PushNotificationHelper.routeFromExtras { if (it == "deep_link") "paz://nope/1" else null })
    }

    @Test
    fun `parseDeepLink trims whitespace and trailing slashes`() {
        assertEquals(
            "life_group_attendance_editor/42/2026-10-05",
            PushNotificationHelper.parseDeepLink(" paz://presenca/42/2026-10-05/ "),
        )
        assertEquals("agenda_detail/9", PushNotificationHelper.parseDeepLink("paz://agenda/9/"))
    }

    @Test
    fun `returns null for single id links with blank id or extra segments`() {
        // An unmatched route would crash NavController.navigate.
        assertNull(PushNotificationHelper.parseDeepLink("paz://agenda/"))
        assertNull(PushNotificationHelper.parseDeepLink("paz://form/"))
        assertNull(PushNotificationHelper.parseDeepLink("paz://estudo-do-life//"))
        assertNull(PushNotificationHelper.parseDeepLink("paz://lifegroup/1/2"))
    }

    @Test
    fun `rejects ids with unsafe characters`() {
        listOf(
            "paz://agenda/a?x=1",
            "paz://agenda/a#frag",
            "paz://agenda/a%2Fb",
            "paz://agenda/a b",
            "paz://form/..",
            "paz://ministry/a.b",
            "paz://lifegroup/a/b",
            "paz://estudo-do-life/a/b",
            "paz://tarefa/a?x",
            "paz://tarefa/a/b",
        ).forEach { assertNull(PushNotificationHelper.parseDeepLink(it), it) }
    }

    @Test
    fun `accepts numeric uuid and slug ids`() {
        assertEquals("agenda_detail/42", PushNotificationHelper.parseDeepLink("paz://agenda/42"))
        assertEquals(
            "life_group_task/3f2b8c1e-9a4d-4e6f-8b1a-0c9d7e5f4a3b",
            PushNotificationHelper.parseDeepLink("paz://tarefa/3f2b8c1e-9a4d-4e6f-8b1a-0c9d7e5f4a3b"),
        )
        assertEquals(
            "form_detail/relatorio_semanal-2",
            PushNotificationHelper.parseDeepLink("paz://form/relatorio_semanal-2"),
        )
    }

    @Test
    fun `presenca validates id and date`() {
        assertNull(PushNotificationHelper.parseDeepLink("paz://presenca/42/2026-10-5"))
        assertNull(PushNotificationHelper.parseDeepLink("paz://presenca/42/2026-10-05/extra"))
        assertNull(PushNotificationHelper.parseDeepLink("paz://presenca/42/2026-10-05?x=1"))
        assertNull(PushNotificationHelper.parseDeepLink("paz://presenca/4?2/2026-10-05"))
        assertNull(PushNotificationHelper.parseDeepLink("paz://presenca/42"))
    }
}
