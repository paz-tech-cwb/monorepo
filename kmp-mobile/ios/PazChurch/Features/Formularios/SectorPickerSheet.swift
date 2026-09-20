import Shared
import SwiftUI

struct SectorPickerSheet: View {
    @Bindable var viewModel: FormDetailViewModelIOS

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                TextField("Buscar setor", text: Binding(
                    get: { viewModel.pickerQuery },
                    set: { viewModel.onPickerQueryChanged($0) }
                ))
                .padding(PazSpacing.md)
                .background(PazColors.surface)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding(PazSpacing.md)

                if viewModel.pickerIsLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let error = viewModel.pickerError {
                    Text(error).foregroundStyle(PazColors.error).padding()
                } else {
                    let sectors = viewModel.pickerResults.compactMap { $0 as? SectorSummary }
                    let selectedId = viewModel.fields[viewModel.pickerKey ?? ""] ?? ""
                    List(sectors, id: \.id) { sector in
                        HStack {
                            Text(sector.name)
                            Spacer()
                            if String(sector.id) == selectedId {
                                Image(systemName: "checkmark").foregroundColor(PazColors.accent)
                            }
                        }
                        .contentShape(Rectangle())
                        .onTapGesture { viewModel.onPickerSelect(id: String(sector.id), name: sector.name) }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle(viewModel.pickerLabel)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancelar") { viewModel.closePicker() }
                }
            }
        }
    }
}
