import Foundation

/// The backend/wire format for plain calendar dates everywhere in the app
/// (e.g. `meeting_date`) is ISO `yyyy-MM-dd` — this converts it to the
/// Brazilian `dd/MM/yyyy` display convention used throughout the UI.
/// Returns the original string unchanged if it isn't a valid ISO date, so a
/// malformed value never disappears from the screen.
func brDateString(fromISODate isoDate: String) -> String {
    let iso = DateFormatter()
    iso.locale = Locale(identifier: "en_US_POSIX")
    iso.calendar = Calendar(identifier: .gregorian)
    iso.dateFormat = "yyyy-MM-dd"
    guard let date = iso.date(from: isoDate) else { return isoDate }

    let br = DateFormatter()
    br.locale = Locale(identifier: "pt_BR")
    br.calendar = Calendar(identifier: .gregorian)
    br.dateFormat = "dd/MM/yyyy"
    return br.string(from: date)
}
