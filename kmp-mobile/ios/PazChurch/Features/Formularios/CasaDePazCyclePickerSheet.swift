import Shared
import SwiftUI

struct CasaDePazCyclePickerSheet: View {
    @Bindable var viewModel: FormDetailViewModelIOS

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                TextField("Buscar ciclo", text: Binding(
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
                    let cycles = viewModel.pickerResults.compactMap { $0 as? CasaDePazCycle }
                    let selectedId = viewModel.fields[viewModel.pickerKey ?? ""] ?? ""
                    List(cycles, id: \.id) { cycle in
                        HStack {
                            Text(cycle.name)
                            Spacer()
                            if cycle.id == selectedId {
                                Image(systemName: "checkmark").foregroundColor(PazColors.accent)
                            }
                        }
                        .contentShape(Rectangle())
                        .onTapGesture { viewModel.onPickerSelect(id: cycle.id, name: cycle.name) }
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
