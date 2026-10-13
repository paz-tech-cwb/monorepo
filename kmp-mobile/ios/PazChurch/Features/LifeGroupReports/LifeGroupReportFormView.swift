import Shared
import SwiftUI

/// Weekly life-group report submit form. Opened from the Formulários list (group picker limited to
/// the groups the viewer leads/co-leads, or every group for admin/pastor) or from a group's detail
/// (`preselectedLifeGroupId`).
struct LifeGroupReportFormView: View {
    @State private var viewModel: LifeGroupReportFormViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var showDatePicker = false
    @State private var pickedDate = Date()

    init(preselectedLifeGroupId: Int32? = nil) {
        _viewModel = State(initialValue: LifeGroupReportFormViewModel(
            dataSource: KotlinLifeGroupReportFormDataSource(
                churchRepository: IosAppContainer.shared.churchRepository,
                formsRepository: IosAppContainer.shared.formsRepository,
                authRepository: IosAppContainer.shared.authRepository
            ),
            preselectedLifeGroupId: preselectedLifeGroupId
        ))
    }

    var body: some View {
        content
            .background(PazMeshBackground().ignoresSafeArea())
            .navigationTitle("Relatório semanal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.hidden, for: .navigationBar)
            .task { await viewModel.load() }
    }

    @ViewBuilder
    private var content: some View {
        if viewModel.isLoading {
            VStack(spacing: PazSpacing.lg) {
                ForEach(0..<4, id: \.self) { _ in SkeletonView().frame(height: 56) }
                Spacer()
            }
            .padding(PazSpacing.lg)
        } else if let error = viewModel.loadError {
            ErrorStateView(message: error, onRetry: { Task { await viewModel.load() } })
        } else if viewModel.isSubmitted {
            SuccessStateView(
                title: "Relatório enviado!",
                message: "O relatório semanal foi registrado.",
                onDone: { dismiss() }
            )
        } else if let message = viewModel.noGroupsMessage {
            ScrollView {
                Text(message)
                    .font(PazTypography.bodyMedium)
                    .foregroundStyle(PazColors.slate)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
                    .padding(PazSpacing.xl)
                    .padding(.top, 60)
            }
        } else {
            form
        }
    }

    private var form: some View {
        let validation = viewModel.currentValidation
        return ScrollView {
            VStack(alignment: .leading, spacing: PazSpacing.lg) {
                sectionTitle("Reunião")
                groupField(error: validation?.errorFor(field: .lifeGroup))
                dateField(error: validation?.errorFor(field: .date))

                sectionTitle("Presença")
                countField("Comprometidos", $viewModel.committedMembers, validation?.errorFor(field: .committedMembers))
                countField(
                    "Comprometidos presentes",
                    $viewModel.committedMembersPresent,
                    validation?.errorFor(field: .committedMembersPresent)
                )
                countField("Crianças (0 a 11 anos)", $viewModel.kids0To11, validation?.errorFor(field: .kids0To11))
                countField("Convidados", $viewModel.guests, validation?.errorFor(field: .guests))
                countField("MDAs", $viewModel.mdas, validation?.errorFor(field: .mdas))
                countField(
                    "Comprometidos no Tadel",
                    $viewModel.committedAtTadel,
                    validation?.errorFor(field: .committedAtTadel)
                )
                countField(
                    "Comprometidos no culto",
                    $viewModel.committedAtCulto,
                    validation?.errorFor(field: .committedAtCulto)
                )
                textField(
                    "Líder presente em", $viewModel.leaderAttended,
                    error: validation?.errorFor(field: .leaderAttended), hint: "Separe por vírgula"
                )

                sectionTitle("Oferta")
                offeringField(error: validation?.errorFor(field: .offering))

                sectionTitle("Discipulado")
                countField("Discípulos", $viewModel.disciplesCount, validation?.errorFor(field: .disciplesCount))
                countField(
                    "Discipulados nesta semana",
                    $viewModel.disciplesDiscipledThisWeek,
                    validation?.errorFor(field: .disciplesDiscipledThisWeek)
                )

                sectionTitle("Pastoreio e treinamento")
                textField(
                    "Atividades de pastoreio", $viewModel.pastoringActivityType,
                    error: validation?.errorFor(field: .pastoringActivityType), hint: "Separe por vírgula"
                )
                textField(
                    "Outra atividade de pastoreio", $viewModel.pastoringActivityOther,
                    error: validation?.errorFor(field: .pastoringActivityOther)
                )
                textField(
                    "Atividades de treinamento", $viewModel.trainingActivityType,
                    error: validation?.errorFor(field: .trainingActivityType), hint: "Separe por vírgula"
                )
                textField(
                    "Outra atividade de treinamento", $viewModel.trainingActivityOther,
                    error: validation?.errorFor(field: .trainingActivityOther)
                )

                if let submitError = viewModel.submitError {
                    errorBanner(submitError)
                } else if let validation, !validation.isValid {
                    errorBanner("Corrija os campos destacados para enviar.")
                }
            }
            .padding(.horizontal, PazSpacing.lg)
            .padding(.top, PazSpacing.sm)
            .padding(.bottom, PazSpacing.xl)
        }
        .scrollDismissesKeyboard(.interactively)
        .safeAreaInset(edge: .bottom) {
            PazKeyboardAccessoryBar {
                Button(action: { Task { await viewModel.submit() } }) {
                    Text(viewModel.isSubmitting ? "Enviando..." : "Enviar relatório")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.pazPillPrimary)
                .disabled(viewModel.isSubmitting)
            }
        }
    }

    // MARK: - Field builders

    private func sectionTitle(_ text: String) -> some View {
        Text(text).font(PazTypography.titleSmall).foregroundStyle(PazColors.ink)
    }

    private func label(_ text: String) -> some View {
        Text(text).font(PazTypography.labelMedium).foregroundStyle(PazColors.ink)
    }

    @ViewBuilder
    private func errorText(_ error: String?) -> some View {
        if let error {
            Text(error).font(PazTypography.bodySmall).foregroundStyle(PazColors.error)
        }
    }

    private func fieldBackground(_ error: String?) -> some View {
        RoundedRectangle(cornerRadius: 12)
            .fill(PazColors.surface)
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(error == nil ? .clear : PazColors.error, lineWidth: 1))
    }

