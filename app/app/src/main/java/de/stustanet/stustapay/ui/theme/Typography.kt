package de.stustanet.stustapay.ui.theme

import androidx.compose.material.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// Set of Material typography styles to start with
val Typography = Typography(
    body1 = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = 18.sp,
    ),
    button = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Medium,
        fontSize = 20.sp,
    ),
    h1 = TextStyle(
        fontWeight = FontWeight.Light,
        fontSize = 80.sp,
        letterSpacing = (-1.5).sp
    ),
    h2 = TextStyle(
        fontWeight = FontWeight.Light,
        fontSize = 60.sp,
        letterSpacing = (-0.5).sp
    ),
    h3 = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize = 48.sp,
        letterSpacing = 0.sp
    ),
    h4 = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize = 32.sp,
        letterSpacing = 0.25.sp
    ),
    h5 = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize = 24.sp,
    ),
)

val LargeButtonStyle = TextStyle(
    fontFamily = FontFamily.Default,
    fontWeight = FontWeight.Medium,
    fontSize = 34.sp,
)

val StartpageItemStyle = TextStyle(
    fontFamily = FontFamily.Default,
    fontWeight = FontWeight.Medium,
    fontSize = 20.sp,
)

val NumberKeyboardStyle = TextStyle(
    fontFamily = FontFamily.Default,
    fontWeight = FontWeight.Bold,
    fontSize = 28.sp,
)

val MoneyAmountStyle = TextStyle(
    fontWeight = FontWeight.Bold,
    fontSize = 60.sp,
)

val ProductConfirmItemStyle = TextStyle(
    fontWeight = FontWeight.Normal,
    fontSize = 20.sp,
    letterSpacing = 0.sp,
)

val ProductConfirmItemBigStyle = TextStyle(
    fontWeight = FontWeight.Normal,
    fontSize = 28.sp,
    letterSpacing = 0.sp,
)

val ProductButtonStyle = TextStyle(
    fontWeight = FontWeight.Medium,
    fontSize = 22.sp,
    letterSpacing = 0.sp,
)

// e.g. for the standalone '-' button
val ProductButtonBigStyle = TextStyle(
    fontWeight = FontWeight.Medium,
    fontSize = 28.sp,
    letterSpacing = 0.sp,
)

val AccountOverviewKeyStyle = TextStyle(
    fontWeight = FontWeight.Normal,
    fontSize = 20.sp,
    letterSpacing = 0.sp,
)
val AccountOverviewValueStyle = TextStyle(
    fontWeight = FontWeight.Normal,
    fontSize = 24.sp,
    letterSpacing = 0.sp,
)
val AccountOverviewValueBigStyle = TextStyle(
    fontWeight = FontWeight.Medium,
    fontSize = 30.sp,
    letterSpacing = 0.sp,
)