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

    // MARK: - Life group cards

    private func group(
        _ id: Int32, _ name: String, leaderId: Int32? = nil, coLeaderId: Int32? = nil,
        day: String? = nil, time: String? = nil
    ) -> LifeGroup {
        LifeGroup(
            id: id, name: name, leaderId: leaderId.map { KotlinInt(value: $0) }, leader: nil, leaderPhone: nil,
            coLeaderId: coLeaderId.map { KotlinInt(value: $0) }, coLeaderName: nil, coLeaderPhone: nil,
            sectorId: nil, location: nil, latitude: nil, longitude: nil, meetingDay: day, meetingTime: time,
            membersCount: 5, kidsCount: 0, members: nil
        )
    }

    private func groupTask(_ id: String, group: Int32, _ date: String) -> LifeGroupTask {
        LifeGroupTask(
            id: id, lifeGroupId: group, lifeGroupName: "LG", meetingDate: date,
            name: "Task \(id)", description: "", guidance: "", status: .assigned
        )
    }

    @MainActor
    func testResolveBuildsCardsWithTasksFoldedByGroup() {
        let resolved = HomeViewModel.resolveLifeGroups(
            currentUserId: 7,
            groups: [group(1, "Alfa"), group(2, "Beta", leaderId: 7)],
            tasks: [groupTask("t1", group: 1, "2026-03-01"), groupTask("t2", group: 2, "2026-03-02")],
            today: "2026-02-01"
        )
        // The group the viewer leads comes first.
        XCTAssertEqual(resolved.cards.map(\.group.id), [2, 1])
        XCTAssertEqual(resolved.cards.first?.tasks.map(\.id), ["t2"])
        XCTAssertEqual(resolved.cards.last?.tasks.map(\.id), ["t1"])
        XCTAssertEqual(resolved.hiddenCount, 0)
        XCTAssertFalse(resolved.showDiscoveryCTA)
        XCTAssertTrue(resolved.legacyTasks.isEmpty)
    }

    @MainActor
    func testResolveCapsAtThreeCardsAndCountsHidden() {
        let groups = (1...5).map { group(Int32($0), "G\($0)") }
        let resolved = HomeViewModel.resolveLifeGroups(currentUserId: nil, groups: groups, tasks: [], today: "2026-01-01")
        XCTAssertEqual(resolved.cards.count, 3)
        XCTAssertEqual(resolved.hiddenCount, 2)
    }

    @MainActor
    func testResolveGroupsFailedWithTasksFallsBackToLegacyAndNoCTA() {
        let resolved = HomeViewModel.resolveLifeGroups(
            currentUserId: 1, groups: nil,
            tasks: [groupTask("a", group: 1, "2026-03-01"), groupTask("old", group: 1, "2025-01-01")],
            today: "2026-02-01"
        )
        XCTAssertTrue(resolved.cards.isEmpty)
        XCTAssertEqual(resolved.legacyTasks.map(\.id), ["a"])
        XCTAssertFalse(resolved.showDiscoveryCTA, "a failed groups fetch must never read as 'no group'")
    }

    @MainActor
    func testResolveBothFailedShowsNothing() {
        let resolved = HomeViewModel.resolveLifeGroups(currentUserId: 1, groups: nil, tasks: nil, today: "2026-02-01")
        XCTAssertTrue(resolved.cards.isEmpty)
        XCTAssertTrue(resolved.legacyTasks.isEmpty)
        XCTAssertFalse(resolved.showDiscoveryCTA)
    }

    @MainActor
    func testResolveTasksFailedKeepsCardsWithoutTasks() {
        let resolved = HomeViewModel.resolveLifeGroups(
            currentUserId: 1, groups: [group(1, "Alfa")], tasks: nil, today: "2026-02-01"
        )
        XCTAssertEqual(resolved.cards.count, 1)
        XCTAssertTrue(resolved.cards[0].tasks.isEmpty)
        XCTAssertTrue(resolved.legacyTasks.isEmpty)
    }

    @MainActor
    func testResolveEmptyGroupsShowsDiscoveryCTAOnly() {
        let resolved = HomeViewModel.resolveLifeGroups(
            currentUserId: 1, groups: [], tasks: [groupTask("a", group: 1, "2026-03-01")], today: "2026-02-01"
        )
        XCTAssertTrue(resolved.showDiscoveryCTA)
        XCTAssertTrue(resolved.cards.isEmpty)
        XCTAssertTrue(resolved.legacyTasks.isEmpty)
    }

    func testMeetingLabel() {
        XCTAssertEqual(lifeGroupMeetingLabel(day: "Quinta-feira", time: "20:00"), "Quinta-feira às 20:00")
        XCTAssertEqual(lifeGroupMeetingLabel(day: "Sem dia fixo", time: nil), "Sem dia fixo")
        XCTAssertEqual(lifeGroupMeetingLabel(day: nil, time: "20:00"), "20:00")
        XCTAssertEqual(lifeGroupMeetingLabel(day: "", time: "20:00"), "20:00")
        XCTAssertNil(lifeGroupMeetingLabel(day: nil, time: nil))
        XCTAssertNil(lifeGroupMeetingLabel(day: "", time: ""))
    }
}