    private func countField(_ title: String, _ text: Binding<String>, _ error: String?) -> some View {
        VStack(alignment: .leading, spacing: PazSpacing.sm) {
            label(title)
            TextField(
                "0",
                text: Binding(
                    get: { text.wrappedValue },
                    set: { text.wrappedValue = String($0.filter(\.isNumber).prefix(6)) }
                )
            )
            .font(PazTypography.bodyMedium)
            .keyboardType(.numberPad)
            .padding(.horizontal, PazSpacing.md)
            .frame(height: 56)
            .background(fieldBackground(error))
            .disabled(viewModel.isSubmitting)
            errorText(error)
        }
    }

    private func offeringField(error: String?) -> some View {
        VStack(alignment: .leading, spacing: PazSpacing.sm) {
            label("Oferta (R$)")
            TextField(
                "0,00",
                text: Binding(
                    get: { viewModel.offering },
                    set: { viewModel.offering = String($0.filter { $0.isNumber || $0 == "," || $0 == "." }.prefix(14)) }
                )
            )
            .font(PazTypography.bodyMedium)
            .keyboardType(.decimalPad)
            .padding(.horizontal, PazSpacing.md)
            .frame(height: 56)
            .background(fieldBackground(error))
            .disabled(viewModel.isSubmitting)
            errorText(error)
        }
    }

