import Shared
import SwiftUI

/// One-question-per-screen fill flow. Voltar/Continuar (or Enviar on the last step) are pinned
/// above the keyboard via `.safeAreaInset(edge: .bottom)`. Falls back to the scrollable
/// `FormDetailView` via a toolbar "Ver todas as perguntas" action.
///
/// Keyboard-flicker avoidance: a single, stable `TextField` instance (bound via a computed
/// `Binding` onto `viewModel.fields[currentDef.key]`) stays mounted across text-input steps —
/// we intentionally do NOT key it with `.id(stepIndex)` and do NOT use `TabView(.page)`, since
/// either would recreate the responder and cause the keyboard to dismiss/reopen. Only the
/// question label/description animates per step.
struct FormStepView: View {
    let form: FormCatalogItem
    @State private var viewModel: FormDetailViewModelIOS
    @FocusState private var inputFocused: Bool
    @Environment(\.dismiss) var dismiss
    @State private var showAllQuestions = false

    init(form: FormCatalogItem) {
        self.form = form
        _viewModel = State(initialValue: FormDetailViewModelIOS(
            formId: form.id,
            formsRepository: IosAppContainer.shared.formsRepository,
            authRepository: IosAppContainer.shared.authRepository
        ))
    }

    var body: some View {
        VStack(spacing: 0) {
            if viewModel.isLoading {
                loadingState
            } else if viewModel.form == nil {
                ErrorStateView(
                    message: viewModel.error ?? "Formulário não encontrado",
                    onRetry: { dismiss() }
                )
            } else if form.type.fieldDefs.isEmpty {
                ErrorStateView(
                    message: "Este formulário não possui perguntas",
                    onRetry: { dismiss() }
                )
            } else {
                stepContent
            }
        }
        .background(PazMeshBackground())
        .navigationTitle(form.title)
        .navigationBarTitleDisplayMode(.large)
        .toolbarBackground(.hidden, for: .navigationBar)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("Ver todas as perguntas") { showAllQuestions = true }
                    .font(PazTypography.labelMedium)
            }
        }
        .navigationDestination(isPresented: $showAllQuestions) {
            FormDetailView(form: form)
        }
        .onChange(of: viewModel.submitSuccess) { _, success in
            if success { dismiss() }
        }
        // Applies only to the scroll view inside stepContent (see below) — the keyboard must
        // stay open while the user taps Continuar/Voltar without the scroll gesture dismissing it.
        .scrollDismissesKeyboard(.never)
        // System back-swipe/back-button behavior: at step > 0 we pop the whole screen (default
        // NavigationStack pop gesture), matching this repo's NavigationStack convention rather
        // than intercepting back to step backwards — Voltar in the bottom bar covers that case.
    }

    private var stepContent: some View {
        let defs = form.type.fieldDefs
        let stepIndex = min(viewModel.stepIndex, defs.count - 1)
        let def = defs[stepIndex]

        return ScrollView {
            VStack(alignment: .leading, spacing: PazSpacing.lg) {
                ProgressView(value: viewModel.progress)
                    .tint(PazColors.accent)
                Text("\(stepIndex + 1) de \(defs.count)")
                    .font(PazTypography.labelMedium)
                    .foregroundStyle(PazColors.slate)

                Text(def.label)
                    .font(PazTypography.headlineSmall)
                    .id(stepIndex) // only the label transitions — not the input field
                    .transition(.opacity.combined(with: .move(edge: .trailing)))
                    .animation(.easeInOut(duration: 0.2), value: stepIndex)

                FieldRow(
                    def: def,
                    value: viewModel.fields[def.key] ?? "",
                    extraFields: viewModel.fields,
                    isSubmitting: viewModel.isSubmitting,
                    selfOrSearchModes: viewModel.selfOrSearchModes,
                    onChange: { viewModel.update(key: def.key, value: $0) },
                    onOpenPicker: viewModel.openPicker,
                    onSelfOrSearchMode: viewModel.setSelfOrSearchMode,
                    isFocused: def.fieldType.isTextInput ? $inputFocused : nil,
                    submitLabel: viewModel.isLastStep ? .done : .next,
                    onSubmitField: { viewModel.nextStep() }
                )

                if let stepError = viewModel.stepError ?? viewModel.error {
                    Text(stepError)
                        .font(PazTypography.bodySmall)
                        .foregroundColor(PazColors.error)
                        .padding(PazSpacing.md)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(PazColors.error.opacity(0.1))
                        .cornerRadius(12)
                }
            }
            .padding(.horizontal, PazSpacing.lg)
            .padding(.top, PazSpacing.sm)
            .padding(.bottom, PazSpacing.xl)
        }
        .sheet(isPresented: Binding(
            get: { viewModel.pickerKey != nil && !viewModel.pickerIsLifeGroup },
            set: { if !$0 { viewModel.closePicker() } }
        )) {
            UserPickerSheet(viewModel: viewModel)
        }
        .sheet(isPresented: Binding(
            get: { viewModel.pickerKey != nil && viewModel.pickerIsLifeGroup },
            set: { if !$0 { viewModel.closePicker() } }
        )) {
            LifeGroupPickerSheet(viewModel: viewModel)
        }
        .task(id: viewModel.stepIndex) {
            // Re-request focus for the stable text field when landing on a text-input step;
            // clear it for non-text steps (date pickers, selects, switches, pickers, etc).
            if def.fieldType.isTextInput {
                inputFocused = true
            } else {
                inputFocused = false
            }
        }
        .safeAreaInset(edge: .bottom) {
            bottomBar(defs: defs, stepIndex: stepIndex)
        }
    }

    @ViewBuilder
    private func bottomBar(defs: [FormFieldDef], stepIndex: Int) -> some View {
        let isLast = stepIndex == defs.count - 1
        HStack(spacing: PazSpacing.md) {
            if stepIndex > 0 {
                Button("Voltar") { viewModel.previousStep() }
                    .buttonStyle(.pazPillSecondary)
                    .disabled(viewModel.isSubmitting)
            }
            Button(action: {
                if isLast { viewModel.onSubmit() } else { viewModel.nextStep() }
            }) {
                Text(isLast ? (viewModel.isSubmitting ? "Enviando..." : "Enviar") : "Continuar")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.pazPillPrimary)
            .disabled(viewModel.isSubmitting)
        }
        .padding(.horizontal, PazSpacing.lg)
        .padding(.vertical, PazSpacing.md)
        .background(.ultraThinMaterial)
    }

    private var loadingState: some View {
        VStack(spacing: PazSpacing.lg) {
            SkeletonView().frame(height: 8)
            Spacer().frame(height: PazSpacing.sm)
            SkeletonView().frame(width: 200, height: 24)
            SkeletonView().frame(height: 56)
            Spacer()
        }
        .padding(PazSpacing.lg)
    }
}

#Preview {
    NavigationStack {
        FormStepView(form: FormCatalogItem(
            id: "member-registrations",
            title: "Registro de Membro",
            description: "Formulário para registrar um novo membro",
            canWrite: true,
            canRead: true
        ))
    }
}
