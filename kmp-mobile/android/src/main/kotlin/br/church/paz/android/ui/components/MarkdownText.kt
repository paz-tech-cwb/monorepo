package br.church.paz.android.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import br.church.paz.android.ui.theme.PazSpacing

/**
 * Minimal, hand-rolled Markdown renderer for study content ([bodyMarkdown]).
 * Supports paragraphs, headings (#, ##, ###), unordered lists ("- "/"* "),
 * bold (**text**) and italic (*text*/_text_). This intentionally does not aim
 * to be a full CommonMark implementation — the project stores plain Markdown
 * and this covers the formatting produced by the in-app authoring toolbar.
 */
@Composable
fun MarkdownText(
    markdown: String,
    modifier: Modifier = Modifier,
) {
    val blocks = remember(markdown) { parseMarkdownBlocks(markdown) }
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
        blocks.forEach { block ->
            when (block) {
                is MarkdownBlock.Heading ->
                    Text(
                        text = renderInline(block.text),
                        style =
                            when (block.level) {
                                1 -> MaterialTheme.typography.headlineSmall
                                2 -> MaterialTheme.typography.titleLarge
                                else -> MaterialTheme.typography.titleMedium
                            },
                    )
                is MarkdownBlock.ListItem ->
                    Row {
                        Text("•  ", style = MaterialTheme.typography.bodyMedium)
                        Text(renderInline(block.text), style = MaterialTheme.typography.bodyMedium)
                    }
                is MarkdownBlock.Paragraph ->
                    Text(renderInline(block.text), style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}

private sealed class MarkdownBlock {
    data class Heading(val level: Int, val text: String) : MarkdownBlock()

    data class ListItem(val text: String) : MarkdownBlock()

    data class Paragraph(val text: String) : MarkdownBlock()
}

private fun parseMarkdownBlocks(markdown: String): List<MarkdownBlock> =
    markdown
        .lines()
        .mapNotNull { rawLine ->
            val line = rawLine.trimEnd()
            when {
                line.isBlank() -> null
                line.startsWith("### ") -> MarkdownBlock.Heading(3, line.removePrefix("### "))
                line.startsWith("## ") -> MarkdownBlock.Heading(2, line.removePrefix("## "))
                line.startsWith("# ") -> MarkdownBlock.Heading(1, line.removePrefix("# "))
                line.startsWith("- ") || line.startsWith("* ") -> MarkdownBlock.ListItem(line.drop(2))
                else -> MarkdownBlock.Paragraph(line)
            }
        }

private fun renderInline(text: String): AnnotatedString =
    buildAnnotatedString {
        var i = 0
        while (i < text.length) {
            when {
                text.startsWith("**", i) -> {
                    val end = text.indexOf("**", i + 2)
                    if (end == -1) {
                        append(text.substring(i))
                        i = text.length
                    } else {
                        withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(text.substring(i + 2, end)) }
                        i = end + 2
                    }
                }
                text.startsWith("*", i) || text.startsWith("_", i) -> {
                    val marker = text[i]
                    val end = text.indexOf(marker, i + 1)
                    if (end == -1) {
                        append(text.substring(i))
                        i = text.length
                    } else {
                        withStyle(SpanStyle(fontStyle = FontStyle.Italic)) { append(text.substring(i + 1, end)) }
                        i = end + 1
                    }
                }
                else -> {
                    append(text[i])
                    i++
                }
            }
        }
    }
