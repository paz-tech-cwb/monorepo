import Foundation

/// Application configuration constants per build scheme (Debug/Release).
/// Debug uses localhost (iOS Simulator shares host's network stack); Release uses VPS.
enum AppConfig {
    /// API base URL for the backend service
    static let baseUrl: String = {
        #if DEBUG
        "http://localhost:3001/api"
        #else
        "http://znzcybe6t18zwapiy9hytma5.62.238.45.195.sslip.io/api"
        #endif
    }()

    /// Welcome video URL for the member onboarding flow.
    ///
    /// Served as a static asset from admin-ui's public/ folder — not
    /// environment-specific, so debug and release point at the same
    /// production admin-ui host.
    static let onboardingVideoURL: URL = {
        let urlString = "http://f11zk1fs2i2igvjkhyyiubvc.62.238.45.195.sslip.io/onboarding/welcome.mp4"
        return URL(string: urlString)!
    }()
}
