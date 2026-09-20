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
    /// ====================================================================
    /// !!! PLACEHOLDER — MUST BE REPLACED BEFORE PRODUCTION RELEASE !!!
    /// `cdn.example.org` does not exist. `WelcomeVideoStepView` detects the
    /// load failure (AVPlayerItem `.failed` / FailedToPlayToEndTime / a 15s
    /// start timeout) and shows a "Continuar" escape hatch, so the app is not
    /// hard-locked — but every member still sees an error instead of the
    /// welcome video until a real hosted asset URL is put here.
    /// The same placeholder exists in android/build.gradle.kts
    /// (`ONBOARDING_VIDEO_URL`, both debug and release).
    /// ====================================================================
    static let onboardingVideoURL: URL = {
        let urlString = "https://cdn.example.org/onboarding/welcome.mp4"
        return URL(string: urlString)!
    }()
}
