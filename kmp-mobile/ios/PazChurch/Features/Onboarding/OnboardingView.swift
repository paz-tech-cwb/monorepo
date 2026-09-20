import AVKit
import Shared
import SwiftUI

/// Post-sign-in member-onboarding flow: an unskippable welcome video, then up to three
/// skippable profile-completion steps (birthday, WhatsApp, address). Presented full-screen,
/// with a native (non-custom) nav bar per step so back-navigation never applies here — each
/// step either advances, is skipped, or the flow finishes and calls `onFinished`.
struct OnboardingView: View {
    @State private var coordinator: OnboardingCoordinator
    let onFinished: () -> Void

    init(
        repository: OnboardingRepository,
        pendingBirthDateLogin: ((String) async -> Result<Void, Error>)? = nil,
        onFinished: @escaping () -> Void
    ) {
        _coordinator = State(initialValue: OnboardingCoordinator(
            repository: repository,
            pendingBirthDateLogin: pendingBirthDateLogin
        ))
        self.onFinished = onFinished
    }

    var body: some View {
        NavigationStack {
            Group {
                if coordinator.currentStep == .video, let loadErrorMessage = coordinator.loadErrorMessage {
                    // The initial `missingSteps()` fetch (kicked off by `start()` alongside the
                    // video) failed. The video may still be playing here; once it finishes,
                    // `advance()` sees `loadErrorMessage` and stays on `.video` instead of
                    // silently finishing, so this same branch keeps showing the retry state.
                    OnboardingLoadErrorView(
                        message: loadErrorMessage,
                        onRetry: { Task { await coordinator.retryStart() } }
                    )
                } else if coordinator.isLoadingMissingSteps, coordinator.currentStep != .video {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if coordinator.currentStep == .video {
                    WelcomeVideoStepView(onFinished: coordinator.onVideoFinished)
                } else if coordinator.currentStep == .birthday {
                    BirthdayStepView(
                        isSubmitting: coordinator.isSubmitting,
                        errorMessage: coordinator.errorMessage,
                        onSubmit: { date in Task { await coordinator.onBirthdaySubmitted(date) } },
                        onSkip: coordinator.onSkipCurrentStep
                    )
                } else if coordinator.currentStep == .whatsapp {
                    WhatsappStepView(
                        isSubmitting: coordinator.isSubmitting,
                        errorMessage: coordinator.errorMessage,
                        onSubmit: { phone in Task { await coordinator.onWhatsappSubmitted(phone) } },
                        onSkip: coordinator.onSkipCurrentStep
                    )
                } else if coordinator.currentStep == .address {
                    AddressStepView(
                        isSubmitting: coordinator.isSubmitting,
                        isLookingUpCep: coordinator.isLookingUpCep,
                        errorMessage: coordinator.errorMessage,
                        cepResult: coordinator.cepResult,
                        onLookupCep: { cep in Task { await coordinator.onLookupCep(cep) } },
                        onSubmit: { street, number, complement, neighborhood, city, state, zip in
                            Task {
                                await coordinator.onAddressSubmitted(
                                    street: street,
                                    number: number,
                                    complement: complement,
                                    neighborhood: neighborhood,
                                    city: city,
                                    state: state,
                                    zipCode: zip
                                )
                            }
                        },
                        onSkip: coordinator.onSkipCurrentStep
                    )
                } else {
                    Color.clear
                        .onAppear(perform: onFinished)
                }
            }
            .background(PazColors.background)
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
        }
        .task { await coordinator.start() }
    }
}

// MARK: - Initial missing-steps fetch failed (retryable)

private struct OnboardingLoadErrorView: View {
    let message: String
    let onRetry: () -> Void

