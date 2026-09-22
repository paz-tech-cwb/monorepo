import Foundation
import Observation
import Shared

private let isoDateFormatter: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withFullDate]
    return formatter
}()

private let defaultWindowMonths = 6

@MainActor
@Observable
class CasaDePazAnalyticsViewModel {
    // "YYYY-MM-DD" — free from/to date range, defaulting to the same window
    // the backend defaults to when the params are omitted (6 months back,
    // start of month, through today), matching admin-ui exactly.
    var from: String
    var to: String

    var summary: CasaDePazAnalyticsSummary?
    var isLoading = true
    var error: String?

    private let repository: CasaDePazAnalyticsRepository

    init(repository: CasaDePazAnalyticsRepository) {
        self.repository = repository
        let calendar = Calendar(identifier: .gregorian)
        let now = Date()
        self.to = Self.isoString(from: now)
        let startOfWindow = calendar.date(byAdding: .month, value: -(defaultWindowMonths - 1), to: now) ?? now
        let components = calendar.dateComponents([.year, .month], from: startOfWindow)
        let firstOfMonth = calendar.date(from: components) ?? startOfWindow
        self.from = Self.isoString(from: firstOfMonth)
    }

    func load() async {
        isLoading = true
        error = nil
        do {
            summary = try await repository.getSummary(from: from, to: to)
        } catch {
            self.error = "Não foi possível carregar o relatório de Casa de Paz."
        }
        isLoading = false
    }

    func onFromSelected(_ iso: String) {
        from = iso
        Task { await load() }
    }

    func onToSelected(_ iso: String) {
        to = iso
        Task { await load() }
    }

    private static func isoString(from date: Date) -> String {
        isoDateFormatter.string(from: date)
    }
}
