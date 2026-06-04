import SwiftUI

struct PazTypography {
    // Display / Headline — Playfair Display
    static let displayLarge   = Font.custom("PlayfairDisplay-ExtraBold", size: 34)
    static let headlineLarge  = Font.custom("PlayfairDisplay-Bold",      size: 32)
    static let headlineMedium = Font.custom("PlayfairDisplay-Bold",      size: 28)
    static let headlineSmall  = Font.custom("PlayfairDisplay-Bold",      size: 24)

    // Title — Playfair Display (large) / DM Sans (medium/small)
    static let titleLarge  = Font.custom("PlayfairDisplay-Bold",    size: 22)
    static let titleMedium = Font.custom("DMSans-SemiBold",         size: 16)
    static let titleSmall  = Font.custom("DMSans-SemiBold",         size: 14)

    // Body — DM Sans
    static let bodyLarge  = Font.custom("DMSans-Regular", size: 16)
    static let bodyMedium = Font.custom("DMSans-Regular", size: 14)
    static let bodySmall  = Font.custom("DMSans-Regular", size: 12)

    // Label — DM Sans
    static let labelLarge  = Font.custom("DMSans-Medium", size: 14)
    static let labelMedium = Font.custom("DMSans-Medium", size: 12)
    static let labelSmall  = Font.custom("DMSans-Bold",   size: 11)
}
