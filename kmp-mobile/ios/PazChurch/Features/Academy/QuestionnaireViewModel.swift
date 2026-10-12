import Observation
import Shared
import SwiftUI

/// Lightweight, lossily-durable snapshot of in-progress questionnaire answers, persisted to
/// `UserDefaults` keyed by `courseId` so state survives iOS terminating the app under memory
/// pressure while backgrounded (process death doesn't restore `@Observable` in-memory state the
/// way Android's `SavedStateHandle` does). Intentionally minimal — just the fields already held
/// in-memory by `QuestionnaireViewModel`, no redesign of the questionnaire flow.
private struct QuestionnaireDraft: Codable {
    var stepIndex: Int
    var selectedOptionIds: [String: Set<String>]
    var freeTextAnswers: [String: String]
}

@MainActor
@Observable
class QuestionnaireViewModel {
    var isLoading = true
    var questionnaire: Questionnaire?
    var error: String?
    var stepIndex = 0 {
        didSet { persistDraft() }
    }
    var selectedOptionIds: [String: Set<String>] = [:] {
        didSet { persistDraft() }
    }
    var freeTextAnswers: [String: String] = [:] {
        didSet { persistDraft() }
    }
    var isSubmitting = false
    var submitError: String?
    var result: QuestionnaireResult?

    private let courseId: String
    private let courseRepository: CourseRepository
    private let draftKey: String

    var progress: Double {
        guard let count = questionnaire?.questions.count, count > 0 else { return 0 }
        return Double(stepIndex + 1) / Double(count)
    }

    var isLastStep: Bool {
        guard let count = questionnaire?.questions.count else { return true }
        return stepIndex == count - 1
    }

    init(courseId: String, courseRepository: CourseRepository) {
        self.courseId = courseId
        self.courseRepository = courseRepository
        self.draftKey = "questionnaire_draft_\(courseId)"
        restoreDraft()
    }

    func load() async {
        isLoading = true
        error = nil
        do {
            questionnaire = try await courseRepository.getQuestionnaire(courseId: courseId)
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func selectSingle(questionId: String, optionId: String) {
        selectedOptionIds[questionId] = [optionId]
    }

    func toggleMulti(questionId: String, optionId: String) {
        var current = selectedOptionIds[questionId] ?? []
        if current.contains(optionId) {
            current.remove(optionId)
        } else {
            current.insert(optionId)
        }
        selectedOptionIds[questionId] = current
    }

    func setFreeText(questionId: String, text: String) {
        freeTextAnswers[questionId] = text
    }

    func nextStep() {
        guard let count = questionnaire?.questions.count else { return }
        stepIndex = min(stepIndex + 1, count - 1)
    }

    func previousStep() {
        stepIndex = max(stepIndex - 1, 0)
    }

    func onSubmit() {
        guard let questionnaire else { return }
        isSubmitting = true
        submitError = nil
        Task {
            let answers = questionnaire.questions.map { question in
                QuestionnaireAnswerInput(
                    questionId: question.id,
                    optionIds: Array(selectedOptionIds[question.id] ?? []),
                    text: freeTextAnswers[question.id]
                )
            }
            do {
                result = try await courseRepository.submitQuestionnaire(courseId: courseId, answers: answers)
                clearDraft()
            } catch {
                submitError = error.localizedDescription
            }
            isSubmitting = false
        }
    }

    private func persistDraft() {
        let draft = QuestionnaireDraft(
            stepIndex: stepIndex,
            selectedOptionIds: selectedOptionIds,
            freeTextAnswers: freeTextAnswers
        )
        guard let data = try? JSONEncoder().encode(draft) else { return }
        UserDefaults.standard.set(data, forKey: draftKey)
    }

    private func restoreDraft() {
        guard let data = UserDefaults.standard.data(forKey: draftKey),
              let draft = try? JSONDecoder().decode(QuestionnaireDraft.self, from: data)
        else { return }
        stepIndex = draft.stepIndex
        selectedOptionIds = draft.selectedOptionIds
        freeTextAnswers = draft.freeTextAnswers
    }

    private func clearDraft() {
        UserDefaults.standard.removeObject(forKey: draftKey)
    }
}
