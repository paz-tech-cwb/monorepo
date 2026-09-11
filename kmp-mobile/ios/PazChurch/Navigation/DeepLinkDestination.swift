import Foundation

enum DeepLinkDestination: Hashable {
    case agendaDetail(eventId: String)
    case formDetail(formId: String)
    case ministryDetail(ministryId: String)
    case lifeGroupDetail(lifeGroupId: String)
    case lifeGroupStudyDetail(studyId: String)
    case lifeGroupAttendanceEditor(lifeGroupId: String, meetingDate: String)
    case formularios
    case memberJourney
    case account
}

extension DeepLinkDestination {
    var isAgendaDestination: Bool {
        if case .agendaDetail = self { return true }
        return false
    }

    static func from(parsedRoute: String) -> DeepLinkDestination? {
        if parsedRoute.hasPrefix("agenda/") {
            let id = String(parsedRoute.dropFirst("agenda/".count))
            return id.isEmpty ? nil : .agendaDetail(eventId: id)
        }
        if parsedRoute.hasPrefix("form/") {
            let id = String(parsedRoute.dropFirst("form/".count))
            return id.isEmpty ? nil : .formDetail(formId: id)
        }
        if parsedRoute.hasPrefix("ministry/") {
            let id = String(parsedRoute.dropFirst("ministry/".count))
            return id.isEmpty ? nil : .ministryDetail(ministryId: id)
        }
        if parsedRoute.hasPrefix("lifegroup/") {
            let id = String(parsedRoute.dropFirst("lifegroup/".count))
            return id.isEmpty ? nil : .lifeGroupDetail(lifeGroupId: id)
        }
        if parsedRoute.hasPrefix("estudo-do-life/") {
            let id = String(parsedRoute.dropFirst("estudo-do-life/".count))
            return id.isEmpty ? nil : .lifeGroupStudyDetail(studyId: id)
        }
        if parsedRoute.hasPrefix("presenca/") {
            let parts = parsedRoute.dropFirst("presenca/".count).split(separator: "/", maxSplits: 1)
            guard parts.count == 2 else { return nil }
            return .lifeGroupAttendanceEditor(lifeGroupId: String(parts[0]), meetingDate: String(parts[1]))
        }
        switch parsedRoute {
        case "formularios": return .formularios
        case "journey": return .memberJourney
        case "account": return .account
        default: return nil
        }
    }
}
