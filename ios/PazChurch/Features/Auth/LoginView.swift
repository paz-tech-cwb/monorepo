import SwiftUI

struct LoginView: View {
    var body: some View {
        NavigationStack {
            ZStack {
                VStack(spacing: 0) {
                    VStack(alignment: .leading) {
                        Text("Paz Church")
                            .font(PazTypography.headlineMedium)
                            .foregroundColor(.white)
                        Spacer().frame(height: PazSpacing.xl)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(PazColors.heroGradient)

                    VStack(spacing: PazSpacing.lg) {
                        Spacer().frame(height: PazSpacing.xl)

                        Button(action: {}) {
                            HStack(spacing: PazSpacing.md) {
                                Image(systemName: "g.circle.fill")
                                    .font(.system(size: 20))
                                Text("Entrar com Google")
                                    .font(PazTypography.titleMedium)
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, PazSpacing.md)
                            .background(Color.black)
                            .cornerRadius(12)
                        }

                        Button(action: {}) {
                            HStack(spacing: PazSpacing.md) {
                                Image(systemName: "apple.logo")
                                    .font(.system(size: 20))
                                Text("Entrar com Apple")
                                    .font(PazTypography.titleMedium)
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, PazSpacing.md)
                            .background(Color.black)
                            .cornerRadius(12)
                        }

                        Spacer()
                    }
                    .padding(.horizontal, PazSpacing.lg)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(PazColors.background)
                }
                .background(PazColors.background)
            }
        }
    }
}

#Preview {
    LoginView()
}
