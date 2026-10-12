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

    // MARK: - Input validation (allowlist)

    func testUnsafeIdsAreRejected() {
        let bad = [
            "paz://agenda/a?x=1", "paz://agenda/a#f", "paz://agenda/a%2Fb", "paz://agenda/a b",
            "paz://form/..", "paz://ministry/a.b", "paz://lifegroup/a/b", "paz://estudo-do-life/a/b",
            "paz://tarefa/a?x", "paz://tarefa/a/b",
        ]
        for link in bad {
            XCTAssertNil(DeepLinkDestination.parsedRoute(fromDeepLink: link), link)
        }
        XCTAssertNil(DeepLinkDestination.from(parsedRoute: "agenda/a?x=1"))
        XCTAssertNil(DeepLinkDestination.from(parsedRoute: "form/a b"))
    }

    func testNumericUuidAndSlugIdsAreAccepted() {
        XCTAssertEqual(DeepLinkDestination.parsedRoute(fromDeepLink: "paz://agenda/42"), "agenda/42")
        XCTAssertEqual(
            DeepLinkDestination.parsedRoute(fromDeepLink: "paz://tarefa/3f2b8c1e-9a4d-4e6f-8b1a-0c9d7e5f4a3b"),
            "tarefa/3f2b8c1e-9a4d-4e6f-8b1a-0c9d7e5f4a3b"
        )
        XCTAssertEqual(
            DeepLinkDestination.parsedRoute(fromDeepLink: "paz://form/relatorio_semanal-2"),
            "form/relatorio_semanal-2"
        )
    }

    func testPresencaValidatesIdAndDate() {
        XCTAssertEqual(
            DeepLinkDestination.parsedRoute(fromDeepLink: "paz://presenca/42/2026-10-05"),
            "presenca/42/2026-10-05"
        )
        for link in [
            "paz://presenca/42/2026-10-5", "paz://presenca/42/2026-10-05/extra",
            "paz://presenca/42/2026-10-05?x=1", "paz://presenca/4?2/2026-10-05", "paz://presenca/42",
        ] {
            XCTAssertNil(DeepLinkDestination.parsedRoute(fromDeepLink: link), link)
        }
        XCTAssertNil(DeepLinkDestination.from(parsedRoute: "presenca/42/not-a-date"))
    }

    func testAccountStackClassification() {
        XCTAssertTrue(DeepLinkDestination.formularios.usesAccountStack)
        XCTAssertTrue(DeepLinkDestination.lifeGroupStudyDetail(studyId: "s").usesAccountStack)
        XCTAssertFalse(DeepLinkDestination.account.usesAccountStack)
        XCTAssertFalse(DeepLinkDestination.agendaDetail(eventId: "1").usesAccountStack)
    }
}
