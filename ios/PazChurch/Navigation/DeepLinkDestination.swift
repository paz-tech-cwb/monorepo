import Foundation

enum DeepLinkDestination: Hashable {
    case agendaDetail(eventId: String)
    case formDetail(formId: String)
    case ministryDetail(ministryId: String)
    case lifeGroupDetail(lifeGroupId: String)
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
        switch parsedRoute {
        case "formularios":   return .formularios
        case "journey":       return .memberJourney
        case "account":       return .account
        default:              return nil
        }
    }
}
