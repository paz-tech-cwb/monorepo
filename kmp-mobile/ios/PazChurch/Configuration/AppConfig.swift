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

    /// Welcome video URL for the member onboarding flow
    static let onboardingVideoURL: URL = {
        let urlString = "https://cdn.example.org/onboarding/welcome.mp4"
        return URL(string: urlString)!
    }()
}
