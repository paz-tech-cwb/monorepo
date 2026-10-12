import Foundation

enum DeepLinkDestination: Hashable {
    case agendaDetail(eventId: String)
    case formDetail(formId: String)
    case ministryDetail(ministryId: String)
    case lifeGroupDetail(lifeGroupId: String)
    case lifeGroupStudyDetail(studyId: String)
    case lifeGroupAttendanceEditor(lifeGroupId: String, meetingDate: String)
    case lifeGroupTaskGuide(assignmentId: String)
    case formularios
    case memberJourney
    case account
}

extension DeepLinkDestination {
    /// Destinations pushed onto the Home tab's navigation stack (as opposed to
    /// destinations routed through AccountView's own navigation path).
    var usesHomeStack: Bool {
        switch self {
        case .agendaDetail, .lifeGroupAttendanceEditor, .lifeGroupTaskGuide: return true
        default: return false
        }
    }

    /// Destinations AccountView pushes onto its own navigation path.
    var usesAccountStack: Bool {
        switch self {
        case .formularios, .memberJourney, .formDetail, .ministryDetail, .lifeGroupDetail, .lifeGroupStudyDetail:
            return true
        default: return false
        }
    }

    /// Ids end up in route strings and API paths and the link can come from a push payload,
    /// so only a single `[A-Za-z0-9_-]` segment (numeric, uuid or slug) is accepted.
    static func isSafeId(_ value: String) -> Bool {
        !value.isEmpty && value.utf8.allSatisfy {
            ($0 >= 48 && $0 <= 57) || ($0 >= 65 && $0 <= 90) || ($0 >= 97 && $0 <= 122) || $0 == 45 || $0 == 95
        }
    }

    /// `yyyy-MM-dd` only.
    static func isSafeDate(_ value: String) -> Bool {
        let bytes = Array(value.utf8)
        guard bytes.count == 10 else { return false }
        for (i, b) in bytes.enumerated() {
            if i == 4 || i == 7 { if b != 45 { return false } } else if b < 48 || b > 57 { return false }
        }
        return true
    }

    /// Keys the backend may use for the deep link in the push payload. FCM places every
    /// `data` entry at the top level of the APNs `userInfo`, next to `aps`.
    static let userInfoDeepLinkKeys = ["deep_link", "deepLink"]

    /// Reads the raw `paz://...` deep link out of a notification's `userInfo`.
    static func rawDeepLink(fromUserInfo userInfo: [AnyHashable: Any]) -> String? {
        for key in userInfoDeepLinkKeys {
            if let value = userInfo[key] as? String, !value.trimmingCharacters(in: .whitespaces).isEmpty {
                return value
            }
        }
        return nil
    }

    /// Full resolution of a tapped notification's `userInfo` to a destination.
    static func from(userInfo: [AnyHashable: Any]) -> DeepLinkDestination? {
        rawDeepLink(fromUserInfo: userInfo)
            .flatMap { parsedRoute(fromDeepLink: $0) }
            .flatMap { from(parsedRoute: $0) }
    }

    /// Maps a raw `paz://...` deep link to the "parsed route" identifier consumed by
    /// `from(parsedRoute:)`. Returns nil for unknown links.
    static func parsedRoute(fromDeepLink rawDeepLink: String) -> String? {
        var deepLink = rawDeepLink.trimmingCharacters(in: .whitespacesAndNewlines)
        while deepLink.hasSuffix("/") { deepLink.removeLast() }
        let withIds = [
            "agenda", "form", "ministry", "lifegroup", "estudo-do-life", "presenca", "tarefa",
        ]
        for name in withIds {
            let prefix = "paz://\(name)/"
            if deepLink.hasPrefix(prefix) {
                let suffix = String(deepLink.dropFirst(prefix.count))
                if name == "presenca" {
                    let parts = suffix.split(separator: "/", omittingEmptySubsequences: false)
                    guard parts.count == 2, isSafeId(String(parts[0])), isSafeDate(String(parts[1])) else { return nil }
                } else if !isSafeId(suffix) {
                    return nil
                }
                return "\(name)/\(suffix)"
            }
        }
        if deepLink == "paz://formularios" || deepLink.hasPrefix("paz://formularios/") { return "formularios" }
        if deepLink == "paz://journey" { return "journey" }
        if deepLink == "paz://account" { return "account" }
        return nil
    }

    static func from(parsedRoute: String) -> DeepLinkDestination? {
        if parsedRoute.hasPrefix("agenda/") {
            let id = String(parsedRoute.dropFirst("agenda/".count))
            return !isSafeId(id) ? nil : .agendaDetail(eventId: id)
        }
        if parsedRoute.hasPrefix("form/") {
            let id = String(parsedRoute.dropFirst("form/".count))
            return !isSafeId(id) ? nil : .formDetail(formId: id)
        }
        if parsedRoute.hasPrefix("ministry/") {
            let id = String(parsedRoute.dropFirst("ministry/".count))
            return !isSafeId(id) ? nil : .ministryDetail(ministryId: id)
        }
        if parsedRoute.hasPrefix("lifegroup/") {
            let id = String(parsedRoute.dropFirst("lifegroup/".count))
            return !isSafeId(id) ? nil : .lifeGroupDetail(lifeGroupId: id)
        }
        if parsedRoute.hasPrefix("estudo-do-life/") {
            let id = String(parsedRoute.dropFirst("estudo-do-life/".count))
            return !isSafeId(id) ? nil : .lifeGroupStudyDetail(studyId: id)
        }
        if parsedRoute.hasPrefix("presenca/") {
            let parts = parsedRoute.dropFirst("presenca/".count).split(separator: "/", maxSplits: 1)
            guard parts.count == 2, isSafeId(String(parts[0])), isSafeDate(String(parts[1])) else { return nil }
            return .lifeGroupAttendanceEditor(lifeGroupId: String(parts[0]), meetingDate: String(parts[1]))
        }
        if parsedRoute.hasPrefix("tarefa/") {
            let id = String(parsedRoute.dropFirst("tarefa/".count))
            // A single path segment only: reject blank ids and extra segments.
            return !isSafeId(id) ? nil : .lifeGroupTaskGuide(assignmentId: id)
        }
        switch parsedRoute {
        case "formularios": return .formularios
        case "journey": return .memberJourney
        case "account": return .account
        default: return nil
        }
    }
}
