import Shared
import XCTest
@testable import PazChurch

final class HomeViewModelTests: XCTestCase {
    private func task(_ id: String, _ date: String, _ status: LifeGroupTaskStatus = .assigned) -> LifeGroupTask {
        LifeGroupTask(
            id: id, lifeGroupId: 1, lifeGroupName: "LG", meetingDate: date,
            name: "Task \(id)", description: "", guidance: "", status: status
        )
    }

    @MainActor
    func testUpcomingTasksFiltersByStatusAndDateSortsAndLimits() {
        let tasks = [
            task("past", "2026-01-01"),
            task("declined", "2026-02-01", .declined),
            task("c", "2026-03-10"),
            task("today", "2026-02-01"),
            task("b", "2026-02-15"),
            task("d", "2026-04-01"),
            task("done", "2026-02-02", .completed),
        ]
        let result = HomeViewModel.upcomingTasks(tasks, today: "2026-02-01")
        XCTAssertEqual(result.map(\.id), ["today", "b", "c"])
    }

    @MainActor
    func testUpcomingTasksHonoursCustomLimitAndEmpty() {
        XCTAssertTrue(HomeViewModel.upcomingTasks([], today: "2026-01-01").isEmpty)
        let tasks = [task("a", "2026-05-01"), task("b", "2026-05-02")]
        XCTAssertEqual(HomeViewModel.upcomingTasks(tasks, today: "2026-01-01", limit: 1).map(\.id), ["a"])
    }
}
