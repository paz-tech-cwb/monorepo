import Shared
import SwiftUI

struct MainTabView: View {
    @Environment(PushNotificationService.self) private var pushService
    @Environment(AuthenticationCoordinator.self) private var authCoordinator

    var body: some View {
        TabView {
            HomeView(
                homeRepository: IosAppContainer.shared.homeRepository,
                authRepository: IosAppContainer.shared.authRepository
            )
            .tabItem {
                Label("Início", systemImage: "house.fill")
            }

            AcademyView(academyRepository: IosAppContainer.shared.academyRepository)
                .tabItem {
                    Label("Academia", systemImage: "book.fill")
                }

            AccountView(
                userRepository: IosAppContainer.shared.userRepository,
                authRepository: IosAppContainer.shared.authRepository
            )
            .tabItem {
                Label("Conta", systemImage: "person.fill")
            }
        }
        .tint(PazColors.pazPrimaryLight)
    }
}

#Preview {
    MainTabView()
        .environment(AuthenticationCoordinator(authRepository: IosAppContainer.shared.authRepository))
        .environment(PushNotificationService.shared)
}
