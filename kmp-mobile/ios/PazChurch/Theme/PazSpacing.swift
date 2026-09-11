import SwiftUI

enum PazSpacing {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 24
    static let xxl: CGFloat = 32
    static let xxxl: CGFloat = 48

    // MARK: - Glass rebrand radii (2026-09 glassmorphic restyle)

    static let cardRadiusCompact: CGFloat = 24
    static let cardRadiusLarge: CGFloat = 28
    static let pillButtonHeight: CGFloat = 52
}

enum PazShapes {
    static let small = RoundedRectangle(cornerRadius: 8)
    static let medium = RoundedRectangle(cornerRadius: 12)
    static let large = RoundedRectangle(cornerRadius: 16)
}
