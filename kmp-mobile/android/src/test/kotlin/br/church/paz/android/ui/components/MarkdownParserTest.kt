package br.church.paz.android.ui.components

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class MarkdownParserTest {
    @Test
    fun `parses headings lists and paragraphs`() {
        val blocks =
            parseMarkdownBlocks(
                """
                # Titulo
                ## Sub
                ### Terceiro

                Texto simples
                - um
                * dois
                """.trimIndent(),
            )

        assertEquals(
            listOf(
                MarkdownBlock.Heading(1, "Titulo"),
                MarkdownBlock.Heading(2, "Sub"),
                MarkdownBlock.Heading(3, "Terceiro"),
                MarkdownBlock.Paragraph("Texto simples"),
                MarkdownBlock.ListItem("um"),
                MarkdownBlock.ListItem("dois"),
            ),
            blocks,
        )
    }

    @Test
    fun `parses ordered and indented list items`() {
        val blocks = parseMarkdownBlocks("1. primeiro\n2) segundo\n  - aninhado")

        assertEquals(
            listOf(
                MarkdownBlock.ListItem("primeiro", "1."),
                MarkdownBlock.ListItem("segundo", "2."),
                MarkdownBlock.ListItem("aninhado"),
            ),
            blocks,
        )
    }

    @Test
    fun `blank input yields no blocks`() {
        assertTrue(parseMarkdownBlocks("  \n\n").isEmpty())
    }

    @Test
    fun `parses bold italic and plain spans`() {
        assertEquals(
            listOf(
                InlineSpan.Plain("a "),
                InlineSpan.Bold("negrito"),
                InlineSpan.Plain(" e "),
                InlineSpan.Italic("italico"),
                InlineSpan.Plain(" e "),
                InlineSpan.Italic("outro"),
            ),
            parseInline("a **negrito** e *italico* e _outro_"),
        )
    }

    @Test
    fun `unterminated markers fall back to literal text`() {
        assertEquals(listOf(InlineSpan.Plain("so **aberto")), parseInline("so **aberto"))
        assertEquals(listOf(InlineSpan.Plain("so *aberto")), parseInline("so *aberto"))
    }

    @Test
    fun `unterminated markers do not swallow the rest of the line`() {
        assertEquals(
            listOf(InlineSpan.Plain("so ** aberto "), InlineSpan.Link("x", "https://a.com")),
            parseInline("so ** aberto [x](https://a.com)"),
        )
        assertEquals(
            listOf(InlineSpan.Plain("2 * 3 e "), InlineSpan.Bold("ok")),
            parseInline("2 * 3 e **ok**"),
        )
    }

    @Test
    fun `underscores inside words and urls stay literal`() {
        assertEquals(listOf(InlineSpan.Plain("snake_case_word")), parseInline("snake_case_word"))
        assertEquals(
            listOf(InlineSpan.Plain("veja https://x.com/a_b_c ok")),
            parseInline("veja https://x.com/a_b_c ok"),
        )
        assertEquals(
            listOf(InlineSpan.Plain("a "), InlineSpan.Italic("b"), InlineSpan.Plain(".")),
            parseInline("a _b_."),
        )
    }

    @Test
    fun `parses http and https links`() {
        assertEquals(
            listOf(
                InlineSpan.Plain("veja "),
                InlineSpan.Link("o site", "https://paz.example/guia"),
                InlineSpan.Plain(" ou "),
                InlineSpan.Link("este", "http://paz.example"),
            ),
            parseInline("veja [o site](https://paz.example/guia) ou [este](http://paz.example)"),
        )
    }

    @Test
    fun `unsafe link schemes render only the label`() {
        assertEquals(listOf(InlineSpan.Plain("clique")), parseInline("[clique](javascript:alert(1)"))
        assertEquals(listOf(InlineSpan.Plain("abrir")), parseInline("[abrir](intent://x)"))
        assertEquals(listOf(InlineSpan.Plain("arquivo")), parseInline("[arquivo](file:///etc/passwd)"))
    }

    @Test
    fun `malformed links stay literal`() {
        assertEquals(listOf(InlineSpan.Plain("[sem fim")), parseInline("[sem fim"))
        assertEquals(listOf(InlineSpan.Plain("[x](https://a")), parseInline("[x](https://a"))
        assertEquals(listOf(InlineSpan.Plain("[](https://a.com)")), parseInline("[](https://a.com)"))
    }

    @Test
    fun `isSafeLinkUrl only accepts web urls without whitespace`() {
        assertTrue(isSafeLinkUrl("https://a.com"))
        assertTrue(isSafeLinkUrl("HTTP://a.com"))
        assertFalse(isSafeLinkUrl("javascript:alert(1)"))
        assertFalse(isSafeLinkUrl("https://a.com/with space"))
        assertFalse(isSafeLinkUrl("mailto:a@b.com"))
        assertFalse(isSafeLinkUrl(""))
    }

    @Test
    fun `parses fenced code blocks verbatim`() {
        val blocks = parseMarkdownBlocks("antes\n```kotlin\nval a = 1\n\n# nao titulo\n```\ndepois")
        assertEquals(
            listOf(
                MarkdownBlock.Paragraph("antes"),
                MarkdownBlock.CodeBlock("val a = 1\n\n# nao titulo"),
                MarkdownBlock.Paragraph("depois"),
            ),
            blocks,
        )
    }

    @Test
    fun `unclosed fence still yields a code block`() {
        assertEquals(listOf(MarkdownBlock.CodeBlock("a\nb")), parseMarkdownBlocks("```\na\nb"))
    }

    @Test
    fun `parses blockquotes`() {
        assertEquals(
            listOf(MarkdownBlock.Quote("citacao **forte**"), MarkdownBlock.Quote("outra")),
            parseMarkdownBlocks("> citacao **forte**\n>\n  > outra"),
        )
    }

    @Test
    fun `parses inline code without nested formatting`() {
        assertEquals(
            listOf(InlineSpan.Plain("use "), InlineSpan.Code("**x** _y_"), InlineSpan.Plain(" ok")),
            parseInline("use `**x** _y_` ok"),
        )
    }

    @Test
    fun `unterminated or empty backticks stay literal`() {
        assertEquals(listOf(InlineSpan.Plain("so `aberto")), parseInline("so `aberto"))
        assertEquals(listOf(InlineSpan.Plain("a `` b")), parseInline("a `` b"))
    }

    @Test
    fun `links inside inline code are not links`() {
        assertEquals(listOf(InlineSpan.Code("[x](https://a.com)")), parseInline("`[x](https://a.com)`"))
    }
}
