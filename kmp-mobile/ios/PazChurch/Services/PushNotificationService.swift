import FirebaseMessaging
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

    var deepLinkDestination: DeepLinkDestination? {
        pendingDeepLink.flatMap { DeepLinkDestination.from(parsedRoute: $0) }
    }

    func consumeDeepLink() {
        pendingDeepLink = nil
    }

    private var userRepository: UserRepository {
        IosAppContainer.shared.userRepository
    }

    override init() {
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
        installNotificationCenterDelegate()
    }

    /// The delegate must be installed before the app finishes launching (see
    /// `AppDelegate.didFinishLaunching`), otherwise the response of a notification tapped while
    /// the app was killed (cold start) can be delivered before anyone is listening and is lost.
    func installNotificationCenterDelegate() {
        UNUserNotificationCenter.current().delegate = self
    }

    /// Called by AppDelegate.application(_:didRegisterForRemoteNotificationsWithDeviceToken:)
    func didRegisterForRemoteNotifications(deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
        Messaging.messaging().token { [weak self] token, _ in
            guard let token else { return }
            Task {
                try? await self?.userRepository.registerDeviceToken(
                    token: DeviceToken(token: token, platform: .ios)
                )
            }
        }
    }

    /// Called when a notification is delivered while the app is in foreground
    func handleForegroundNotification(_ notification: UNNotification) -> UNNotificationPresentationOptions {
        [.banner, .badge, .sound]
    }

    /// Called when user taps a notification (foreground, background or cold start).
    func handleNotificationTap(_ response: UNNotificationResponse) {
        handleNotificationTap(userInfo: response.notification.request.content.userInfo)
    }

    func handleNotificationTap(userInfo: [AnyHashable: Any]) {
        guard let deepLink = DeepLinkDestination.rawDeepLink(fromUserInfo: userInfo) else { return }
        pendingDeepLink = parseDeepLink(deepLink)
    }

    // MARK: - Deep Link Parsing

    /// Returns the screen identifier that the app's navigation can act on.
    func parseDeepLink(_ deepLink: String) -> String? {
        DeepLinkDestination.parsedRoute(fromDeepLink: deepLink)
    }
}

// MARK: - MessagingDelegate (FCM token refresh)

extension PushNotificationService: MessagingDelegate {
    nonisolated func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let fcmToken else { return }
        Task {
            try? await self.userRepository.registerDeviceToken(
                token: DeviceToken(token: fcmToken, platform: .ios)
            )
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
