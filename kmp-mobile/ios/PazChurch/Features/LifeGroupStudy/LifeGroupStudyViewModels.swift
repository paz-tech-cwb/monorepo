import Observation
import Shared
import SwiftUI

/// Reads the actual HTTP status code off a repository failure (bridged from Ktor's
/// `ClientRequestException` via `httpStatusCodeOrNull()` in the shared module), instead of
/// string-matching on `localizedDescription`, which is fragile.
private extension Error {
    var httpStatusCode: Int? {
        guard let kotlinException = (self as NSError).kotlinException as? KotlinThrowable else { return nil }
        return kotlinException.httpStatusCodeOrNull()?.intValue
    }
}

/// Maps a repository failure to a user-facing message, checking the actual HTTP status
/// code (rather than string-matching on `localizedDescription`) for the permission case.
private func friendlyErrorMessage(_ error: Error, forbiddenMessage: String) -> String {
    error.httpStatusCode == 403 ? forbiddenMessage : error.localizedDescription
}

@MainActor
@Observable
class LifeGroupStudyListViewModel {
    var studies: [LifeGroupStudy] = []
    var isLoading = true
    var isLoadingMore = false
    var error: String?
    var canPublish = false

    private var page = 1
    private var hasMore = true
    private let pageSize: Int32 = 20

    private let repository: LifeGroupStudyRepository

    init(repository: LifeGroupStudyRepository) {
        self.repository = repository
    }

    func load(currentUser: User?) async {
        isLoading = true
        error = nil
        canPublish = currentUser.map(\.role.isLeader) ?? false
        do {
            let result = try await repository.getStudies(page: 1, limit: pageSize)
            studies = result.items
            page = Int(result.page)
            hasMore = result.hasMore
        } catch {
            self.error = friendlyErrorMessage(
                error,
                forbiddenMessage: "Você não tem permissão para acessar este conteúdo."
            )
        }
        isLoading = false
    }

    func loadMore() async {
        guard hasMore, !isLoadingMore, !isLoading else { return }
        isLoadingMore = true
        do {
            let result = try await repository.getStudies(page: Int32(page + 1), limit: pageSize)
            studies += result.items
            page = Int(result.page)
            hasMore = result.hasMore
        } catch {
            // Non-blocking — keep whatever loaded successfully so far.
        }
        isLoadingMore = false
    }
}

@MainActor
@Observable
class LifeGroupStudyDetailViewModel {
    var study: LifeGroupStudy?
    var isLoading = true
    var error: String?
    var canEdit = false
    var isDeleting = false

    private let studyId: String
    private let repository: LifeGroupStudyRepository

    init(studyId: String, repository: LifeGroupStudyRepository) {
        self.studyId = studyId
        self.repository = repository
    }

    func load(currentUser: User?) async {
        isLoading = true
        error = nil
        do {
            let result = try await repository.getStudy(id: studyId)
            study = result
            canEdit = currentUser != nil &&
                (currentUser?.id == result.publishedById || currentUser?.role == UserRole.admin)
        } catch {
            self.error = friendlyErrorMessage(
                error,
                forbiddenMessage: "Você não tem permissão para acessar este conteúdo."
            )
        }
        isLoading = false
    }

    func delete() async -> Bool {
        isDeleting = true
        do {
            try await repository.deleteStudy(id: studyId)
            isDeleting = false
            return true
        } catch {
            self.error = friendlyErrorMessage(
                error,
                forbiddenMessage: "Você não tem permissão para excluir este estudo."
            )
            isDeleting = false
            return false
        }
    }
}

@MainActor
@Observable
class LifeGroupStudyEditorViewModel {
    var title = ""
    var author = ""
    var bodyMarkdown = ""
    var imageUrl = ""
    var isLoading = false
    var isSaving = false
    var error: String?

    let isEditMode: Bool
    private let studyId: String?
    private let repository: LifeGroupStudyRepository

    var isValid: Bool {
        !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
            !author.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
            !bodyMarkdown.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    init(studyId: String?, repository: LifeGroupStudyRepository) {
        self.studyId = studyId
        self.isEditMode = studyId != nil
        self.repository = repository
    }

    func loadIfNeeded() async {
        guard let studyId else { return }
        isLoading = true
        do {
            let existing = try await repository.getStudy(id: studyId)
            title = existing.title
            author = existing.author
            bodyMarkdown = existing.bodyMarkdown
            imageUrl = existing.imageUrl ?? ""
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    /// Wraps the current text-editor selection with a symmetric marker, mirroring the
    /// bold/italic formatting toolbar buttons. When `selection` reports a collapsed cursor
    /// (`.selection` with an empty range) rather than a real text selection, the markers are
    /// inserted at that cursor position. If there is no selection info at all (e.g. the editor
    /// has never been focused), or the reported indices no longer line up with the current
    /// `bodyMarkdown` value, the markers are appended at the end of the document instead.
    func applyMarkdownWrap(_ marker: String, selection: TextSelection?) {
        let range = resolvedWrapRange(from: selection)
        let selectedText = String(bodyMarkdown[range])
        bodyMarkdown.replaceSubrange(range, with: marker + selectedText + marker)
    }

    /// Resolves the wrap target range against the *current* `bodyMarkdown` value.
    ///
    /// `selection`'s `String.Index` values can be stale relative to `bodyMarkdown` — e.g. after
    /// two consecutive toolbar taps, SwiftUI may not have re-synced `selection` to reflect the
    /// text mutated by the first tap before the second tap fires. Subscripting/replacing with a
    /// stale index risks a trap, so we validate the captured indices against the current
    /// string's bounds and ordering, and fall back to appending at the end of the document
    /// rather than crashing if they no longer hold up.
    private func resolvedWrapRange(from selection: TextSelection?) -> Range<String.Index> {
        let fallback = bodyMarkdown.endIndex..<bodyMarkdown.endIndex
        let candidate: Range<String.Index>? = switch selection?.indices {
        case let .selection(r):
            r

        case let .multiSelection(rangeSet):
            rangeSet.ranges.first

        case .none:
            nil
        }
        guard let candidate else { return fallback }
        guard
            candidate.lowerBound >= bodyMarkdown.startIndex,
            candidate.upperBound <= bodyMarkdown.endIndex,
            candidate.lowerBound <= candidate.upperBound
        else {
            return fallback
        }
        return candidate
    }

    func applyMarkdownLinePrefix(_ linePrefix: String) {
        if !bodyMarkdown.isEmpty, !bodyMarkdown.hasSuffix("\n") {
            bodyMarkdown += "\n"
        }
        bodyMarkdown += linePrefix
    }

    func save() async -> String? {
        guard isValid, !isSaving else { return nil }
        isSaving = true
        error = nil
        let trimmedImage = imageUrl.trimmingCharacters(in: .whitespacesAndNewlines)
        let resolvedImage: String? = trimmedImage.isEmpty ? nil : trimmedImage
        do {
            let saved: LifeGroupStudy = if let studyId {
                try await repository.updateStudy(
                    id: studyId, title: title, author: author, bodyMarkdown: bodyMarkdown, imageUrl: resolvedImage
                )
            } else {
                try await repository.createStudy(
                    title: title, author: author, bodyMarkdown: bodyMarkdown, imageUrl: resolvedImage
                )
            }
            isSaving = false
            return saved.id
        } catch {
            self.error = friendlyErrorMessage(
                error,
                forbiddenMessage: "Você não tem permissão para publicar estudos do Life."
            )
            isSaving = false
            return nil
        }
    }
}
