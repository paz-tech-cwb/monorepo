package br.church.paz.android.ui.theme

import androidx.compose.ui.graphics.Color

object PazColors {
    // ── Brand gradient family ─────────────────────────────────────────────
    val Primary       = Color(0xFF032E58)
    val PrimaryMid    = Color(0xFF0B4D8C)
    val PrimaryLight  = Color(0xFF1565C0)
    val Accent        = Color(0xFF5B9BD5)
    val Sky           = Color(0xFF90CAF9)
    val Gold          = Color(0xFFFFB300)
    val GoldLight     = Color(0xFFFFD54F)

    // ── Light palette ─────────────────────────────────────────────────────
    val Background    = Color(0xFFEEF3FB)
    val Surface       = Color(0xFFFFFFFF)
    val Surface2      = Color(0xFFF4F7FD)
    val OnSurface     = Color(0xFF0A1929)
    val OnSurface2    = Color(0xFF37526D)
    val Muted         = Color(0xFF7FA3C4)
    val Border        = Color(0x14032E58)
    val PrimaryTint   = Color(0xFFEAF2FC)
    val PrimaryContainer   = Color(0xFFD0E4F7)
    val SecondaryContainer = Color(0xFFE3EEF9)

    // ── Semantic ──────────────────────────────────────────────────────────
    val Success     = Color(0xFF1E8A4C)
    val Error       = Color(0xFFC62828)
    val Warning     = Color(0xFFE8A020)
    val ErrorTint   = Color(0xFFFFEAEA)
    val SuccessTint = Color(0xFFE6F4ED)

    // ── Dark palette ──────────────────────────────────────────────────────
    val DarkBackground  = Color(0xFF070E1A)
    val DarkSurface     = Color(0xFF0D1826)
    val DarkSurface2    = Color(0xFF142035)
    val DarkOnBackground= Color(0xFFE3EEFF)
    val DarkOnSurface   = Color(0xFF6EA0C8)
    val DarkMuted       = Color(0xFF2D4A65)
    val DarkBorder      = Color(0x215B9BD5)
    val DarkError       = Color(0xFFFF6B6B)
    val DarkPrimaryContainer  = Color(0xFF07243F)
    val DarkSecondaryContainer= Color(0xFF0D3A60)
    val DarkCard2  = Color(0xFF101F31)
    val DarkSlate  = Color(0xFF97A6BC)

    // ── UI component tokens ───────────────────────────────────────────────────
    /** Text color on gold badge (dark gold-brown) */
    val GoldOnBadge           = Color(0xFF3A2600)
    /** Inactive pager dot — translucent navy */
    val DotInactive           = Color(0x2914243A)
    /** Shadow tint — dark navy translucent (ambient) */
    val ShadowNavy            = Color(0x1414243A)
    /** Contribution card gradient highlight */
    val ContributionHighlight = Color(0xFF1257A0)
    /** Contribution card gradient deep */
    val ContributionDeep      = Color(0xFF07315E)
    /** Navy text on white surfaces (e.g. dízimos primary button label) */
    val NavyText              = Color(0xFF0B3A6B)
    /** Day pill gradient start */
    val DayPillStart          = Color(0xFF0A3360)
    /** Day pill gradient end */
    val DayPillEnd            = Color(0xFF06294C)
    /** Location / map pin icon */
    val LocationRed           = Color(0xFFE0533D)
    /** Slate text — light mode body copy */
    val Slate                 = Color(0xFF5A6B82)
    /** Content color on dark auth button */
    val OnDarkButton          = Color(0xFFEAEFF7)
    /** Border for dark-mode auth button */
    val DarkButtonBorder      = Color(0xFF1C2A3D)
    /** Border for light-mode auth button */
    val LightButtonBorder     = Color(0xFFE7ECF3)
}
