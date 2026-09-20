import SwiftUI
import UIKit

/// Thin wrapper around `UIActivityViewController` — SwiftUI has no first-party
/// way to present the system share sheet with an arbitrary set of items
/// (images, files, text), so this bridges it for `.sheet(isPresented:)`.
struct ShareSheet: UIViewControllerRepresentable {
    let activityItems: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: activityItems, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
