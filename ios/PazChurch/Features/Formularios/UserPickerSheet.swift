import Shared
import SwiftUI

struct UserPickerSheet: View {
    @Bindable var viewModel: FormDetailViewModelIOS

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                TextField("Buscar por nome, telefone ou e-mail", text: Binding(
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
                    let users = viewModel.pickerResults.compactMap { $0 as? User }
                    let selectedIds = Set((viewModel.fields[viewModel.pickerKey ?? ""] ?? "")
                        .split(separator: ",").map(String.init))
                    List(users, id: \.id) { user in
                        HStack {
                            VStack(alignment: .leading) {
                                Text(user.name)
                                if !user.email.isEmpty {
                                    Text(user.email).font(.caption).foregroundColor(.secondary)
                                }
                            }
                            Spacer()
                            if selectedIds.contains(user.id) {
                                Image(systemName: "checkmark").foregroundColor(PazColors.pazPrimary)
                            }
                        }
                        .contentShape(Rectangle())
                        .onTapGesture { viewModel.onPickerSelect(id: user.id, name: user.name) }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle(viewModel.pickerLabel)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    if viewModel.pickerIsMulti {
                        Button("Confirmar") { viewModel.closePicker() }
                    } else {
                        Button("Cancelar") { viewModel.closePicker() }
                    }
                }
            }
        }
    }
}
