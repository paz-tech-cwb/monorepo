import Observation
import Shared
import SwiftUI

@MainActor
@Observable
class QuestionnaireViewModel {
    var isLoading = true
    var questionnaire: Questionnaire?
    var error: String?
    var stepIndex = 0
    var selectedOptionIds: [String: Set<String>] = [:]
    var freeTextAnswers: [String: String] = [:]
    var isSubmitting = false
    var submitError: String?
    var result: QuestionnaireResult?

    private let courseId: String
    private let courseRepository: CourseRepository

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
            } catch {
                submitError = error.localizedDescription
            }
            isSubmitting = false
        }
    }
}
