package br.church.paz.android.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// TODO: add font .ttf files to android/src/main/res/font/ then uncomment.
// Download from Google Fonts: Playfair_Display (Bold, ExtraBold), DM_Sans (Regular, Medium, SemiBold, Bold)
//
// val PlayfairDisplay = FontFamily(
//     Font(R.font.playfair_display_bold,      FontWeight.Bold),
//     Font(R.font.playfair_display_extrabold, FontWeight.ExtraBold),
// )
// val DmSans = FontFamily(
//     Font(R.font.dm_sans_regular,   FontWeight.Normal),
//     Font(R.font.dm_sans_medium,    FontWeight.Medium),
//     Font(R.font.dm_sans_semibold,  FontWeight.SemiBold),
//     Font(R.font.dm_sans_bold,      FontWeight.Bold),
// )

// Temporary: system serif + default sans until font files are added
val PlayfairDisplay = FontFamily.Serif
val DmSans          = FontFamily.Default

val PazTypography = Typography(
    displayLarge = TextStyle(
        fontFamily = PlayfairDisplay, fontSize = 42.sp,
        fontWeight = FontWeight.ExtraBold, lineHeight = 50.sp,
    ),
    headlineMedium = TextStyle(
        fontFamily = PlayfairDisplay, fontSize = 28.sp,
        fontWeight = FontWeight.Bold, lineHeight = 34.sp,
    ),
    titleLarge = TextStyle(
        fontFamily = PlayfairDisplay, fontSize = 22.sp,
        fontWeight = FontWeight.Bold, lineHeight = 28.sp,
    ),
    titleMedium = TextStyle(
        fontFamily = DmSans, fontSize = 16.sp,
        fontWeight = FontWeight.SemiBold, lineHeight = 22.sp,
    ),
    bodyLarge = TextStyle(
        fontFamily = DmSans, fontSize = 15.sp,
        fontWeight = FontWeight.Normal, lineHeight = 24.sp,
    ),
    bodyMedium = TextStyle(
        fontFamily = DmSans, fontSize = 14.sp,
        fontWeight = FontWeight.Normal, lineHeight = 22.sp,
    ),
    bodySmall = TextStyle(
        fontFamily = DmSans, fontSize = 13.sp,
        fontWeight = FontWeight.Normal, lineHeight = 18.sp,
    ),
    labelSmall = TextStyle(
        fontFamily = DmSans, fontSize = 11.sp,
        fontWeight = FontWeight.Bold, lineHeight = 14.sp,
        letterSpacing = 1.5.sp,
    ),
)
