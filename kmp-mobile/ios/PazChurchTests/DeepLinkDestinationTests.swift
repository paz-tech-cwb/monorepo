import XCTest
@testable import PazChurch

final class DeepLinkDestinationTests: XCTestCase {
    func testTaskRouteWithIdResolvesToTaskGuide() {
        XCTAssertEqual(DeepLinkDestination.from(parsedRoute: "tarefa/abc-123"), .lifeGroupTaskGuide(assignmentId: "abc-123"))
    }

    func testTaskRouteWithBlankIdIsRejected() {
        XCTAssertNil(DeepLinkDestination.from(parsedRoute: "tarefa/"))
    }

    func testTaskRouteWithExtraSegmentsIsRejected() {
        XCTAssertNil(DeepLinkDestination.from(parsedRoute: "tarefa/abc/extra"))
        XCTAssertNil(DeepLinkDestination.from(parsedRoute: "tarefa/abc/"))
    }

    func testTaskGuideUsesHomeStack() {
        XCTAssertTrue(DeepLinkDestination.lifeGroupTaskGuide(assignmentId: "x").usesHomeStack)
    }

    func testExistingRoutesStillResolve() {
        XCTAssertEqual(DeepLinkDestination.from(parsedRoute: "agenda/9"), .agendaDetail(eventId: "9"))
        XCTAssertEqual(
            DeepLinkDestination.from(parsedRoute: "presenca/12/2026-01-04"),
            .lifeGroupAttendanceEditor(lifeGroupId: "12", meetingDate: "2026-01-04")
        )
        XCTAssertNil(DeepLinkDestination.from(parsedRoute: "unknown"))
    }
}
