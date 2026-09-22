package br.church.paz.shared.domain.model

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class CasaDePazLessonTest {

    private fun lesson(youtubeUrl: String?) =
        CasaDePazLesson(
            week = 1,
            title = "Semana 1",
            summary = "",
            guidelines = "",
            questions = emptyList(),
            youtubeUrl = youtubeUrl,
        )

    @Test
    fun `extracts id from watch v= form`() {
        val result = lesson("https://www.youtube.com/watch?v=abc123XYZ").youtubeVideoId
        assertEquals("abc123XYZ", result)
    }

    @Test
    fun `extracts id from watch v= form with trailing params`() {
        val result = lesson("https://www.youtube.com/watch?v=abc123XYZ&t=30s").youtubeVideoId
        assertEquals("abc123XYZ", result)
    }

    @Test
    fun `extracts id from youtu-be short form`() {
        val result = lesson("https://youtu.be/abc123XYZ").youtubeVideoId
        assertEquals("abc123XYZ", result)
    }

    @Test
    fun `extracts id from embed form`() {
        val result = lesson("https://www.youtube.com/embed/abc123XYZ").youtubeVideoId
        assertEquals("abc123XYZ", result)
    }

    @Test
    fun `returns null for malformed or unparseable url`() {
        assertNull(lesson("https://example.com/not-a-video").youtubeVideoId)
        assertNull(lesson(null).youtubeVideoId)
        assertNull(lesson("").youtubeVideoId)
    }
}
