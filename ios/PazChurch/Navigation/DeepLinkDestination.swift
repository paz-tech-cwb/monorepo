import Foundation

enum DeepLinkDestination: Hashable {
    case agendaDetail(eventId: String)
    case formularios
    case memberJourney
    case account
}

extension DeepLinkDestination {
    static func from(parsedRoute: String) -> DeepLinkDestination? {
        if parsedRoute.hasPrefix("agenda/") {
            let eventId = String(parsedRoute.dropFirst("agenda/".count))
            return eventId.isEmpty ? nil : .agendaDetail(eventId: eventId)
        }
        switch parsedRoute {
        case "formularios":   return .formularios
        case "journey":       return .memberJourney
        case "account":       return .account
        default:              return nil
        }
    }
}