    var body: some View {
        VStack(spacing: PazSpacing.lg) {
            Spacer()

            Text("Não foi possível carregar seu cadastro")
                .font(PazTypography.headlineSmall)
                .foregroundStyle(PazColors.ink)
                .multilineTextAlignment(.center)

            Text(message)
                .font(PazTypography.bodyMedium)
                .foregroundStyle(PazColors.slate)
                .multilineTextAlignment(.center)

            Button("Tentar novamente", action: onRetry)
                .buttonStyle(.pazPillPrimary)

            Spacer()
        }
        .padding(PazSpacing.xl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Step 1: Welcome video (not skippable)

private struct WelcomeVideoStepView: View {
    let onFinished: () -> Void

    // TODO(task-6): replace with a real value sourced from app config once that's wired up.
    private static let placeholderVideoURL = URL(
        string: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    )!

    @State private var player = AVPlayer(url: WelcomeVideoStepView.placeholderVideoURL)
    @State private var didEndObserverToken: NSObjectProtocol?

    var body: some View {
        VideoPlayer(player: player)
            .ignoresSafeArea()
            .background(Color.black)
            .task {
                player.play()
                removeDidEndObserver()
                didEndObserverToken = NotificationCenter.default.addObserver(
                    forName: .AVPlayerItemDidPlayToEndTime,
                    object: player.currentItem,
                    queue: .main
                ) { _ in
                    removeDidEndObserver()
                    onFinished()
                }
            }
            .onDisappear {
                removeDidEndObserver()
            }
    }

    private func removeDidEndObserver() {
        if let token = didEndObserverToken {
            NotificationCenter.default.removeObserver(token)
            didEndObserverToken = nil
        }
    }
}

// MARK: - Step 2: Birthday (skippable)

private struct BirthdayStepView: View {
    let isSubmitting: Bool
    let errorMessage: String?
    let onSubmit: (String) -> Void
    let onSkip: () -> Void

    @State private var birthDate = Date()

    private var isoDate: String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.timeZone = TimeZone(identifier: "UTC")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: birthDate)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: PazSpacing.lg) {
            Text("Qual sua data de nascimento?")
                .font(PazTypography.headlineSmall)
                .foregroundStyle(PazColors.ink)

            Text(
                "Usamos isso para conectar você a grupos e ministérios da sua faixa etária, e para confirmar seu cadastro caso já exista um registro seu na igreja."
            )
            .font(PazTypography.bodyMedium)
            .foregroundStyle(PazColors.slate)

            DatePicker(
                "Data de nascimento",
                selection: $birthDate,
                in: ...Date(),
                displayedComponents: .date
            )
            .datePickerStyle(.wheel)
            .labelsHidden()

            if let errorMessage {
                Text(errorMessage)
                    .font(PazTypography.bodySmall)
                    .foregroundStyle(PazColors.error)
            }

            Spacer()

            Button {
                onSubmit(isoDate)
            } label: {
                if isSubmitting {
                    ProgressView().tint(PazColors.surface)
                } else {
                    Text("Continuar")
                }
            }
            .buttonStyle(.pazPillPrimary)
            .disabled(isSubmitting)

            Button("Pular por agora", action: onSkip)
                .font(PazTypography.labelLarge)
                .foregroundStyle(PazColors.slate)
                .frame(maxWidth: .infinity)
                .disabled(isSubmitting)
        }
        .padding(PazSpacing.xl)
        .navigationTitle("Data de nascimento")
    }
}

// MARK: - Step 3: WhatsApp (skippable)

private struct WhatsappStepView: View {
    let isSubmitting: Bool
    let errorMessage: String?
    let onSubmit: (String) -> Void
    let onSkip: () -> Void

    @State private var phone = ""

    var body: some View {
        VStack(alignment: .leading, spacing: PazSpacing.lg) {
            Text("Qual seu WhatsApp?")
                .font(PazTypography.headlineSmall)
                .foregroundStyle(PazColors.ink)

            Text("É por ele que a equipe da igreja vai entrar em contato com você sobre grupos, eventos e novidades.")
                .font(PazTypography.bodyMedium)
                .foregroundStyle(PazColors.slate)

            TextField("(11) 91234-5678", text: $phone)
                .keyboardType(.phonePad)
                .textFieldStyle(.roundedBorder)

            if let errorMessage {
                Text(errorMessage)
                    .font(PazTypography.bodySmall)
                    .foregroundStyle(PazColors.error)
            }

            Spacer()

            Button {
                onSubmit(phone)
            } label: {
                if isSubmitting {
                    ProgressView().tint(PazColors.surface)
                } else {
                    Text("Continuar")
                }
            }
            .buttonStyle(.pazPillPrimary)
            .disabled(isSubmitting || phone.trimmingCharacters(in: .whitespaces).isEmpty)

            Button("Pular por agora", action: onSkip)
                .font(PazTypography.labelLarge)
                .foregroundStyle(PazColors.slate)
                .frame(maxWidth: .infinity)
                .disabled(isSubmitting)
        }
        .padding(PazSpacing.xl)
        .navigationTitle("WhatsApp")
    }
}

// MARK: - Step 4: Address, with CEP lookup + manual fallback (skippable)

private struct AddressStepView: View {
    let isSubmitting: Bool
    let isLookingUpCep: Bool
    let errorMessage: String?
    let cepResult: CepLookupOutcome?
    let onLookupCep: (String) -> Void
    let onSubmit: (String, String, String?, String, String, String, String) -> Void
    let onSkip: () -> Void

