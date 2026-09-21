import Shared
import SwiftUI

struct CertificatesView: View {
    @State private var viewModel: CertificatesViewModel

    init(courseRepository: CourseRepository) {
        _viewModel = State(initialValue: CertificatesViewModel(courseRepository: courseRepository))
    }

    var body: some View {
        Group {
            if viewModel.isLoading {
                loadingState
            } else if let error = viewModel.error {
                ErrorStateView(message: error, onRetry: { Task { await viewModel.load() } })
            } else if viewModel.certificates.isEmpty {
                emptyState
            } else {
                ScrollView {
                    LazyVStack(spacing: PazSpacing.md) {
                        ForEach(viewModel.certificates, id: \.certificate.id) { entry in
                            CertificateRow(entry: entry)
                        }
                    }
                    .padding(PazSpacing.lg)
                }
            }
        }
        .background(PazMeshBackground().ignoresSafeArea())
        .navigationTitle("Meus certificados")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.hidden, for: .navigationBar)
        .task { await viewModel.load() }
    }

    private var emptyState: some View {
        VStack(spacing: PazSpacing.sm) {
            Spacer()
            Text("Você ainda não possui certificados")
                .font(PazTypography.bodyMedium)
                .foregroundStyle(PazColors.slate)
            Spacer()
        }
    }

    private var loadingState: some View {
        VStack(spacing: PazSpacing.md) {
            ForEach(0..<3, id: \.self) { _ in SkeletonView().frame(height: 72) }
        }
        .padding(PazSpacing.lg)
    }
}

private struct CertificateRow: View {
    let entry: CourseCertificateEntry

    var body: some View {
        HStack(spacing: PazSpacing.md) {
            ZStack {
                Circle().fill(PazColors.pazGold.opacity(0.15))
                Image(systemName: "rosette").foregroundStyle(PazColors.pazGold)
            }
            .frame(width: 48, height: 48)

            VStack(alignment: .leading, spacing: 2) {
                Text(entry.courseTitle).font(PazTypography.titleSmall).lineLimit(2)
                let issuedDate = String(entry.certificate.issuedAt.prefix(10))
                let score = entry.certificate.scorePercentage
                Text("Emitido em \(issuedDate) · Nota \(score)%")
                    .font(PazTypography.bodySmall)
                    .foregroundStyle(PazColors.slate)
            }
            Spacer()
        }
        .padding(PazSpacing.md)
        .background(PazColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: PazSpacing.cardRadiusCompact))
    }
}
