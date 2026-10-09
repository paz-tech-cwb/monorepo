import Foundation

extension Bundle {
    /// "{CFBundleShortVersionString} ({CFBundleVersion})", e.g. "1.0.0 (42)".
    /// Falls back to "—" for either component if missing (should never happen in a
    /// real build, but keeps this helper total rather than force-unwrapping).
    var appVersionString: String {
        let shortVersion = object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "—"
        let buildNumber = object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "—"
        return "\(shortVersion) (\(buildNumber))"
    }
}
