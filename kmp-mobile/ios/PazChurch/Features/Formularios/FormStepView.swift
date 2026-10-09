import Shared
import SwiftUI

/// One-question-per-screen fill flow — the only way to fill a form in this app.
///
/// Keyboard-flicker avoidance: a single, stable `TextField` instance (bound via a computed
/// `Binding` onto `viewModel.fields[currentDef.key]`) stays mounted across text-input steps —
/// we intentionally do NOT key it with `.id(stepIndex)` and do NOT use `TabView(.page)`, since
/// either would recreate the responder and cause the keyboard to dismiss/reopen. Only the
/// question label/description animates per step.
///
/// Back navigation: the nav bar's back button is replaced with one that steps backward through
/// questions (matching the bottom bar's removed "Voltar" — the header back button now serves
/// that role) and only pops the screen once at the first question.
struct FormStepView: View {
    let form: FormCatalogItem
    @State private var viewModel: FormDetailViewModelIOS
    @FocusState private var inputFocused: Bool
    @Environment(\.dismiss) var dismiss
    @State private var showDiscardDialog = false

    /// Strips a leading "Relatório de/do/da " so long catalog names (e.g. "Relatório de Casa
    /// de Paz") don't overflow the nav bar title — the step counter already gives context.
    private var displayTitle: String {
        for prefix in ["Relatório de ", "Relatório do ", "Relatório da "] {
            if form.title.hasPrefix(prefix) {
                return String(form.title.dropFirst(prefix.count))
            }
        }
        return form.title
    }

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
            } else if viewModel.submitSuccess {
                SuccessStateView(onDone: { dismiss() })
            } else {
                stepContent
            }
        }
        .background(PazMeshBackground().ignoresSafeArea())
        .background(InteractivePopGestureDisabler(
            isDisabled: viewModel.isDirty,
            onBlockedSwipeAttempt: { showDiscardDialog = true }
        ))
        .navigationTitle(viewModel.submitSuccess ? "" : displayTitle)
        // `.inline` instead of `.large` — a large title resizes as scroll content height
        // changes per step, which read as visual jank mid-flow (item 15).
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.hidden, for: .navigationBar)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            if !viewModel.submitSuccess {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: goBack) {
                        Image(systemName: "chevron.left")
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: requestClose) {
                        Image(systemName: "xmark")
                    }
                }
                if form.type == .casaDePazReport {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        NavigationLink(destination: CasaDePazSubmissionsListView(formsRepository: IosAppContainer.shared
                                .formsRepository)) {
                            Image(systemName: "clock.arrow.circlepath")
                        }
                    }
                    if viewModel.canAccessCasaDePazLessons {
                        ToolbarItem(placement: .navigationBarTrailing) {
                            NavigationLink(destination: CasaDePazLessonsView()) {
                                Image(systemName: "book.closed")
                            }
                        }
                    }
                }
            }
        }
        // Applies only to the scroll view inside stepContent (see below) — the keyboard must
        // stay open while the user taps Continuar without the scroll gesture dismissing it.
        .scrollDismissesKeyboard(.never)
        .confirmationDialog(
            "Descartar alterações?",
            isPresented: $showDiscardDialog,
            titleVisibility: .visible
        ) {
            Button("Descartar", role: .destructive) { dismiss() }
            Button("Continuar editando", role: .cancel) {}
        }
    }

    private func goBack() {
        if viewModel.stepIndex > 0 {
            viewModel.previousStep()
        } else {
            requestClose()
        }
    }

    /// Shared by the close (xmark) button and the back chevron once it floors at the first
    /// question — shows a discard-confirmation dialog only when the user has actually entered
    /// data, dismissing immediately otherwise.
    private func requestClose() {
        if viewModel.isDirty {
            showDiscardDialog = true
        } else {
            dismiss()
        }
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
                    // `.contentTransition(.opacity)` cross-fades the label text in place as
                    // `def.label` changes, without `.id(stepIndex)` + `.transition` (which
                    // needs an enclosing animation scope to fire consistently and was
                    // combined inconsistently with the per-step identity change below).
                    .contentTransition(.opacity)
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
                    showLabel: false, // the big question headline above already names this field
                    isFocused: def.fieldType.isTextInput ? $inputFocused : nil,
                    submitLabel: viewModel.isLastStep ? .done : .next,
                    onSubmitField: { viewModel.nextStep() },
                    guestEntries: viewModel.guestEntries,
                    onAddGuest: { viewModel.addGuestEntry() },
                    onUpdateGuest: { viewModel.updateGuestEntry($0, $1) },
                    onRemoveGuest: { viewModel.removeGuestEntry($0) }
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
            get: { viewModel.pickerKey != nil && (viewModel.pickerKind == .user || viewModel.pickerKind == .userMulti)
            },
            set: { if !$0 { viewModel.closePicker() } }
        )) {
            UserPickerSheet(viewModel: viewModel)
        }
        .sheet(isPresented: Binding(
            get: { viewModel.pickerKey != nil && viewModel.pickerKind == .lifeGroup },
            set: { if !$0 { viewModel.closePicker() } }
        )) {
            LifeGroupPickerSheet(viewModel: viewModel)
        }
        .sheet(isPresented: Binding(
            get: { viewModel.pickerKey != nil && viewModel.pickerKind == .sector },
            set: { if !$0 { viewModel.closePicker() } }
        )) {
            SectorPickerSheet(viewModel: viewModel)
        }
        .sheet(isPresented: Binding(
            get: { viewModel.pickerKey != nil && viewModel.pickerKind == .casaDePazCycle },
            set: { if !$0 { viewModel.closePicker() } }
        )) {
            CasaDePazCyclePickerSheet(viewModel: viewModel)
        }
        .task(id: viewModel.stepIndex) {
            // Re-request focus for the stable text field when landing on a text-input step.
            // Only clear it for non-text steps when the field was ACTUALLY focused — writing
            // `inputFocused = false` unconditionally on every non-text step (even when it's
            // already false) was pure focus-binding churn that contributed to keyboard
            // flicker/jank without changing any real state. The full fix for keeping the
            // keyboard open across inline date/select steps needs the `inputView` bridge
            // (deferred — see FormStepView doc comment / PR notes); this only removes the
            // unnecessary redundant writes.
            if def.fieldType.isTextInput {
                inputFocused = true
            } else if inputFocused {
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
        PazKeyboardAccessoryBar {
            Button(action: {
                if isLast { viewModel.onSubmit() } else { viewModel.nextStep() }
            }) {
                Text(isLast ? (viewModel.isSubmitting ? "Enviando..." : "Enviar") : "Continuar")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.pazPillPrimary)
            .disabled(viewModel.isSubmitting)
        }
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