    private func textField(_ title: String, _ text: Binding<String>, error: String?, hint: String? = nil) -> some View {
        VStack(alignment: .leading, spacing: PazSpacing.sm) {
            label(title)
            TextField("", text: text)
                .font(PazTypography.bodyMedium)
                .padding(.horizontal, PazSpacing.md)
                .frame(height: 56)
                .background(fieldBackground(error))
                .disabled(viewModel.isSubmitting)
            if let error {
                errorText(error)
            } else if let hint {
                Text(hint).font(PazTypography.bodySmall).foregroundStyle(PazColors.slate)
            }
        }
    }

    private func groupField(error: String?) -> some View {
        VStack(alignment: .leading, spacing: PazSpacing.sm) {
            label("Life Group")
            if viewModel.canChooseGroup {
                Menu {
                    ForEach(viewModel.groups, id: \.id) { group in
                        Button(groupLabel(group)) { viewModel.lifeGroupId = group.id }
                    }
                } label: {
                    HStack {
                        Text(viewModel.selectedGroup.map(groupLabel) ?? "Selecione o grupo")
                            .font(PazTypography.bodyMedium)
                            .foregroundStyle(viewModel.selectedGroup == nil ? PazColors.slate : PazColors.ink)
                        Spacer()
                        Image(systemName: "chevron.up.chevron.down").foregroundStyle(PazColors.accent)
                    }
                    .padding(.horizontal, PazSpacing.md)
                    .frame(height: 56)
                    .background(fieldBackground(error))
                }
                .disabled(viewModel.isSubmitting)
            } else {
                HStack {
                    Text(viewModel.selectedGroup?.name ?? "")
                        .font(PazTypography.bodyMedium)
                        .foregroundStyle(PazColors.ink)
                    Spacer()
                }
                .padding(.horizontal, PazSpacing.md)
                .frame(height: 56)
                .background(fieldBackground(nil))
            }
            errorText(error)
        }
    }

    /// Same-named groups get their id appended so each option stays distinguishable.
    private func groupLabel(_ group: LifeGroup) -> String {
        viewModel.groups.filter { $0.name == group.name }.count > 1 ? "\(group.name) (#\(group.id))" : group.name
    }

    private func dateField(error: String?) -> some View {
        VStack(alignment: .leading, spacing: PazSpacing.sm) {
            label("Data da reunião")
            Button(action: {
                pickedDate = LifeGroupReportFormViewModel.date(fromISO: viewModel.date) ?? Date()
                showDatePicker = true
            }) {
                HStack {
                    Text(viewModel.date.isEmpty ? "DD/MM/AAAA" : LifeGroupReportRules.shared
                        .displayDate(iso: viewModel.date))
                        .font(PazTypography.bodyMedium)
                        .foregroundStyle(viewModel.date.isEmpty ? PazColors.slate : PazColors.ink)
                    Spacer()
                    Image(systemName: "calendar").foregroundStyle(PazColors.accent)
                }
                .padding(.horizontal, PazSpacing.md)
                .frame(height: 56)
                .background(fieldBackground(error))
            }
            .buttonStyle(.plain)
            .disabled(viewModel.isSubmitting)
            errorText(error)
        }
        .sheet(isPresented: $showDatePicker) {
            NavigationStack {
                DatePicker(
                    "",
                    selection: $pickedDate,
                    in: ...(LifeGroupReportFormViewModel.date(fromISO: viewModel.today) ?? Date()),
                    displayedComponents: .date
                )
                .datePickerStyle(.graphical)
                .labelsHidden()
                .tint(PazColors.accent)
                .padding()
                .navigationTitle("Data")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("OK") {
                            viewModel.date = LifeGroupReportFormViewModel.iso(from: pickedDate)
                            showDatePicker = false
                        }
                    }
                }
            }
            .presentationDetents([.medium])
        }
    }

    private func errorBanner(_ message: String) -> some View {
        Text(message)
            .font(PazTypography.bodySmall)
            .foregroundColor(PazColors.error)
            .padding(PazSpacing.md)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(PazColors.error.opacity(0.1))
            .cornerRadius(12)
    }
}
