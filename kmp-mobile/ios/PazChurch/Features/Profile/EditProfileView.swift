import Kingfisher
import PhotosUI
import Shared
import SwiftUI

struct EditProfileView: View {
    @State private var viewModel: EditProfileViewModel
    @Environment(\.dismiss) var dismiss
    @Environment(AuthenticationCoordinator.self) private var authCoordinator
    @State private var showDatePicker = false
    @State private var pickerItem: PhotosPickerItem?
    @State private var showDiscardDialog = false

    init() {
        _viewModel = State(initialValue: EditProfileViewModel(
            userRepository: IosAppContainer.shared.userRepository,
            authRepository: IosAppContainer.shared.authRepository,
            onboardingRepository: IosAppContainer.shared.onboardingRepository
        ))
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: PazSpacing.lg) {
                    Spacer().frame(height: PazSpacing.lg)

                    avatarPicker

                    formCard
                    addressCard
                }
                .padding(.horizontal, PazSpacing.lg)
            }

            Button(action: { viewModel.onSave() }) {
                Text(viewModel.isSaving ? "Salvando..." : "Salvar")
                    .font(PazTypography.titleMedium)
            }
            .buttonStyle(.pazPillPrimary)
            .disabled(viewModel.isSaving || viewModel.isUploadingPicture || viewModel.name
                .trimmingCharacters(in: .whitespaces).isEmpty)
            .padding(.horizontal, PazSpacing.lg)
            .padding(.vertical, PazSpacing.md)
        }
        .background(PazMeshBackground())
        .navigationTitle("Editar Perfil")
        .navigationBarTitleDisplayMode(.large)
        .navigationBarBackButtonHidden(true)
        .toolbarBackground(.hidden, for: .navigationBar)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button(action: requestDismiss) {
                    Image(systemName: "chevron.backward")
                }
            }
        }
        .confirmationDialog(
            "Descartar alterações?",
            isPresented: $showDiscardDialog,
            titleVisibility: .visible
        ) {
            Button("Descartar", role: .destructive) { dismiss() }
            Button("Continuar editando", role: .cancel) {}
        }
        // The default back button is hidden above, but the interactive swipe-back
        // gesture still pops the stack directly — bypass that by installing a gesture
        // delegate that blocks the swipe (via `gestureRecognizerShouldBegin`) while
        // there are unsaved changes, forwarding to the nav controller's original
        // delegate otherwise. On teardown (screen popped/dismissed), the original
        // delegate is always restored since the recognizer belongs to the SHARED
        // navigation controller, not this screen.
        .background(InteractivePopGestureDisabler(
            isDisabled: viewModel.isDirty,
            onBlockedSwipeAttempt: { showDiscardDialog = true }
        ))
        .onChange(of: viewModel.saveSuccess) { _, success in
            if success { dismiss() }
        }
        .onChange(of: pickerItem) { _, newItem in
            Task {
                if let data = try? await newItem?.loadTransferable(type: Data.self) {
                    viewModel.onPictureSelected(data: data)
                }
            }
        }
        .onChange(of: viewModel.sessionExpired) { _, expired in
            // No recovery path for a dead Firebase session short of a full logout —
            // force the user back to login instead of leaving them stuck on a dead-end toast.
            if expired { authCoordinator.logout() }
        }
    }

    /// Routes the custom back button through the same discard check used by the
    /// `InteractivePopGestureDisabler` below: when dirty, the interactive swipe-back
    /// gesture is disabled (not popped) and this handler is invoked instead so the
    /// same confirmation dialog shown here is also surfaced on a blocked swipe attempt.
    private func requestDismiss() {
        if viewModel.isDirty {
            showDiscardDialog = true
        } else {
            dismiss()
        }
    }

    private var avatarPicker: some View {
        HStack {
            Spacer()
            PhotosPicker(selection: $pickerItem, matching: .images) {
                ZStack(alignment: .bottomTrailing) {
                    Group {
                        if viewModel.isUploadingPicture {
                            ProgressView()
                        } else if let urlString = viewModel.pictureUrl, let url = URL(string: urlString) {
                            KFImage(url)
                                .resizable()
                                .placeholder { ProgressView() }
                                .aspectRatio(contentMode: .fill)
                        } else {
                            Image(systemName: "person.fill")
                                .font(.system(size: 40))
                                .foregroundStyle(PazColors.accent)
                        }
                    }
                    .frame(width: 96, height: 96)
                    .background(PazColors.accent.opacity(0.15))
                    .clipShape(Circle())

                    Image(systemName: "camera.fill")
                        .font(.system(size: 12))
                        .foregroundStyle(.white)
                        .padding(6)
                        .background(PazColors.accent)
                        .clipShape(Circle())
                }
            }
            Spacer()
        }
    }

    private var formCard: some View {
        VStack(alignment: .leading, spacing: PazSpacing.lg) {
            ProfileField(label: "Nome completo") {
                TextField("Seu nome completo", text: $viewModel.name)
                    .textContentType(.name)
                    .autocapitalization(.words)
                    .keyboardType(.default)
                    .profileFieldStyle()
            }

            ProfileField(label: "Telefone (WhatsApp)") {
                TextField("(41) 9 9999-9999", text: $viewModel.phone)
                    .textContentType(.telephoneNumber)
                    .keyboardType(.phonePad)
                    .profileFieldStyle()
                    .onChange(of: viewModel.phone) { old, new in
                        viewModel.phone = applyPhoneMask(old: old, new: new)
                    }
            }

            ProfileField(label: "Data de nascimento") {
                Button(action: { showDatePicker.toggle() }) {
                    HStack {
                        if let date = viewModel.birthDate {
                            Text(date, format: .dateTime.day().month(.wide).year())
                                .foregroundStyle(PazColors.ink)
                        } else {
                            Text("Selecionar data")
                                .foregroundStyle(PazColors.slate)
                        }
                        Spacer()
                        Image(systemName: "calendar")
                            .foregroundStyle(PazColors.accent)
                    }
                    .font(PazTypography.bodyMedium)
                    .padding(.horizontal, PazSpacing.md)
                    .frame(height: 56)
                    .background(PazColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .buttonStyle(.plain)

                if showDatePicker {
                    DatePicker(
                        "",
                        selection: Binding(
                            get: { viewModel.birthDate ?? Date() },
                            set: { viewModel.birthDate = $0 }
                        ),
                        in: ...Date(),
                        displayedComponents: .date
                    )
                    .datePickerStyle(.graphical)
                    .tint(PazColors.accent)
                    .onChange(of: viewModel.birthDate) { _, _ in showDatePicker = false }
                    .padding(PazSpacing.sm)
                    .background(PazColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }

            if let error = viewModel.error {
                Text(error)
                    .font(PazTypography.bodySmall)
                    .foregroundStyle(PazColors.error)
                    .padding(PazSpacing.md)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(PazColors.error.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    private var addressCard: some View {
        VStack(alignment: .leading, spacing: PazSpacing.md) {
            Text("Endereço (opcional)")
                .font(PazTypography.labelMedium)
                .foregroundStyle(PazColors.onSurface)

            HStack(spacing: PazSpacing.sm) {
                TextField("CEP", text: Binding(
                    get: { viewModel.cep },
                    set: { viewModel.onCepChanged($0) }
                ))
                .keyboardType(.numberPad)
                .profileFieldStyle()

                if viewModel.isLookingUpCep {
                    ProgressView().frame(width: 24)
                }
            }

            if let cepError = viewModel.cepError {
                Text(cepError)
                    .font(PazTypography.bodySmall)
                    .foregroundStyle(PazColors.error)
            }

            TextField("Rua", text: $viewModel.street).profileFieldStyle()

            HStack(spacing: PazSpacing.sm) {
                TextField("Número", text: $viewModel.number)
                    .keyboardType(.numberPad)
                    .profileFieldStyle()
                TextField("Complemento", text: $viewModel.complement).profileFieldStyle()
            }

            TextField("Bairro", text: $viewModel.neighborhood).profileFieldStyle()

            HStack(spacing: PazSpacing.sm) {
                TextField("Cidade", text: $viewModel.city).profileFieldStyle()
                TextField("UF", text: $viewModel.state)
                    .autocapitalization(.allCharacters)
                    .profileFieldStyle()
                    .frame(width: 80)
            }
        }
    }
}

// MARK: - Helpers

private func applyPhoneMask(old: String, new: String) -> String {
    var digits = new.filter(\.isNumber)
    // If raw length shrank but digit count stayed the same,
    // the user deleted a formatting char — drop the last digit.
    let oldDigits = old.filter(\.isNumber)
    if new.count < old.count, digits.count == oldDigits.count, !digits.isEmpty {
        digits = String(digits.dropLast())
    }
    return formatPhoneDigits(digits)
}

private func formatPhoneDigits(_ digits: String) -> String {
    var result = ""
    let d = Array(digits.prefix(11))
    for (i, c) in d.enumerated() {
        switch i {
        case 0: result += "(\(c)"
        case 1: result += "\(c)) "
        case 2: result += "\(c) "
        case 6: result += "\(c)-"
        default: result += "\(c)"
        }
    }
    return result
}

// MARK: - Sub-views

private struct ProfileField<Content: View>: View {
    let label: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: PazSpacing.sm) {
            Text(label)
                .font(PazTypography.labelMedium)
                .foregroundStyle(PazColors.onSurface)
            content
        }
    }
}

private extension View {
    /// Flat chrome matching `FormFieldRow`'s fields — `PazColors.surface` background,
    /// 12pt corner radius, 56pt tall. No frosted/glass material: profile fields are
    /// plain inputs, not cards.
    func profileFieldStyle() -> some View {
        self
            .font(PazTypography.bodyMedium)
            .padding(.horizontal, PazSpacing.md)
            .frame(height: 56)
            .background(PazColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

#Preview {
    NavigationStack {
        EditProfileView()
    }
}

/// Intercepts `UINavigationController.interactivePopGestureRecognizer` for the hosting
/// navigation controller — SwiftUI has no native API to intercept swipe-back on a
/// `NavigationStack` push, so this reaches into UIKit the same way `navigationBarBackButtonHidden`
/// alone cannot stop the gesture. While `isDisabled`, a swipe attempt is blocked and
/// `onBlockedSwipeAttempt` fires so the caller can surface the same discard-confirmation
/// dialog the explicit back button shows, instead of the swipe silently doing nothing.
private struct InteractivePopGestureDisabler: UIViewControllerRepresentable {
    let isDisabled: Bool
    let onBlockedSwipeAttempt: () -> Void

    func makeUIViewController(context: Context) -> UIViewController {
        UIViewController()
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {
        context.coordinator.isDisabled = isDisabled
        context.coordinator.onBlockedSwipeAttempt = onBlockedSwipeAttempt
        attachIfNeeded(uiViewController, coordinator: context.coordinator)
        // The navigation controller may not be resolvable yet on the first pass
        // (view hierarchy still settling) — retry shortly so the gesture is reliably
        // intercepted rather than silently no-op'ing if `parent` wasn't set yet.
        DispatchQueue.main.async {
            attachIfNeeded(uiViewController, coordinator: context.coordinator)
        }
    }

    static func dismantleUIViewController(_ uiViewController: UIViewController, coordinator: Coordinator) {
        // The gesture recognizer belongs to the SHARED navigation controller, not this
        // screen — always restore it on teardown regardless of `isDisabled` at the time,
        // so a dismiss while dirty (e.g. "Descartar") never leaves swipe-back disabled
        // for the rest of the app's nav stack.
        guard let gesture = coordinator.gesture else { return }
        gesture.isEnabled = true
        gesture.delegate = coordinator.originalDelegate
    }

    private func attachIfNeeded(_ uiViewController: UIViewController, coordinator: Coordinator) {
        guard coordinator.gesture == nil,
              let gesture = uiViewController.parent?.navigationController?.interactivePopGestureRecognizer
        else { return }
        coordinator.gesture = gesture
        coordinator.originalDelegate = gesture.delegate
        gesture.delegate = coordinator
    }

    func makeCoordinator() -> Coordinator { Coordinator() }

    final class Coordinator: NSObject, UIGestureRecognizerDelegate {
        var isDisabled = false
        var onBlockedSwipeAttempt: (() -> Void)?
        weak var gesture: UIGestureRecognizer?
        weak var originalDelegate: UIGestureRecognizerDelegate?

        func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
            if isDisabled {
                onBlockedSwipeAttempt?()
                return false
            }
            return originalDelegate?.gestureRecognizerShouldBegin?(gestureRecognizer) ?? true
        }

        // The navigation controller's own pop-gesture delegate also implements these two
        // methods — forward to it so replacing the delegate wholesale doesn't silently drop
        // its real touch/simultaneous-recognition logic for the lifetime of this screen.
        func gestureRecognizer(
            _ gestureRecognizer: UIGestureRecognizer,
            shouldReceive touch: UITouch
        ) -> Bool {
            originalDelegate?.gestureRecognizer?(gestureRecognizer, shouldReceive: touch) ?? true
        }

        func gestureRecognizer(
            _ gestureRecognizer: UIGestureRecognizer,
            shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer
        ) -> Bool {
            originalDelegate?.gestureRecognizer?(
                gestureRecognizer,
                shouldRecognizeSimultaneouslyWith: otherGestureRecognizer
            ) ?? false
        }
    }
}
