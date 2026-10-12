import SwiftUI

/// Block kinds understood by `LifeGroupTaskMarkdownView` (admin-authored task guidance).
enum LifeGroupTaskMarkdownBlock: Equatable {
    case heading(level: Int, text: String)
    case bullet(indent: Int, text: String)
    case numbered(indent: Int, number: String, text: String)
    case paragraph(text: String)
}

/// Pure parsing/sanitizing helpers, kept free of SwiftUI so they are easy to test.
enum LifeGroupTaskMarkdown {
    static func parseBlocks(_ markdown: String) -> [LifeGroupTaskMarkdownBlock] {
        var blocks: [LifeGroupTaskMarkdownBlock] = []
        var paragraph: [String] = []

        func flushParagraph() {
            guard !paragraph.isEmpty else { return }
            blocks.append(.paragraph(text: paragraph.joined(separator: " ")))
            paragraph.removeAll()
        }

        for rawLine in markdown.replacingOccurrences(of: "\r\n", with: "\n").components(separatedBy: "\n") {
            let trimmed = rawLine.trimmingCharacters(in: .whitespaces)
            if trimmed.isEmpty {
                flushParagraph()
                continue
            }
            let leadingSpaces = rawLine.prefix(while: { $0 == " " || $0 == "\t" }).count
            let indent = min(leadingSpaces / 2, 3)

            if let heading = headingBlock(trimmed) {
                flushParagraph()
                blocks.append(heading)
            } else if trimmed.hasPrefix("- ") || trimmed.hasPrefix("* ") || trimmed.hasPrefix("+ ") {
                flushParagraph()
                blocks.append(.bullet(indent: indent, text: String(trimmed.dropFirst(2))))
            } else if let (number, rest) = orderedItem(trimmed) {
                flushParagraph()
                blocks.append(.numbered(indent: indent, number: number, text: rest))
            } else {
                paragraph.append(trimmed)
            }
        }
        flushParagraph()
        return blocks
    }

    private static func headingBlock(_ line: String) -> LifeGroupTaskMarkdownBlock? {
        let hashes = line.prefix(while: { $0 == "#" }).count
        guard (1...6).contains(hashes) else { return nil }
        let rest = line.dropFirst(hashes)
        guard rest.first == " " else { return nil }
        return .heading(level: hashes, text: rest.trimmingCharacters(in: .whitespaces))
    }

    private static func orderedItem(_ line: String) -> (String, String)? {
        let digits = line.prefix(while: \.isNumber)
        guard !digits.isEmpty, digits.count <= 3 else { return nil }
        let rest = line.dropFirst(digits.count)
        guard rest.hasPrefix(". ") || rest.hasPrefix(") ") else { return nil }
        return (String(digits), String(rest.dropFirst(2)))
    }

    /// Only http/https links are tappable; any other scheme (javascript:, tel:, file:, custom
    /// app schemes...) is dropped and the label stays as plain text.
    static func isSafeLinkURL(_ url: URL) -> Bool {
        guard let scheme = url.scheme?.lowercased() else { return false }
        return (scheme == "http" || scheme == "https") && url.host?.isEmpty == false
    }

    static func attributed(_ text: String) -> AttributedString {
        let options = AttributedString.MarkdownParsingOptions(
            interpretedSyntax: .inlineOnlyPreservingWhitespace,
            failurePolicy: .returnPartiallyParsedIfPossible
        )
        guard var result = try? AttributedString(markdown: text, options: options) else {
            return AttributedString(text)
        }
        for run in result.runs {
            guard let url = run.link, !isSafeLinkURL(url) else { continue }
            result[run.range].link = nil
        }
        return result
    }
}

/// Renders markdown guidance with headings, bullet/numbered lists, paragraphs, inline
/// bold/italic and safe (http/https) links.
struct LifeGroupTaskMarkdownView: View {
    let markdown: String

    var body: some View {
        VStack(alignment: .leading, spacing: PazSpacing.sm) {
            ForEach(Array(LifeGroupTaskMarkdown.parseBlocks(markdown).enumerated()), id: \.offset) { _, block in
                blockView(block)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder
    private func blockView(_ block: LifeGroupTaskMarkdownBlock) -> some View {
        switch block {
        case let .heading(level, text):
            Text(LifeGroupTaskMarkdown.attributed(text))
                .font(level <= 1 ? PazTypography.titleLarge : PazTypography.titleMedium)
                .foregroundStyle(PazColors.titleInk)
                .padding(.top, PazSpacing.xs)

        case let .bullet(indent, text):
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text("•").font(PazTypography.bodyMedium)
                Text(LifeGroupTaskMarkdown.attributed(text)).font(PazTypography.bodyMedium)
            }
            .padding(.leading, CGFloat(indent) * PazSpacing.lg)

        case let .numbered(indent, number, text):
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text("\(number).").font(PazTypography.bodyMedium)
                Text(LifeGroupTaskMarkdown.attributed(text)).font(PazTypography.bodyMedium)
            }
            .padding(.leading, CGFloat(indent) * PazSpacing.lg)

        case let .paragraph(text):
            Text(LifeGroupTaskMarkdown.attributed(text)).font(PazTypography.bodyMedium)
        }
    }
}
