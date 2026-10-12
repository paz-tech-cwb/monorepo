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

    // MARK: - Push userInfo -> destination (FCM data keys land at the top level of userInfo)

    private func userInfo(_ deepLink: String) -> [AnyHashable: Any] {
        ["aps": ["alert": ["title": "t", "body": "b"]], "channel_id": "paz_life_group", "deep_link": deepLink]
    }

    func testAttendanceUserInfoResolvesToEditor() {
        XCTAssertEqual(
            DeepLinkDestination.from(userInfo: userInfo("paz://presenca/42/2026-10-05")),
            .lifeGroupAttendanceEditor(lifeGroupId: "42", meetingDate: "2026-10-05")
        )
    }

    func testEveryPilotCategoryResolvesFromUserInfo() {
        let cases: [(String, DeepLinkDestination)] = [
            ("paz://tarefa/abc-1", .lifeGroupTaskGuide(assignmentId: "abc-1")),
            ("paz://estudo-do-life/s-1", .lifeGroupStudyDetail(studyId: "s-1")),
            ("paz://form/relatorio-semanal", .formDetail(formId: "relatorio-semanal")),
            ("paz://agenda/9", .agendaDetail(eventId: "9")),
            ("paz://lifegroup/3", .lifeGroupDetail(lifeGroupId: "3")),
            ("paz://journey", .memberJourney),
            ("paz://account", .account),
            ("paz://formularios", .formularios),
        ]
        for (link, expected) in cases {
            XCTAssertEqual(DeepLinkDestination.from(userInfo: userInfo(link)), expected, link)
        }
    }

    func testCamelCaseKeyAndWhitespaceAndTrailingSlashAreTolerated() {
        XCTAssertEqual(
            DeepLinkDestination.from(userInfo: ["deepLink": " paz://presenca/42/2026-10-05/ "]),
            .lifeGroupAttendanceEditor(lifeGroupId: "42", meetingDate: "2026-10-05")
        )
    }

    func testUserInfoWithoutDeepLinkOrWithUnknownLinkResolvesToNil() {
        XCTAssertNil(DeepLinkDestination.from(userInfo: ["aps": ["alert": "x"], "channel_id": "paz_events"]))
        XCTAssertNil(DeepLinkDestination.from(userInfo: ["deep_link": "   "]))
        XCTAssertNil(DeepLinkDestination.from(userInfo: ["deep_link": "paz://unknown/1"]))
        XCTAssertNil(DeepLinkDestination.from(userInfo: ["deep_link": 42]))
    }

    func testMalformedAttendanceLinksAreRejected() {
        XCTAssertNil(DeepLinkDestination.from(userInfo: userInfo("paz://presenca/42")))
        XCTAssertNil(DeepLinkDestination.from(userInfo: userInfo("paz://presenca/")))
    }

    @MainActor
    func testTapRecordsPendingDeepLinkOnService() {
        let service = PushNotificationService.shared
        service.consumeDeepLink()
        service.handleNotificationTap(userInfo: userInfo("paz://presenca/42/2026-10-05"))
        XCTAssertEqual(service.pendingDeepLink, "presenca/42/2026-10-05")
        XCTAssertEqual(
            service.deepLinkDestination,
            .lifeGroupAttendanceEditor(lifeGroupId: "42", meetingDate: "2026-10-05")
        )
        service.consumeDeepLink()
        XCTAssertNil(service.pendingDeepLink)
    }
}
