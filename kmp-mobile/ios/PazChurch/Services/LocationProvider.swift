import CoreLocation
import Observation

/// Thin wrapper around `CLLocationManager` that requests when-in-use
/// authorization and publishes the device's current coordinate — used to
/// power `UserAnnotation()` on the life groups map and distance-based
/// sorting in the life groups list.
///
/// Degrades silently: a denied/restricted authorization, or any location
/// error, simply leaves `coordinate` `nil` rather than crashing or blocking
/// the UI. Callers must treat "no coordinate yet" as a valid, expected
/// state (e.g. grey out "Distância" sort instead of reordering).
@MainActor
@Observable
final class LocationProvider: NSObject {
    private(set) var coordinate: CLLocationCoordinate2D?
    private(set) var authorizationStatus: CLAuthorizationStatus

    private let manager: CLLocationManager

    override init() {
        manager = CLLocationManager()
        authorizationStatus = manager.authorizationStatus
        super.init()
        manager.delegate = self
    }

    /// No-op if authorization was already decided (granted or denied) —
    /// safe to call every time the map/list screen appears.
    func requestAuthorization() {
        switch manager.authorizationStatus {
        case .notDetermined:
            manager.requestWhenInUseAuthorization()
        case .authorizedWhenInUse, .authorizedAlways:
            manager.startUpdatingLocation()
        default:
            // Denied/restricted — nothing to do; coordinate stays nil.
            break
        }
    }
}

extension LocationProvider: CLLocationManagerDelegate {
    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        Task { @MainActor in
            self.authorizationStatus = manager.authorizationStatus
            switch manager.authorizationStatus {
            case .authorizedWhenInUse, .authorizedAlways:
                manager.startUpdatingLocation()
            default:
                self.coordinate = nil
            }
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let latest = locations.last else { return }
        Task { @MainActor in
            self.coordinate = latest.coordinate
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        // Best-effort feature — swallow the error, keep coordinate nil.
    }
}
