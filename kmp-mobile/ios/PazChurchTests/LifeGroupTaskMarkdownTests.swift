import XCTest
@testable import PazChurch

final class LifeGroupTaskMarkdownTests: XCTestCase {
    func testParsesHeadingsListsAndParagraphs() {
        let md = "# Title\n\nHello\nworld\n\n- one\n  - nested\n1. first\n2) second"
        XCTAssertEqual(LifeGroupTaskMarkdown.parseBlocks(md), [
            .heading(level: 1, text: "Title"),
            .paragraph(text: "Hello world"),
            .bullet(indent: 0, text: "one"),
            .bullet(indent: 1, text: "nested"),
            .numbered(indent: 0, number: "1", text: "first"),
            .numbered(indent: 0, number: "2", text: "second"),
        ])
    }

    func testParsesFencedCodeVerbatimAndUnclosedFence() {
        XCTAssertEqual(
            LifeGroupTaskMarkdown.parseBlocks("```\nlet a = 1\n  - not a bullet\n```"),
            [.code(text: "let a = 1\n  - not a bullet")]
        )
        XCTAssertEqual(LifeGroupTaskMarkdown.parseBlocks("```\nopen"), [.code(text: "open")])
    }

    func testParsesQuotes() {
        XCTAssertEqual(LifeGroupTaskMarkdown.parseBlocks("> quoted\n>\n> again"), [.quote(text: "quoted"), .quote(text: "again")])
    }

    func testHashWithoutSpaceIsNotAHeading() {
        XCTAssertEqual(LifeGroupTaskMarkdown.parseBlocks("#nope"), [.paragraph(text: "#nope")])
    }

    func testOnlyHttpAndHttpsLinksAreSafe() {
        XCTAssertTrue(LifeGroupTaskMarkdown.isSafeLinkURL(URL(string: "https://paz.church/x")!))
        XCTAssertTrue(LifeGroupTaskMarkdown.isSafeLinkURL(URL(string: "HTTP://paz.church")!))
        XCTAssertFalse(LifeGroupTaskMarkdown.isSafeLinkURL(URL(string: "javascript:alert(1)")!))
        XCTAssertFalse(LifeGroupTaskMarkdown.isSafeLinkURL(URL(string: "tel:+5541999999999")!))
        XCTAssertFalse(LifeGroupTaskMarkdown.isSafeLinkURL(URL(string: "file:///etc/passwd")!))
        XCTAssertFalse(LifeGroupTaskMarkdown.isSafeLinkURL(URL(string: "paz://tarefa/1")!))
        XCTAssertFalse(LifeGroupTaskMarkdown.isSafeLinkURL(URL(string: "https://")!))
    }

    func testAttributedStripsUnsafeLinksAndKeepsSafeOnes() {
        let result = LifeGroupTaskMarkdown.attributed("[ok](https://paz.church) [bad](javascript:alert(1))")
        let links = result.runs.compactMap(\.link)
        XCTAssertEqual(links, [URL(string: "https://paz.church")!])
        XCTAssertTrue(String(result.characters).contains("bad"))
    }
}
