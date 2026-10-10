import Shared

/// Direct-navigation shortcuts into `FormStepView` that bypass the Formulários
/// catalog list screen — used when a role should be able to jump straight to a
/// single form (e.g. non-leaders submitting the Convidado form from the
/// Account screen) without browsing the full catalog.
extension FormCatalogItem {
    static let convidadoShortcut = FormCatalogItem(
        id: "form-guests",
        title: "Convidado",
        description: nil,
        canWrite: true,
        canRead: false
    )
}
