package br.church.paz.shared.domain.model

import kotlinx.serialization.json.Json
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class LifeGroupRelationshipTest {
    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun `decodes relationship and is_supervised from life-groups me`() {
        val group =
            json.decodeFromString<LifeGroup>(
                """{"id":1,"name":"G","relationship":"supervisor","is_supervised":true,"future_field":1}""",
            )
        assertEquals("supervisor", group.relationship)
        assertTrue(group.isSupervised)
    }

    @Test
    fun `older backend without the new fields still decodes with defaults`() {
        val group = json.decodeFromString<LifeGroup>("""{"id":1,"name":"G"}""")
        assertNull(group.relationship)
        assertFalse(group.isSupervised)
    }
}
