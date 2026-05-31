import SwiftUI

struct PazColors {
    // Primary brand colors
    static let primary = Color(red: 0.31, green: 0.16, blue: 0.78) // #4F28C7
    static let secondary = Color(red: 0.98, green: 0.82, blue: 0.25) // #FBD140

    // Status colors
    static let success = Color(red: 0.13, green: 0.71, blue: 0.58) // #22B582
    static let error = Color(red: 0.91, green: 0.30, blue: 0.24) // #E84D3D
    static let warning = Color(red: 0.98, green: 0.68, blue: 0.25) // #FBAD41

    // Neutral colors
    static let background = Color(UIColor.systemBackground)
    static let surface = Color(UIColor { $0.userInterfaceStyle == .dark ? UIColor(white: 0.11, alpha: 1) : .white })
    static let surfaceVariant = Color(UIColor { $0.userInterfaceStyle == .dark ? UIColor(white: 0.15, alpha: 1) : UIColor(white: 0.96, alpha: 1) })

    static let onSurface = Color(UIColor.label)
    static let onBackground = Color(UIColor.label)

    // Gradients
    static let heroGradient = LinearGradient(
        gradient: Gradient(colors: [Color(red: 0.25, green: 0.12, blue: 0.62), Color(red: 0.31, green: 0.16, blue: 0.78)]),
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}
