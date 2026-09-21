import Shared
import SwiftUI

/// One-question-per-screen flow, mirroring `FormStepView`'s pattern (see commit dd0098f): a
/// nav-bar back button that steps backward through questions and only pops the screen at the
/// first question, and a dedicated result screen at the end instead of an instant pop.
struct QuestionnaireView: View {
    let courseId: String
    @State private var viewModel: QuestionnaireViewModel
    @Environment(\.dismiss) var dismiss

    init(courseId: String, courseRepository: CourseRepository) {
        self.courseId = courseId
        _viewModel = State(initialValue: QuestionnaireViewModel(courseId: courseId, courseRepository: courseRepository))
    }

    var body: some View {
        VStack(spacing: 0) {
            if let result = viewModel.result {
                resultState(result: result)
            } else if viewModel.isLoading {
                loadingState
            } else if let error = viewModel.error {
                ErrorStateView(message: error, onRetry: { Task { await viewModel.load() } })
            } else if let questionnaire = viewModel.questionnaire, !questionnaire.questions.isEmpty {
                stepContent(questionnaire: questionnaire)
            } else {
                ErrorStateView(message: "Este questionário não possui perguntas", onRetry: { dismiss() })
            }
        }
        .background(PazMeshBackground().ignoresSafeArea())
        .navigationTitle(viewModel.result == nil ? (viewModel.questionnaire?.title ?? "Questionário") : "")
        .navigationBarTitleDisplayMode(.large)
        .toolbarBackground(.hidden, for: .navigationBar)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            if viewModel.result == nil {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: goBack) {
                        Image(systemName: "chevron.left")
                    }
                }
            }
        }
        .task { await viewModel.load() }
    }

    private func goBack() {
        if viewModel.stepIndex > 0 {
            viewModel.previousStep()
        } else {
            dismiss()
        }
    }

    @ViewBuilder
    private func stepContent(questionnaire: Questionnaire) -> some View {
        let stepIndex = min(viewModel.stepIndex, questionnaire.questions.count - 1)
        let question = questionnaire.questions[stepIndex]

        ScrollView {
            VStack(alignment: .leading, spacing: PazSpacing.lg) {
                ProgressView(value: viewModel.progress).tint(PazColors.accent)
                Text("\(stepIndex + 1) de \(questionnaire.questions.count)")
                    .font(PazTypography.labelMedium)
                    .foregroundStyle(PazColors.slate)

                Text(question.text)
                    .font(PazTypography.headlineSmall)
                    .id(stepIndex)
                    .transition(.opacity.combined(with: .move(edge: .trailing)))
                    .animation(.easeInOut(duration: 0.2), value: stepIndex)

                QuestionOptionsView(
                    question: question,
                    selectedOptionIds: viewModel.selectedOptionIds[question.id] ?? [],
                    freeTextValue: viewModel.freeTextAnswers[question.id] ?? "",
                    onSelectSingle: { viewModel.selectSingle(questionId: question.id, optionId: $0) },
                    onToggleMulti: { viewModel.toggleMulti(questionId: question.id, optionId: $0) },
                    onFreeTextChanged: { viewModel.setFreeText(questionId: question.id, text: $0) }
                )

                if let submitError = viewModel.submitError {
                    Text(submitError)
                        .font(PazTypography.bodySmall)
                        .foregroundColor(PazColors.error)
                }
            }
            .padding(.horizontal, PazSpacing.lg)
            .padding(.top, PazSpacing.sm)
            .padding(.bottom, PazSpacing.xl)
        }
        .safeAreaInset(edge: .bottom) {
            bottomBar(isLast: stepIndex == questionnaire.questions.count - 1)
        }
    }

    private func bottomBar(isLast: Bool) -> some View {
        Button(action: { isLast ? viewModel.onSubmit() : viewModel.nextStep() }) {
            Text(isLast ? (viewModel.isSubmitting ? "Enviando..." : "Enviar") : "Continuar")
                .frame(maxWidth: .infinity)
        }
        .buttonStyle(.pazPillPrimary)
        .disabled(viewModel.isSubmitting)
        .padding(.horizontal, PazSpacing.lg)
        .padding(.vertical, PazSpacing.md)
        .background(.ultraThinMaterial)
    }

    private func resultState(result: QuestionnaireResult) -> some View {
        VStack(spacing: PazSpacing.lg) {
            Spacer()
            Image(systemName: result.passed ? "checkmark.circle.fill" : "xmark.circle.fill")
                .font(.system(size: 72))
                .foregroundStyle(result.passed ? PazColors.success : PazColors.error)
            Text(result.passed ? "Você foi aprovado!" : "Não foi dessa vez")
                .font(PazTypography.headlineSmall)
            Text("Sua nota: \(result.scorePercentage)% (mínimo \(result.passingScorePercentage)%)")
                .font(PazTypography.bodyMedium)
                .foregroundStyle(PazColors.slate)
            if let certificate = result.certificate {
                Text("Certificado emitido: \(certificate.certificateCode)")
                    .font(PazTypography.bodySmall)
                    .foregroundStyle(PazColors.accent)
            }
            Spacer()
            Button(action: { dismiss() }) {
                Text("Concluir").frame(maxWidth: .infinity)
            }
            .buttonStyle(.pazPillPrimary)
        }
        .padding(PazSpacing.lg)
    }

    private var loadingState: some View {
        VStack(spacing: PazSpacing.lg) {
            SkeletonView().frame(height: 8)
            SkeletonView().frame(width: 200, height: 24)
            SkeletonView().frame(height: 56)
            Spacer()
        }
        .padding(PazSpacing.lg)
    }
}

private struct QuestionOptionsView: View {
    let question: Question
    let selectedOptionIds: Set<String>
    let freeTextValue: String
    let onSelectSingle: (String) -> Void
    let onToggleMulti: (String) -> Void
    let onFreeTextChanged: (String) -> Void

    var body: some View {
        if question.isFreeText {
            TextField(
                "Sua resposta",
                text: Binding(get: { freeTextValue }, set: onFreeTextChanged),
                axis: .vertical
            )
            .textFieldStyle(.roundedBorder)
        } else {
            VStack(spacing: PazSpacing.sm) {
                ForEach(question.options, id: \.id) { option in
                    let selected = selectedOptionIds.contains(option.id)
                    Button(action: {
                        question.isSingleChoice ? onSelectSingle(option.id) : onToggleMulti(option.id)
                    }) {
                        HStack {
                            Image(systemName: selected
                                ? (question.isSingleChoice ? "largecircle.fill.circle" : "checkmark.square.fill")
                                : (question.isSingleChoice ? "circle" : "square"))
                                .foregroundStyle(selected ? PazColors.accent : PazColors.slate)
                            Text(option.text)
                                .foregroundStyle(PazColors.ink)
                            Spacer()
                        }
                        .padding(PazSpacing.md)
                        .background(selected ? PazColors.accent.opacity(0.08) : PazColors.surface)
                        .clipShape(RoundedRectangle(cornerRadius: PazSpacing.cardRadiusCompact))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}
