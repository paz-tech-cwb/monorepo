import SwiftUI
import Shared

struct MainTabView: View {
    @EnvironmentObject private var pushService: PushNotificationService
    @State private var navigationPath = NavigationPath()

    var body: some View {
        // Listen for notification deep links resolved while app is running
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

            SearchView(
                homeRepository: IosAppContainer.shared.homeRepository,
                academyRepository: IosAppContainer.shared.academyRepository,
                formsRepository: IosAppContainer.shared.formsRepository,
                churchRepository: IosAppContainer.shared.churchRepository
            )
            .tabItem {
                Label("Buscar", systemImage: "magnifyingglass")
            }

            AccountView(
                userRepository: IosAppContainer.shared.userRepository,
                authRepository: IosAppContainer.shared.authRepository
            )
            .tabItem {
                Label("Conta", systemImage: "person.fill")
            }
        }
        .accentColor(Color(red: 0.31, green: 0.16, blue: 0.78))
    }
}

#Preview {
    MainTabView()
}