    @State private var cep = ""
    @State private var number = ""
    @State private var complement = ""
    @State private var manualStreet = ""
    @State private var manualNeighborhood = ""
    @State private var manualCity = ""
    @State private var manualState = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: PazSpacing.lg) {
                Text("Qual seu endereço?")
                    .font(PazTypography.headlineSmall)
                    .foregroundStyle(PazColors.ink)

                Text("Usamos para visitas pastorais e para conectar você com o que acontece perto de você.")
                    .font(PazTypography.bodyMedium)
                    .foregroundStyle(PazColors.slate)

                HStack(spacing: PazSpacing.sm) {
                    TextField("CEP", text: $cep)
                        .keyboardType(.numberPad)
                        .textFieldStyle(.roundedBorder)
                    Button {
                        onLookupCep(cep)
                    } label: {
                        if isLookingUpCep {
                            ProgressView()
                        } else {
                            Text("Buscar")
                        }
                    }
                    .disabled(isLookingUpCep || cep.trimmingCharacters(in: .whitespaces).isEmpty)
                }

                resultSection

                if let errorMessage {
                    Text(errorMessage)
                        .font(PazTypography.bodySmall)
                        .foregroundStyle(PazColors.error)
                }

                Button("Pular por agora", action: onSkip)
                    .font(PazTypography.labelLarge)
                    .foregroundStyle(PazColors.slate)
                    .frame(maxWidth: .infinity)
                    .disabled(isSubmitting)
            }
            .padding(PazSpacing.xl)
        }
        .navigationTitle("Endereço")
    }

    @ViewBuilder
    private var resultSection: some View {
        // `CepLookupOutcome` bridges from Kotlin as a sealed-interface protocol with concrete
        // subclasses (`CepLookupOutcomeFound` / `CepLookupOutcomeNotFound` / `CepLookupOutcomeError`),
        // not a native Swift enum — matched here via `as?`/`is` casts rather than `switch case`.
        if let found = cepResult as? CepLookupOutcomeFound {
            VStack(alignment: .leading, spacing: PazSpacing.sm) {
                Text("\(found.result.street), \(found.result.neighborhood)")
                    .font(PazTypography.bodyMedium)
                Text("\(found.result.city) - \(found.result.state)")
                    .font(PazTypography.bodySmall)
                    .foregroundStyle(PazColors.slate)

                TextField("Número", text: $number).textFieldStyle(.roundedBorder)
                TextField("Complemento (opcional)", text: $complement).textFieldStyle(.roundedBorder)

                submitButton {
                    onSubmit(
                        found.result.street,
                        number,
                        complement.isEmpty ? nil : complement,
                        found.result.neighborhood,
                        found.result.city,
                        found.result.state,
                        cep
                    )
                }
            }
        } else if cepResult is CepLookupOutcomeNotFound || cepResult is CepLookupOutcomeError {
            VStack(alignment: .leading, spacing: PazSpacing.sm) {
                Text("Não encontramos esse CEP. Preencha seu endereço manualmente:")
                    .font(PazTypography.bodySmall)
                    .foregroundStyle(PazColors.slate)

                TextField("Rua", text: $manualStreet).textFieldStyle(.roundedBorder)
                TextField("Número", text: $number).textFieldStyle(.roundedBorder)
                TextField("Complemento (opcional)", text: $complement).textFieldStyle(.roundedBorder)
                TextField("Bairro", text: $manualNeighborhood).textFieldStyle(.roundedBorder)
                TextField("Cidade", text: $manualCity).textFieldStyle(.roundedBorder)
                TextField("Estado", text: $manualState).textFieldStyle(.roundedBorder)

                submitButton {
                    onSubmit(
                        manualStreet,
                        number,
                        complement.isEmpty ? nil : complement,
                        manualNeighborhood,
                        manualCity,
                        manualState,
                        cep
                    )
                }
            }
        }
    }

    private func submitButton(action: @escaping () -> Void) -> some View {
        Button(action: action) {
            if isSubmitting {
                ProgressView().tint(PazColors.surface)
            } else {
                Text("Continuar")
            }
        }
        .buttonStyle(.pazPillPrimary)
        .disabled(isSubmitting || number.trimmingCharacters(in: .whitespaces).isEmpty)
    }
}
