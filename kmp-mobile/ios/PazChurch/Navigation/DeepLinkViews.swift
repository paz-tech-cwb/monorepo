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
                    .background(PazColors.background)
            } else {
                ContentUnavailableView(
                    "Formulário não encontrado",
                    systemImage: "doc.badge.exclamationmark"
                )
                .background(PazColors.background)
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
                    .background(PazColors.background)
            } else {
                ContentUnavailableView(
                    "Ministério não encontrado",
                    systemImage: "person.3"
                )
                .background(PazColors.background)
            }
        }
        .task {
            do {
                let church = try await churchRepository.getChurch()
                ministry = church.ministries.first { $0.id == ministryId }
            } catch {}
            isLoading = false
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
                    .background(PazColors.background)
            } else {
                ContentUnavailableView(
                    "Célula não encontrada",
                    systemImage: "person.fill.questionmark"
                )
                .background(PazColors.background)
            }
        }
        .task {
            do {
                let groups = try await churchRepository.getAllLifeGroups()
                lifeGroup = groups.first { $0.id == lifeGroupId }
            } catch {}
            isLoading = false
        }
    }
}
