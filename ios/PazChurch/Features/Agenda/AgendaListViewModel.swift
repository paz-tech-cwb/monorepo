import Observation
import Shared
import SwiftUI

@MainActor
@Observable
class AgendaListViewModel {
    var events: [AgendaEvent] = []
    var isLoading = true
    var isLoadingMore = false
    var hasReachedEnd = false

    private let agendaRepository: AgendaRepository
    private var currentPage: Int32 = 1
    private var isRequestInFlight = false

    private static let pageSize: Int32 = 20

    init(agendaRepository: AgendaRepository) {
        self.agendaRepository = agendaRepository
    }

    func loadFirstPage() async {
        currentPage = 1
        isLoading = true
        hasReachedEnd = false
        isRequestInFlight = true
        defer { isRequestInFlight = false }
        do {
            let result = try await agendaRepository.getEvents(page: 1, limit: Self.pageSize)
            events = result
            hasReachedEnd = result.count < Self.pageSize
            isLoading = false
        } catch {
            print("[AgendaListVM] loadFirstPage FAILED — \(type(of: error)): \(error)")
            isLoading = false
        }
    }

    func loadMore() {
        guard !isRequestInFlight, !isLoading, !isLoadingMore, !hasReachedEnd else { return }
        isRequestInFlight = true
        Task {
            isLoadingMore = true
            defer {
                isLoadingMore = false
                isRequestInFlight = false
            }
            let nextPage = currentPage + 1
            do {
                let newEvents = try await agendaRepository.getEvents(page: nextPage, limit: Self.pageSize)
                currentPage = nextPage
                events += newEvents
                hasReachedEnd = newEvents.count < Self.pageSize
            } catch {
                // silently keep existing events; user can scroll back up and retry
            }
        }
    }
}
