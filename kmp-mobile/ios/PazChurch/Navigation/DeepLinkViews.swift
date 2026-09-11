import Shared
import SwiftUI

struct FormDetailDeepLinkView: View {
    let formId: String
    let formsRepository: FormsRepository

    @State private var form: FormCatalogItem?
    @State private var isLoading = true

    var body: some View {
        Group {
            if let form {
                FormDetailView(form: form)
            } else if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(PazMeshBackground())
            } else {
                ContentUnavailableView(
                    "Formulário não encontrado",
                    systemImage: "doc.badge.exclamationmark"
                )
                .background(PazMeshBackground())
            }
        }
        .task {
            do {
                let catalog = try await formsRepository.getCatalog()
                form = catalog.first { $0.id == formId }
            } catch {}
            isLoading = false
        }
    }
}

struct MinistryDetailDeepLinkView: View {
    let ministryId: String
    let churchRepository: ChurchRepository

    @State private var ministry: Ministry?
    @State private var isLoading = true

    var body: some View {
        Group {
            if let ministry {
                MinistryDetailView(ministry: ministry)
            } else if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(PazMeshBackground())
            } else {
                ContentUnavailableView(
                    "Ministério não encontrado",
                    systemImage: "person.3"
                )
                .background(PazMeshBackground())
            }
        }
        .task {
            do {
                let wantedId = Int32(ministryId)
                let ministries = try await churchRepository.getAllMinistries()
                ministry = ministries.first { $0.id == wantedId }
            } catch {}
            isLoading = false
        }
    }
}

struct LifeGroupAttendanceEditorDeepLinkView: View {
    let lifeGroupId: String
    let meetingDate: String
    let repository: LifeGroupAttendanceRepository

    var body: some View {
        Group {
            if let id = Int32(lifeGroupId) {
                LifeGroupAttendanceEditorView(
                    lifeGroupId: id,
                    meetingDate: meetingDate,
                    repository: repository,
                    onSaved: {},
                    onCancel: {}
                )
            } else {
                ContentUnavailableView(
                    "Grupo não encontrado",
                    systemImage: "person.fill.questionmark"
                )
                .background(PazMeshBackground())
            }
        }
    }
}

struct LifeGroupDetailDeepLinkView: View {
    let lifeGroupId: String
    let churchRepository: ChurchRepository

    @State private var lifeGroup: LifeGroup?
    @State private var isLoading = true

    var body: some View {
        Group {
            if let lifeGroup {
                LifeGroupDetailView(lifeGroup: lifeGroup)
            } else if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(PazMeshBackground())
            } else {
                ContentUnavailableView(
                    "Célula não encontrada",
                    systemImage: "person.fill.questionmark"
                )
                .background(PazMeshBackground())
            }
        }
        .task {
            do {
                let wantedId = Int32(lifeGroupId)
                let groups = try await churchRepository.getAllLifeGroups()
                lifeGroup = groups.first { $0.id == wantedId }
            } catch {}
            isLoading = false
        }
    }
}
