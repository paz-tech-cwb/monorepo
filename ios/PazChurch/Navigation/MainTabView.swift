import SwiftUI
import Shared

struct MainTabView: View {
    var body: some View {
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
