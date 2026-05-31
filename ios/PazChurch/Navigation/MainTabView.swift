import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            // Home tab
            Text("Home Tab")
                .tabItem {
                    Label("Início", systemImage: "house.fill")
                }

            // Academy tab
            Text("Academy Tab")
                .tabItem {
                    Label("Academia", systemImage: "book.fill")
                }

            // Account tab
            Text("Account Tab")
                .tabItem {
                    Label("Conta", systemImage: "person.fill")
                }
        }
    }
}

#Preview {
    MainTabView()
}
