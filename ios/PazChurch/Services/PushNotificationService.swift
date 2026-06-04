import Foundation
import Observation
import Shared
import UIKit
import UserNotifications

// Handles APNs permission, FCM token registration, and notification routing.
// Integrates with Firebase Messaging via AppDelegate UIApplicationDelegate methods.

@MainActor
@Observable
class PushNotificationService: NSObject {
    static let shared = PushNotificationService()

    var pendingDeepLink: String?

    private let userRepository: UserRepository

    override init() {
        self.userRepository = IosAppContainer.shared.userRepository
        super.init()
    }

    // MARK: - Permission + Registration

    func requestPermissionAndRegister() {
        UNUserNotificationCenter.current().requestAuthorization(
            options: [.alert, .badge, .sound]
        ) { [weak self] granted, _ in
            guard granted else { return }
            Task { @MainActor in
                UIApplication.shared.registerForRemoteNotifications()
            }
        }
        UNUserNotificationCenter.current().delegate = self
    }

    /// Called by AppDelegate.application(_:didRegisterForRemoteNotificationsWithDeviceToken:)
    func didRegisterForRemoteNotifications(deviceToken: Data) {
        // Convert APNs token to hex string for direct APNs usage.
        let tokenString = deviceToken.map { String(format: "%02x", $0) }.joined()

        // If using Firebase Messaging, FIRMessaging.messaging().apnsToken = deviceToken
        // and use messaging().token(completion:) for the FCM token instead.
        // For now, register the APNs token directly.
        Task {
            do {
                try await userRepository.registerDeviceToken(
                    token: DeviceToken(token: tokenString, platform: .ios)
                )
            } catch {
                // Non-critical — token registration is best-effort
            }
        }
    }

    /// Called when a notification is delivered while the app is in foreground
    func handleForegroundNotification(_ notification: UNNotification) -> UNNotificationPresentationOptions {
        [.banner, .badge, .sound]
    }

    /// Called when user taps a notification
    func handleNotificationTap(_ response: UNNotificationResponse) {
        let userInfo = response.notification.request.content.userInfo
        if let deepLink = userInfo["deep_link"] as? String {
            pendingDeepLink = parseDeepLink(deepLink)
        }
    }

    // MARK: - Deep Link Parsing

    func parseDeepLink(_ deepLink: String) -> String? {
        // Returns the screen identifier that the app's navigation can act on
        switch true {
        case deepLink.hasPrefix("paz://agenda/"):
            "agenda/\(deepLink.dropFirst("paz://agenda/".count))"

        case deepLink.hasPrefix("paz://form/"):
            "form/\(deepLink.dropFirst("paz://form/".count))"

        case deepLink.hasPrefix("paz://ministry/"):
            "ministry/\(deepLink.dropFirst("paz://ministry/".count))"

        case deepLink.hasPrefix("paz://lifegroup/"):
            "lifegroup/\(deepLink.dropFirst("paz://lifegroup/".count))"

        case deepLink == "paz://formularios":
            "formularios"

        case deepLink == "paz://journey":
            "journey"

        case deepLink == "paz://account":
            "account"

        default:
            nil
        }
    }
}

// MARK: - UNUserNotificationCenterDelegate

extension PushNotificationService: UNUserNotificationCenterDelegate {
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        Task { @MainActor in
            completionHandler(self.handleForegroundNotification(notification))
        }
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        Task { @MainActor in
            self.handleNotificationTap(response)
            completionHandler()
        }
    }
}
