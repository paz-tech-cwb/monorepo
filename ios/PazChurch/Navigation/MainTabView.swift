import SwiftUI
import Shared

struct MainTabView: View {
    @EnvironmentObject private var pushService: PushNotificationService
    @State private var navigationPath = NavigationPath()

    var body: some View {
        // Listen for notification deep links resolved while app is running
        TabView {
            HomeView(
                homeRepository: HomeRepositoryImpl(),
                authRepository: AuthRepositoryImpl()
            )
            .tabItem {
                Label("Início", systemImage: "house.fill")
            }

            AcademyView(academyRepository: AcademyRepositoryImpl())
                .tabItem {
                    Label("Academia", systemImage: "book.fill")
                }

            SearchView(
                homeRepository: HomeRepositoryImpl(),
                academyRepository: AcademyRepositoryImpl(),
                formsRepository: FormsRepositoryImpl(),
                churchRepository: ChurchRepositoryImpl()
            )
            .tabItem {
                Label("Buscar", systemImage: "magnifyingglass")
            }

            AccountView(
                userRepository: UserRepositoryImpl(),
                authRepository: AuthRepositoryImpl()
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
