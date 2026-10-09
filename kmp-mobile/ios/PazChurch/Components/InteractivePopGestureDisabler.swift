import SwiftUI
import UIKit

/// Intercepts the enclosing `UINavigationController`'s interactive pop (edge-swipe-back)
/// gesture so a screen with unsaved changes can block it and surface its own discard
/// confirmation instead of silently popping and losing data.
///
/// Attach via `.background(InteractivePopGestureDisabler(isDisabled:onBlockedSwipeAttempt:))`
/// on the screen's root view. Restores the original gesture delegate on teardown so sibling
/// screens that rely on the default swipe-back behavior are unaffected.
struct InteractivePopGestureDisabler: UIViewControllerRepresentable {
    var isDisabled: Bool
    var onBlockedSwipeAttempt: () -> Void

    func makeUIViewController(context: Context) -> UIViewController {
        UIViewController()
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {
        context.coordinator.isDisabled = isDisabled
        context.coordinator.onBlockedSwipeAttempt = onBlockedSwipeAttempt
        attachIfNeeded(uiViewController, coordinator: context.coordinator)
        // The navigation controller may not be resolvable yet on the first pass
        // (view hierarchy still settling) — retry shortly so the gesture is reliably
        // intercepted rather than silently no-op'ing if it wasn't set yet.
        DispatchQueue.main.async {
            attachIfNeeded(uiViewController, coordinator: context.coordinator)
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    static func dismantleUIViewController(_ uiViewController: UIViewController, coordinator: Coordinator) {
        coordinator.detach()
    }

    private func attachIfNeeded(_ uiViewController: UIViewController, coordinator: Coordinator) {
        guard let navigationController = uiViewController.navigationController ?? uiViewController.parent?.navigationController else { return }
        coordinator.attach(to: navigationController)
    }

    final class Coordinator: NSObject, UIGestureRecognizerDelegate {
        var isDisabled = false
        var onBlockedSwipeAttempt: () -> Void = {}

        private weak var navigationController: UINavigationController?
        private weak var originalDelegate: UIGestureRecognizerDelegate?
        private var didAttach = false

        func attach(to navigationController: UINavigationController) {
            guard !didAttach, let gesture = navigationController.interactivePopGestureRecognizer else { return }
            self.navigationController = navigationController
            originalDelegate = gesture.delegate
            gesture.delegate = self
            didAttach = true
        }

        func detach() {
            guard let gesture = navigationController?.interactivePopGestureRecognizer else { return }
            gesture.delegate = originalDelegate
            didAttach = false
        }

        func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
            if isDisabled {
                onBlockedSwipeAttempt()
                return false
            }
            return originalDelegate?.gestureRecognizerShouldBegin?(gestureRecognizer) ?? true
        }

        func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldReceive touch: UITouch) -> Bool {
            originalDelegate?.gestureRecognizer?(gestureRecognizer, shouldReceive: touch) ?? true
        }

        func gestureRecognizer(
            _ gestureRecognizer: UIGestureRecognizer,
            shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer
        ) -> Bool {
            originalDelegate?.gestureRecognizer?(
                gestureRecognizer,
                shouldRecognizeSimultaneouslyWith: otherGestureRecognizer
            ) ?? false
        }
    }
}
