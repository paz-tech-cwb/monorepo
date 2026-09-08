import MapKit
import Shared
import SwiftUI

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
    @State private var selectedGroup: LifeGroup?

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
            .sheet(item: $selectedGroup) { group in
                NavigationStack {
                    LifeGroupDetailView(lifeGroup: group)
                        .toolbar {
                            ToolbarItem(placement: .cancellationAction) {
                                Button("Fechar") { selectedGroup = nil }
                            }
                        }
                }
                .presentationDetents([.medium, .large])
            }
        }
    }
}

/// LifeGroup already conforms to Hashable via Kotlin's generated equals()/
/// hashCode() bridging — only Identifiable needs adding for Map(selection:).
extension LifeGroup: Identifiable {}
