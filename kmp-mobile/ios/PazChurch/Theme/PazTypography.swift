import SwiftUI

enum PazTypography {
    // Display / Headline — SF Pro Heavy/Bold
    static let displayLarge = Font.system(size: 34, weight: .heavy, design: .default)
    static let headlineLarge = Font.system(size: 32, weight: .bold, design: .default)
    static let headlineMedium = Font.system(size: 28, weight: .bold, design: .default)
    static let headlineSmall = Font.system(size: 24, weight: .bold, design: .default)

    // Title
    static let titleLarge = Font.system(size: 22, weight: .bold, design: .default)
    static let titleMedium = Font.system(size: 16, weight: .semibold, design: .default)
    static let titleSmall = Font.system(size: 14, weight: .semibold, design: .default)

    // Body
    static let bodyLarge = Font.system(size: 16, weight: .regular, design: .default)
    static let bodyMedium = Font.system(size: 14, weight: .regular, design: .default)
    static let bodySmall = Font.system(size: 12, weight: .regular, design: .default)

    // Label
    static let labelLarge = Font.system(size: 14, weight: .medium, design: .default)
    static let labelMedium = Font.system(size: 12, weight: .medium, design: .default)
    static let labelSmall = Font.system(size: 11, weight: .bold, design: .default)
}
