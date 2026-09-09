import MapKit
import Shared
import SwiftUI
import UIKit

/// Map-based discovery view for life groups — the primary way a member finds
/// a group to join (see LifeGroupsView.swift for the list alternative).
struct LifeGroupsMapView: View {
    let lifeGroups: [LifeGroup]

    /// Starts centered on the member's own location at a close zoom (a city-wide
    /// `.automatic` fit reads as "empty" when groups are spread out) — falls back
    /// to auto-fitting all markers if location access isn't available.
    @State private var cameraPosition: MapCameraPosition = .userLocation(
        fallback: .automatic
    )
    /// Set the instant a marker is tapped — drives the "Como chegar / Ver
    /// detalhes" action sheet. Separate from `detailGroup` so picking an
    /// option (or dismissing the dialog) doesn't also open the detail sheet.
    @State private var selectedGroup: LifeGroup?
    @State private var detailGroup: LifeGroup?

    private var groupsWithLocation: [LifeGroup] {
        lifeGroups.filter { $0.latitude != nil && $0.longitude != nil }
    }

    var body: some View {
        if groupsWithLocation.isEmpty {
            VStack {
                Spacer()
                Text("Nenhum grupo com localização cadastrada ainda.")
                    .font(PazTypography.bodySmall)
                    .foregroundColor(.gray)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, PazSpacing.xl)
                Spacer()
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            Map(position: $cameraPosition, selection: $selectedGroup) {
                ForEach(groupsWithLocation, id: \.id) { group in
                    Marker(
                        group.name,
                        coordinate: CLLocationCoordinate2D(
                            latitude: group.latitude!.doubleValue,
                            longitude: group.longitude!.doubleValue
                        )
                    )
                    .tag(group)
                }
            }
            .mapControls {
                MapUserLocationButton()
                MapCompass()
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .confirmationDialog(
                selectedGroup?.name ?? "",
                isPresented: Binding(
                    get: { selectedGroup != nil },
                    set: { if !$0 { selectedGroup = nil } }
                ),
                titleVisibility: .visible,
                presenting: selectedGroup
            ) { group in
                Button("Como chegar") { openInMaps(group) }
                Button("Ver detalhes") { detailGroup = group }
                Button("Cancelar", role: .cancel) {}
            }
            .sheet(item: $detailGroup) { group in
                NavigationStack {
                    LifeGroupDetailView(lifeGroup: group)
                        .toolbar {
                            ToolbarItem(placement: .cancellationAction) {
                                Button("Fechar") { detailGroup = nil }
                            }
                        }
                }
                .presentationDetents([.medium, .large])
            }
        }
    }

    private func openInMaps(_ group: LifeGroup) {
        guard let lat = group.latitude, let lng = group.longitude else { return }
        let name = group.name.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? group.name
        if let url = URL(string: "maps://?daddr=\(lat),\(lng)&q=\(name)") {
            UIApplication.shared.open(url)
        }
    }
}

/// LifeGroup already conforms to Hashable via Kotlin's generated equals()/
/// hashCode() bridging — only Identifiable needs adding for Map(selection:).
extension LifeGroup: Identifiable {}
