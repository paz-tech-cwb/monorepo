package br.church.paz.android.ui.components

/** Block-level nodes produced by [parseMarkdownBlocks]. */
internal sealed class MarkdownBlock {
    data class Heading(
        val level: Int,
        val text: String,
    ) : MarkdownBlock()

    /** [marker] is "•" for unordered items or "1." style for ordered ones. */
    data class ListItem(
        val text: String,
        val marker: String = "•",
    ) : MarkdownBlock()

    data class Paragraph(
        val text: String,
    ) : MarkdownBlock()

    /** Fenced (```) code block; [text] is the raw content, never parsed inline. */
    data class CodeBlock(
        val text: String,
    ) : MarkdownBlock()

    /** One "> " quoted line; inline formatting still applies to [text]. */
    data class Quote(
        val text: String,
    ) : MarkdownBlock()
}

/** Inline nodes produced by [parseInline]. */
internal sealed class InlineSpan {
    data class Plain(
        val text: String,
    ) : InlineSpan()

    data class Bold(
        val text: String,
    ) : InlineSpan()

    data class Italic(
        val text: String,
    ) : InlineSpan()

    /** `inline code`; the content is literal (no nested formatting). */
    data class Code(
        val text: String,
    ) : InlineSpan()

    data class Link(
        val label: String,
        val url: String,
    ) : InlineSpan()
}

private val orderedListRegex = Regex("^(\\d{1,3})[.)] (.+)$")

internal fun parseMarkdownBlocks(markdown: String): List<MarkdownBlock> {
    val blocks = mutableListOf<MarkdownBlock>()
    var codeLines: MutableList<String>? = null

    for (rawLine in markdown.lines()) {
        val line = rawLine.trimEnd()
        val trimmed = line.trimStart()

        val openCode = codeLines
        if (openCode != null) {
            if (trimmed.startsWith("```")) {
                blocks += MarkdownBlock.CodeBlock(openCode.joinToString("\n"))
                codeLines = null
            } else {
                openCode += line
            }
            continue
        }
        if (trimmed.startsWith("```")) {
            codeLines = mutableListOf()
            continue
        }

        val ordered = orderedListRegex.matchEntire(trimmed)
        val block =
            when {
                line.isBlank() -> null
                line.startsWith("### ") -> MarkdownBlock.Heading(3, line.removePrefix("### "))
                line.startsWith("## ") -> MarkdownBlock.Heading(2, line.removePrefix("## "))
                line.startsWith("# ") -> MarkdownBlock.Heading(1, line.removePrefix("# "))
                trimmed == ">" -> null
                trimmed.startsWith("> ") -> MarkdownBlock.Quote(trimmed.drop(2).trim())
                trimmed.startsWith("- ") || trimmed.startsWith("* ") -> MarkdownBlock.ListItem(trimmed.drop(2))
                ordered != null ->
                    MarkdownBlock.ListItem(
                        text = ordered.groupValues[2],
                        marker = "${ordered.groupValues[1]}.",
                    )
                else -> MarkdownBlock.Paragraph(line)
            }
        if (block != null) blocks += block
    }
    // An unclosed fence still renders what was written.
    codeLines?.let { blocks += MarkdownBlock.CodeBlock(it.joinToString("\n")) }
    return blocks
}

/**
 * Only plain web links are rendered as tappable. Anything else (javascript:, intent:, file:,
 * custom schemes...) is shown as plain label text, since the guidance is admin-authored
 * content rendered inside the app.
 */
internal fun isSafeLinkUrl(url: String): Boolean {
    val lower = url.trim().lowercase()
    return (lower.startsWith("https://") || lower.startsWith("http://")) && lower.none { it.isWhitespace() }
}

internal fun parseInline(text: String): List<InlineSpan> {
    val spans = mutableListOf<InlineSpan>()

    fun addPlain(value: String) {
        if (value.isEmpty()) return
        val last = spans.lastOrNull()
        if (last is InlineSpan.Plain) {
            spans[spans.lastIndex] = InlineSpan.Plain(last.text + value)
        } else {
            spans += InlineSpan.Plain(value)
        }
    }

    var i = 0
    while (i < text.length) {
        when {
            text[i] == '`' -> {
                val end = text.indexOf('`', i + 1)
                if (end == -1 || end == i + 1) {
                    addPlain("`")
                    i++
                } else {
                    spans += InlineSpan.Code(text.substring(i + 1, end))
                    i = end + 1
                }
            }
            text.startsWith("**", i) -> {
                val end = text.indexOf("**", i + 2)
                if (end == -1) {
                    // Unmatched marker: keep it literal and carry on, so later
                    // bold/links on the same line are still parsed.
                    addPlain("**")
                    i += 2
                } else {
                    spans += InlineSpan.Bold(text.substring(i + 2, end))
                    i = end + 2
                }
            }
            text[i] == '*' || text[i] == '_' -> {
                val end = findItalicEnd(text, i)
                if (end == -1) {
                    addPlain(text[i].toString())
                    i++
                } else {
                    spans += InlineSpan.Italic(text.substring(i + 1, end))
                    i = end + 1
                }
            }
            text[i] == '[' -> {
                val labelEnd = text.indexOf("](", i + 1)
                val urlEnd = if (labelEnd == -1) -1 else text.indexOf(')', labelEnd + 2)
                if (labelEnd == -1 || urlEnd == -1 || labelEnd == i + 1) {
                    addPlain("[")
                    i++
                } else {
                    val label = text.substring(i + 1, labelEnd)
                    val url = text.substring(labelEnd + 2, urlEnd).trim()
                    if (isSafeLinkUrl(url)) {
                        spans += InlineSpan.Link(label, url)
                    } else {
                        addPlain(label)
                    }
                    i = urlEnd + 1
                }
            }
            else -> {
                addPlain(text[i].toString())
                i++
            }
        }
    }
    return spans
}

/**
 * Index of the marker closing the italic span opened at [start], or -1 when
 * the marker must stay literal. `_` only opens/closes at a word boundary so
 * `snake_case_word` and URLs keep their underscores; the span must not be empty.
 */
private fun findItalicEnd(
    text: String,
    start: Int,
): Int {
    val marker = text[start]
    // Like CommonMark: the opener must be followed by non-space (so "2 * 3" stays literal).
    if (start + 1 >= text.length || text[start + 1].isWhitespace()) return -1
    if (marker == '_' && start > 0 && text[start - 1].isLetterOrDigit()) return -1
    var end = text.indexOf(marker, start + 1)
    while (end != -1) {
        val closes =
            end > start + 1 &&
                !text[end - 1].isWhitespace() &&
                (if (marker == '*') text.getOrNull(end + 1) != '*' else (end + 1 >= text.length || !text[end + 1].isLetterOrDigit()))
        if (closes) return end
        end = text.indexOf(marker, end + 1)
    }
    return -1
}
