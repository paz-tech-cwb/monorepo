import Observation
import Shared
import SwiftUI

// MARK: - List

@MainActor
@Observable
final class CasaDePazSubmissionsListViewModel {
    var submissions: [CasaDePazReportSubmission] = []
    var sectorNames: [Int32: String] = [:]
    var isLoading = true
    var error: String?

    private let formsRepository: FormsRepository

    init(formsRepository: FormsRepository) {
        self.formsRepository = formsRepository
    }

    func load() async {
        isLoading = true
        error = nil
        do {
            async let submissionsRaw = formsRepository.getCasaDePazReportSubmissions()
            async let sectorsRaw = formsRepository.searchSectors(query: "")
            let (resolvedSubmissions, resolvedSectors) = try await (submissionsRaw, sectorsRaw)
            submissions = ((resolvedSubmissions as? [CasaDePazReportSubmission]) ?? [])
                .sorted { $0.date > $1.date }
            let sectors = (resolvedSectors as? [SectorSummary]) ?? []
            sectorNames = Dictionary(uniqueKeysWithValues: sectors.map { ($0.id, $0.name) })
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func replace(_ updated: CasaDePazReportSubmission) {
        if let idx = submissions.firstIndex(where: { $0.id == updated.id }) {
            submissions[idx] = updated
        }
    }

    func remove(id: String) {
        submissions.removeAll { $0.id == id }
    }
}

struct CasaDePazSubmissionsListView: View {
    @State private var viewModel: CasaDePazSubmissionsListViewModel

    init(formsRepository: FormsRepository) {
        _viewModel = State(initialValue: CasaDePazSubmissionsListViewModel(formsRepository: formsRepository))
    }

    var body: some View {
        screenContent
            .background(PazMeshBackground())
            .navigationTitle("Registros de Casa de Paz")
            .navigationBarTitleDisplayMode(.large)
            .toolbarBackground(.hidden, for: .navigationBar)
            .task { await viewModel.load() }
    }

    @ViewBuilder
    private var screenContent: some View {
        if viewModel.isLoading {
            loadingState
        } else if let error = viewModel.error {
            errorState(error)
        } else if viewModel.submissions.isEmpty {
            emptyState
        } else {
            contentState
        }
    }

    private var contentState: some View {
        ScrollView {
            VStack(spacing: 10) {
                Spacer().frame(height: 8)
                ForEach(viewModel.submissions, id: \.id) { submission in
                    NavigationLink(destination: CasaDePazSubmissionDetailView(
                        submission: submission,
                        sectorNames: viewModel.sectorNames,
                        onUpdated: { viewModel.replace($0) },
                        onDeleted: { viewModel.remove(id: submission.id) }
                    )) {
                        SubmissionRow(submission: submission, sectorName: viewModel.sectorNames[submission.sectorId] ?? "Setor removido")
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal, 20)
                }
                Spacer().frame(height: 32)
            }
            .padding(.top, 8)
        }
        .refreshable { await viewModel.load() }
    }

    private var emptyState: some View {
        VStack {
            Spacer()
            Text("Nenhum registro encontrado").font(PazTypography.titleMedium)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(20)
    }

    private func errorState(_ message: String) -> some View {
        VStack(spacing: 12) {
            Spacer()
            Text(message).font(PazTypography.bodySmall)
            Button("Tentar Novamente") { Task { await viewModel.load() } }
                .buttonStyle(.pazPillPrimary)
            Spacer()
        }
        .padding(20)
    }

    private var loadingState: some View {
        VStack(spacing: 12) {
            Spacer().frame(height: 16)
            ForEach(0..<3, id: \.self) { _ in SkeletonView().frame(height: 72).padding(.horizontal, 20) }
            Spacer()
        }
    }
}

private struct SubmissionRow: View {
    let submission: CasaDePazReportSubmission
    let sectorName: String

    var body: some View {
        GlassCard(radius: PazSpacing.cardRadiusCompact) {
            VStack(alignment: .leading, spacing: 4) {
                Text("\(brDateString(fromISODate: submission.date)) · \(sectorName)").font(PazTypography.titleSmall)
                Text(submission.facilitator).font(PazTypography.bodySmall).foregroundStyle(PazColors.slate)
                Text("Crianças: \(submission.kids) · Convidados: \(submission.guests.count) · Conversões: \(submission.conversions)")
                    .font(PazTypography.bodySmall).foregroundStyle(PazColors.slate)
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

// MARK: - Detail / Edit

@MainActor
@Observable
final class CasaDePazSubmissionDetailViewModel {
    var date: String
    var facilitator: String
    var sectorId: Int32
    var casaDePazId: String
    var kids: String
    var guests: [CasaDePazGuestDraftIOS]
    var conversions: String
    var meetingDay: String
    var cycles: [CasaDePazCycle] = []

    var isSaving = false
    var isDeleting = false
    var error: String?

    private let id: String
    private let formsRepository: FormsRepository

    init(submission: CasaDePazReportSubmission, formsRepository: FormsRepository) {
        self.id = submission.id
        self.formsRepository = formsRepository
        date = submission.date
        facilitator = submission.facilitator
        sectorId = submission.sectorId
        casaDePazId = submission.casaDePazId
        kids = "\(submission.kids)"
        guests = submission.guests.map {
            CasaDePazGuestDraftIOS(
                name: $0.name,
                email: $0.email,
                birthDate: $0.birthDate,
                whatsapp: $0.whatsapp ?? ""
            )
        }
        conversions = "\(submission.conversions)"
        meetingDay = submission.meetingDay ?? ""
    }

    func loadCycles() async {
        do {
            let result = try await formsRepository.getCasaDePazCycles()
            cycles = result.compactMap { $0 as? CasaDePazCycle }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func addGuest() {
        guests.append(CasaDePazGuestDraftIOS())
    }

    func updateGuest(_ index: Int, _ patch: (inout CasaDePazGuestDraftIOS) -> Void) {
        guard guests.indices.contains(index) else { return }
        patch(&guests[index])
    }

    func removeGuest(_ index: Int) {
        guard guests.indices.contains(index) else { return }
        guests.remove(at: index)
    }

    func save() async -> CasaDePazReportSubmission? {
        isSaving = true
        error = nil
        let form = CasaDePazReportForm(
            date: date,
            facilitator: facilitator.trimmingCharacters(in: .whitespaces),
            sectorId: sectorId,
            casaDePazId: casaDePazId,
            kids: Int32(kids) ?? 0,
            guests: guests.map {
                CasaDePazReportGuestEntry(
                    name: $0.name.trimmingCharacters(in: .whitespaces),
                    email: $0.email.trimmingCharacters(in: .whitespaces),
                    birthDate: $0.birthDate,
                    whatsapp: $0.whatsapp.trimmingCharacters(in: .whitespaces).isEmpty
                        ? nil
                        : $0.whatsapp.trimmingCharacters(in: .whitespaces)
                )
            },
            conversions: Int32(conversions) ?? 0,
            meetingDay: meetingDay.isEmpty ? nil : meetingDay,
            meetingTime: nil
        )
        do {
            try await formsRepository.updateCasaDePazReport(id: id, form: form)
            isSaving = false
            return CasaDePazReportSubmission(
                id: id, date: date, facilitator: form.facilitator, sectorId: sectorId,
                casaDePazId: form.casaDePazId, kids: form.kids, guests: form.guests,
                conversions: form.conversions,
                meetingDay: form.meetingDay, meetingTime: form.meetingTime,
                createdAt: "", updatedAt: ""
            )
        } catch {
            self.error = error.localizedDescription
            isSaving = false
            return nil
        }
    }

    func delete() async -> Bool {
        isDeleting = true
        error = nil
        do {
            try await formsRepository.deleteCasaDePazReport(id: id)
            isDeleting = false
            return true
        } catch {
            self.error = error.localizedDescription
            isDeleting = false
            return false
        }
    }
}

struct CasaDePazSubmissionDetailView: View {
    @State private var viewModel: CasaDePazSubmissionDetailViewModel
    let sectorNames: [Int32: String]
    let onUpdated: (CasaDePazReportSubmission) -> Void
    let onDeleted: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var showDeleteConfirm = false

    init(
        submission: CasaDePazReportSubmission,
        sectorNames: [Int32: String],
        onUpdated: @escaping (CasaDePazReportSubmission) -> Void,
        onDeleted: @escaping () -> Void
    ) {
        _viewModel = State(initialValue: CasaDePazSubmissionDetailViewModel(
            submission: submission,
            formsRepository: IosAppContainer.shared.formsRepository
        ))
        self.sectorNames = sectorNames
        self.onUpdated = onUpdated
        self.onDeleted = onDeleted
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: PazSpacing.md) {
                Spacer().frame(height: PazSpacing.sm)

                GlassCard(radius: PazSpacing.cardRadiusCompact) {
                    VStack(alignment: .leading, spacing: PazSpacing.sm) {
                        LabeledField(label: "Data (AAAA-MM-DD)") { TextField("", text: $viewModel.date) }
                        LabeledField(label: "Facilitador") { TextField("", text: $viewModel.facilitator) }
                        LabeledField(label: "Setor") {
                            Picker("", selection: $viewModel.sectorId) {
                                ForEach(sectorNames.sorted(by: { $0.value < $1.value }), id: \.key) { id, name in
                                    Text(name).tag(id)
                                }
                            }
                            .pickerStyle(.menu)
                        }
                        LabeledField(label: "Ciclo") {
                            Picker("", selection: $viewModel.casaDePazId) {
                                ForEach(viewModel.cycles, id: \.id) { cycle in
                                    Text(cycle.name).tag(cycle.id)
                                }
                            }
                            .pickerStyle(.menu)
                        }
                        LabeledField(label: "Dia da reunião") {
                            Picker("", selection: $viewModel.meetingDay) {
                                Text("—").tag("")
                                ForEach(FormFieldDefs.meetingDayOptions, id: \.self) { day in
                                    Text(day).tag(day)
                                }
                            }
                            .pickerStyle(.menu)
                        }
                        LabeledField(label: "Crianças") { TextField("", text: $viewModel.kids).keyboardType(.numberPad) }
                        LabeledField(label: "Conversões") { TextField("", text: $viewModel.conversions).keyboardType(.numberPad) }
                    }
                    .padding(PazSpacing.md)
                }

                GlassCard(radius: PazSpacing.cardRadiusCompact) {
                    GuestListFieldRow(
                        guests: viewModel.guests,
                        disabled: viewModel.isSaving || viewModel.isDeleting,
                        onAdd: { viewModel.addGuest() },
                        onUpdate: { viewModel.updateGuest($0, $1) },
                        onRemove: { viewModel.removeGuest($0) }
                    )
                    .padding(PazSpacing.md)
                }

                if let error = viewModel.error {
                    Text(error).font(PazTypography.bodySmall).foregroundStyle(.red)
                }

                Button {
                    Task {
                        if let updated = await viewModel.save() {
                            onUpdated(updated)
                            dismiss()
                        }
                    }
                } label: {
                    if viewModel.isSaving { ProgressView() } else { Text("Salvar") }
                }
                .buttonStyle(.pazPillPrimary)
                .disabled(
                    viewModel.isSaving || viewModel.isDeleting
                        || viewModel.casaDePazId.isEmpty
                        || !viewModel.guests.allSatisfy(\.isValid)
                )
                .frame(maxWidth: .infinity)

                Button(role: .destructive) {
                    showDeleteConfirm = true
                } label: {
                    if viewModel.isDeleting { ProgressView() } else { Text("Excluir registro") }
                }
                .disabled(viewModel.isSaving || viewModel.isDeleting)
                .frame(maxWidth: .infinity)
                .padding(.top, 4)

                Spacer().frame(height: PazSpacing.lg)
            }
            .padding(.horizontal, PazSpacing.lg)
        }
        .background(PazMeshBackground())
        .navigationTitle("Editar Registro")
        .navigationBarTitleDisplayMode(.inline)
        .task { await viewModel.loadCycles() }
        .confirmationDialog(
            "Excluir este registro de Casa de Paz?",
            isPresented: $showDeleteConfirm,
            titleVisibility: .visible
        ) {
            Button("Excluir", role: .destructive) {
                Task {
                    if await viewModel.delete() {
                        onDeleted()
                        dismiss()
                    }
                }
            }
            Button("Cancelar", role: .cancel) {}
        } message: {
            Text("Esta ação não pode ser desfeita.")
        }
    }
}

private struct LabeledField<Content: View>: View {
    let label: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(PazTypography.labelSmall).foregroundColor(.gray)
            content
        }
    }
}
