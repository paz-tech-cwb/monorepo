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

    data class Link(
        val label: String,
        val url: String,
    ) : InlineSpan()
}

private val orderedListRegex = Regex("^(\\d{1,3})[.)] (.+)$")

internal fun parseMarkdownBlocks(markdown: String): List<MarkdownBlock> =
    markdown
        .lines()
        .mapNotNull { rawLine ->
            val line = rawLine.trimEnd()
            val trimmed = line.trimStart()
            val ordered = orderedListRegex.matchEntire(trimmed)
            when {
                line.isBlank() -> null
                line.startsWith("### ") -> MarkdownBlock.Heading(3, line.removePrefix("### "))
                line.startsWith("## ") -> MarkdownBlock.Heading(2, line.removePrefix("## "))
                line.startsWith("# ") -> MarkdownBlock.Heading(1, line.removePrefix("# "))
                trimmed.startsWith("- ") || trimmed.startsWith("* ") -> MarkdownBlock.ListItem(trimmed.drop(2))
                ordered != null ->
                    MarkdownBlock.ListItem(
                        text = ordered.groupValues[2],
                        marker = "${ordered.groupValues[1]}.",
                    )
                else -> MarkdownBlock.Paragraph(line)
            }
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
            text.startsWith("**", i) -> {
                val end = text.indexOf("**", i + 2)
                if (end == -1) {
                    addPlain(text.substring(i))
                    i = text.length
                } else {
                    spans += InlineSpan.Bold(text.substring(i + 2, end))
                    i = end + 2
                }
            }
            text.startsWith("*", i) || text.startsWith("_", i) -> {
                val marker = text[i]
                val end = text.indexOf(marker, i + 1)
                if (end == -1) {
                    addPlain(text.substring(i))
                    i = text.length
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
