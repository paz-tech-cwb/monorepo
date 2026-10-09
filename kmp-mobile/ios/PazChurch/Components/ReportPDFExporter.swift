import SwiftUI
import UIKit

/// Renders an arbitrary SwiftUI view (the FULL report content — every
/// section, not just whatever fits on screen) into a paginated PDF file
/// using platform-native APIs only: `ImageRenderer` to rasterize the
/// content at its full intrinsic height, then `UIGraphicsPDFRenderer` to
/// slice that image across as many A4 pages as needed.
///
/// This replaces the previous single-screenshot export (which either
/// clipped to the viewport on Android or omitted sections on iOS) with a
/// real multi-page PDF of the entire report.
enum ReportPDFExporter {
    /// A4 at 72dpi, matching `UIGraphicsPDFRenderer`'s default point space.
    private static let pageWidth: CGFloat = 595.2
    private static let pageHeight: CGFloat = 841.8
    private static let pageMargin: CGFloat = 24

    enum ExportError: Error {
        case renderFailed
        case writeFailed
    }

    /// Renders `content` to a PDF and writes it to a temp file, returning
    /// the file URL for sharing. Runs the (synchronous, CPU-bound)
    /// rendering off the main actor's hot path isn't possible since
    /// `ImageRenderer` requires MainActor, but it's wrapped as `async` so
    /// callers can show a "generating…" state without freezing UI
    /// gestures mid-frame.
    @MainActor
    static func export(
        fileName: String,
        contentWidth: CGFloat = pageWidth - pageMargin * 2,
        @ViewBuilder content: () -> some View
    ) async throws -> URL {
        // Give SwiftUI a frame to actually render the "generating…" spinner
        // state before this function blocks the main actor on the
        // CPU-bound `ImageRenderer` work below.
        await Task.yield()

        let renderer = ImageRenderer(content: content().frame(width: contentWidth))
        renderer.scale = min(UIScreen.main.scale, 2.0)

        guard let fullImage = renderer.uiImage, fullImage.size.height > 0 else {
            throw ExportError.renderFailed
        }

        let pdfData = renderPaginatedPDF(from: fullImage, contentWidth: contentWidth)

        let url = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)
        do {
            try pdfData.write(to: url, options: .atomic)
        } catch {
            throw ExportError.writeFailed
        }
        return url
    }

    /// Slices a single tall rasterized image across N pages, scaling it
    /// down to fit the printable content width/height of an A4 page.
    private static func renderPaginatedPDF(from image: UIImage, contentWidth: CGFloat) -> Data {
        let pageRect = CGRect(x: 0, y: 0, width: pageWidth, height: pageHeight)
        let contentHeight = pageHeight - pageMargin * 2

        // Scale factor from the rasterized image's point space to the PDF
        // page's content width.
        let scale = contentWidth / image.size.width
        let scaledImageHeight = image.size.height * scale

        let pageCount = max(1, Int(ceil(scaledImageHeight / contentHeight)))

        let renderer = UIGraphicsPDFRenderer(bounds: pageRect)
        return renderer.pdfData { context in
            for pageIndex in 0..<pageCount {
                context.beginPage()
                let yOffset = pageMargin - CGFloat(pageIndex) * contentHeight
                let drawRect = CGRect(
                    x: pageMargin,
                    y: yOffset,
                    width: contentWidth,
                    height: scaledImageHeight
                )
                let clipRect = CGRect(
                    x: pageMargin,
                    y: pageMargin,
                    width: contentWidth,
                    height: contentHeight
                )
                context.cgContext.saveGState()
                context.cgContext.clip(to: clipRect)
                image.draw(in: drawRect)
                context.cgContext.restoreGState()
            }
        }
    }
}
