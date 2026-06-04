import SwiftUI
import UIKit

struct PazColors {
    // MARK: - Brand (non-adaptive — always these values)
    static let pazPrimary      = Color(hex: "032E58")
    static let pazPrimaryMid   = Color(hex: "0B4D8C")
    static let pazPrimaryLight = Color(hex: "1565C0")
    static let pazSky          = Color(hex: "5B9BD5")
    static let pazGold         = Color(hex: "FFB300")

    // MARK: - Adaptive surfaces (dark / light)
    static let background = Color(UIColor {
        $0.userInterfaceStyle == .dark
            ? UIColor(hex: "070E1A") : UIColor(hex: "EDF1F7")
    })
    static let surface = Color(UIColor {
        $0.userInterfaceStyle == .dark
            ? UIColor(hex: "0D1826") : .white
    })
    static let surface2 = Color(UIColor {
        $0.userInterfaceStyle == .dark
            ? UIColor(hex: "101F31") : UIColor(hex: "F4F7FC")
    })
    static let ink = Color(UIColor {
        $0.userInterfaceStyle == .dark
            ? UIColor(hex: "EAEFF7") : UIColor(hex: "16243A")
    })
    static let slate = Color(UIColor {
        $0.userInterfaceStyle == .dark
            ? UIColor(hex: "97A6BC") : UIColor(hex: "5A6B82")
    })
    static let slateLight = Color(UIColor {
        $0.userInterfaceStyle == .dark
            ? UIColor(hex: "6B7C93") : UIColor(hex: "8A94A6")
    })
    static let line = Color(UIColor {
        $0.userInterfaceStyle == .dark
            ? UIColor(hex: "1C2A3D") : UIColor(hex: "E7ECF3")
    })
    static let tint = Color(UIColor {
        $0.userInterfaceStyle == .dark
            ? UIColor(hex: "0C274A") : UIColor(hex: "E8F0FB")
    })

    // MARK: - Semantic / legacy aliases
    static let primary   = pazPrimary
    static let onSurface = ink
    static let error     = Color(red: 0.78, green: 0.16, blue: 0.16)

    // MARK: - Gradient
    static let heroGradient = LinearGradient(
        colors: [Color(hex: "032E58"), Color(hex: "0B4D8C"), Color(hex: "1565C0")],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}

// MARK: - Hex initializers
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: .alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        self.init(
            red:   Double((int >> 16) & 0xFF) / 255,
            green: Double((int >>  8) & 0xFF) / 255,
            blue:  Double( int        & 0xFF) / 255
        )
    }
}

extension UIColor {
    convenience init(hex: String) {
        let hex = hex.trimmingCharacters(in: .alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        self.init(
            red:   CGFloat((int >> 16) & 0xFF) / 255,
            green: CGFloat((int >>  8) & 0xFF) / 255,
            blue:  CGFloat( int        & 0xFF) / 255,
            alpha: 1
        )
    }
}
