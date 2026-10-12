package br.church.paz.android.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLinkStyles
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withLink
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import br.church.paz.android.ui.theme.PazSpacing

/**
 * Minimal, hand-rolled Markdown renderer for study content ([bodyMarkdown]).
 * Supports paragraphs, headings (#, ##, ###), unordered lists ("- "/"* "),
 * bold (**text**), italic (*text* or _text_), ordered lists ("1. "), fenced code blocks (```), inline `code`,
 * blockquotes ("> ") and http(s) links ([label](https://...)); other link schemes render as plain text.
 * This intentionally does not aim to be a full CommonMark implementation — the project stores plain Markdown
 * and this covers the formatting produced by the in-app authoring toolbar.
 */
@Composable
fun MarkdownText(
    markdown: String,
    modifier: Modifier = Modifier,
) {
    val blocks = remember(markdown) { parseMarkdownBlocks(markdown) }
    val linkColor = MaterialTheme.colorScheme.primary
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(PazSpacing.Sm)) {
        blocks.forEach { block ->
            when (block) {
                is MarkdownBlock.Heading ->
                    Text(
                        text = renderInline(block.text, linkColor),
                        style =
                            when (block.level) {
                                1 -> MaterialTheme.typography.headlineSmall
                                2 -> MaterialTheme.typography.titleLarge
                                else -> MaterialTheme.typography.titleMedium
                            },
                    )
                is MarkdownBlock.ListItem ->
                    Row {
                        Text("${block.marker}  ", style = MaterialTheme.typography.bodyMedium)
                        Text(renderInline(block.text, linkColor), style = MaterialTheme.typography.bodyMedium)
                    }
                is MarkdownBlock.Paragraph ->
                    Text(renderInline(block.text, linkColor), style = MaterialTheme.typography.bodyMedium)
                is MarkdownBlock.CodeBlock ->
                    Text(
                        text = block.text,
                        style = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.Monospace),
                        modifier =
                            Modifier
                                .fillMaxWidth()
                                .background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f), MaterialTheme.shapes.small)
                                .horizontalScroll(rememberScrollState())
                                .padding(PazSpacing.Md),
                    )
                is MarkdownBlock.Quote -> {
                    val barColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f)
                    Text(
                        text = renderInline(block.text, linkColor),
                        style = MaterialTheme.typography.bodyMedium.copy(fontStyle = FontStyle.Italic),
                        modifier =
                            Modifier
                                .fillMaxWidth()
                                .drawBehind { drawRect(barColor, size = Size(3.dp.toPx(), size.height)) }
                                .padding(start = PazSpacing.Md),
                    )
                }
            }
        }
    }
}

private fun renderInline(
    text: String,
    linkColor: Color,
    codeBackground: Color = linkColor.copy(alpha = 0.1f),
): AnnotatedString =
    buildAnnotatedString {
        parseInline(text).forEach { span ->
            when (span) {
                is InlineSpan.Plain -> append(span.text)
                is InlineSpan.Bold -> withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(span.text) }
                is InlineSpan.Code ->
                    withStyle(SpanStyle(fontFamily = FontFamily.Monospace, background = codeBackground)) { append(span.text) }
                is InlineSpan.Italic -> withStyle(SpanStyle(fontStyle = FontStyle.Italic)) { append(span.text) }
                is InlineSpan.Link ->
                    withLink(
                        LinkAnnotation.Url(
                            url = span.url,
                            styles =
                                TextLinkStyles(
                                    style = SpanStyle(color = linkColor, textDecoration = TextDecoration.Underline),
                                ),
                        ),
                    ) { append(span.label) }
            }
        }
    }
