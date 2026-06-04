import FirebaseCore
import UIKit

/// UIApplicationDelegate required to receive APNs device token callbacks,
/// which are not bridged to the SwiftUI App lifecycle automatically.
class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        // Firebase is configured in PazChurchApp.init(); AppDelegate only needs
        // to handle APNs callbacks that arrive via UIApplicationDelegate.
        true
    }

    /// Called when APNs successfully registers the device.
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Task { @MainActor in
            await PushNotificationService.shared.didRegisterForRemoteNotifications(deviceToken: deviceToken)
        }
    }

    /// Called when APNs registration fails (e.g. simulator without entitlement).
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        // Non-fatal — push notifications unavailable on this device/environment
        print("[PushNotification] Failed to register: \(error.localizedDescription)")
    }
}
