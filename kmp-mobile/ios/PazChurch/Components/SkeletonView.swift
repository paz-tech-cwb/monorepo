import SwiftUI

struct SkeletonView: View {
    @State private var isAnimating = false

    var body: some View {
        ZStack {
            Color.gray.opacity(0.2)

            LinearGradient(
                gradient: Gradient(stops: [
                    .init(color: Color.gray.opacity(0.2), location: 0),
                    .init(color: Color.gray.opacity(0.4), location: 0.5),
                    .init(color: Color.gray.opacity(0.2), location: 1),
                ]),
                startPoint: .leading,
                endPoint: .trailing
            )
            .offset(x: isAnimating ? 400 : -400)
        }
        .cornerRadius(8)
        .onAppear {
            withAnimation(Animation.linear(duration: 1.5).repeatForever(autoreverses: false)) {
                isAnimating = true
            }
        }
    }
}

#Preview {
    VStack(spacing: 8) {
        SkeletonView().frame(height: 20)
        SkeletonView().frame(height: 20)
        SkeletonView().frame(height: 20)
    }
    .padding()
}
