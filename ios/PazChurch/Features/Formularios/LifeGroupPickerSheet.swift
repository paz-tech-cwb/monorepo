import Shared
import SwiftUI

struct LifeGroupPickerSheet: View {
    @Bindable var viewModel: FormDetailViewModelIOS

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                TextField("Buscar grupo de vida", text: Binding(
                    get: { viewModel.pickerQuery },
                    set: { viewModel.onPickerQueryChanged($0) }
                ))
                .padding(PazSpacing.md)
                .background(PazColors.surface)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding(PazSpacing.md)

                if viewModel.pickerIsLoading {
                    ProgressView().padding()
                } else if let error = viewModel.pickerError {
                    Text(error).foregroundColor(.red).padding()
                } else {
                    let groups = viewModel.pickerResults.compactMap { $0 as? LifeGroupSummary }
                    let selectedId = viewModel.fields[viewModel.pickerKey ?? ""] ?? ""
                    List(groups, id: \.id) { lg in
                        HStack {
                            Text(lg.name)
                            Spacer()
                            if String(lg.id) == selectedId {
                                Image(systemName: "checkmark").foregroundColor(PazColors.pazPrimary)
                            }
                        }
                        .contentShape(Rectangle())
                        .onTapGesture { viewModel.onPickerSelect(id: String(lg.id), name: lg.name) }
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
