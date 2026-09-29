import SwiftUI

/// Minimal Markdown renderer for study/lesson body content. Uses `AttributedString(markdown:)`
/// (available on this project's iOS 19.4 deployment target) per-line so headings and
/// simple lists still read sensibly even though `AttributedString` markdown parsing does
/// not natively distinguish block-level heading sizes.
struct MarkdownBodyView: View {
    let markdown: String

    var body: some View {
        VStack(alignment: .leading, spacing: PazSpacing.sm) {
            ForEach(Array(lines.enumerated()), id: \.offset) { _, line in
                lineView(for: line)
            }
        }
    }

    private var lines: [String] {
        markdown.components(separatedBy: "\n").filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
    }

    @ViewBuilder
    private func lineView(for rawLine: String) -> some View {
        let line = rawLine.trimmingCharacters(in: .whitespaces)
        if line.hasPrefix("### ") {
            attributedText(String(line.dropFirst(4))).font(PazTypography.titleMedium)
        } else if line.hasPrefix("## ") {
            attributedText(String(line.dropFirst(3))).font(PazTypography.titleLarge)
        } else if line.hasPrefix("# ") {
            attributedText(String(line.dropFirst(2))).font(PazTypography.headlineSmall)
        } else if line.hasPrefix("- ") || line.hasPrefix("* ") {
            HStack(alignment: .top, spacing: 6) {
                Text("•").font(PazTypography.bodyMedium)
                attributedText(String(line.dropFirst(2))).font(PazTypography.bodyMedium)
            }
        } else {
            attributedText(line).font(PazTypography.bodyMedium)
        }
    }

    private func attributedText(_ text: String) -> Text {
        if let attributed = try? AttributedString(markdown: text) {
            return Text(attributed)
        }
        return Text(text)
    }
}
