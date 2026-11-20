package com.example.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.example.R

// Bold 1980s retro geometric display font for VIZAG CITY hero title
val RussoOneFamily = FontFamily(
  Font(R.font.russo_one, FontWeight.Normal),
  Font(R.font.russo_one, FontWeight.Bold),
)

// Sweeping brush-italic Vice-inspired tagline script font ("The Open World")
val ViceScriptFamily = FontFamily(
  Font(R.font.kaushan_script, FontWeight.Normal),
  Font(R.font.kaushan_script, FontWeight.Bold),
)

// Crisp geometric uppercase menu labels & HUD telemetry numerals
val ChakraPetchFamily = FontFamily(
  Font(R.font.chakra_petch, FontWeight.Normal),
  Font(R.font.chakra_petch, FontWeight.SemiBold),
  Font(R.font.chakra_petch, FontWeight.Bold),
)

// Readable modern secondary sans-serif font
val SpaceGroteskFamily = FontFamily(
  Font(R.font.space_grotesk, FontWeight.Normal),
  Font(R.font.space_grotesk, FontWeight.Medium),
  Font(R.font.space_grotesk, FontWeight.Bold),
)

val ViceScriptTitleStyle = TextStyle(
  fontFamily = ViceScriptFamily,
  fontWeight = FontWeight.Normal,
  fontStyle = FontStyle.Italic,
  fontSize = 24.sp,
  lineHeight = 28.sp,
  letterSpacing = 0.6.sp,
)

val Typography = Typography(
  displayLarge = TextStyle(
    fontFamily = RussoOneFamily,
    fontWeight = FontWeight.Bold,
    fontStyle = FontStyle.Italic,
    fontSize = 44.sp,
    lineHeight = 48.sp,
    letterSpacing = 1.6.sp,
  ),
  displayMedium = TextStyle(
    fontFamily = RussoOneFamily,
    fontWeight = FontWeight.Bold,
    fontStyle = FontStyle.Italic,
    fontSize = 34.sp,
    lineHeight = 38.sp,
    letterSpacing = 1.2.sp,
  ),
  headlineMedium = TextStyle(
    fontFamily = RussoOneFamily,
    fontWeight = FontWeight.Bold,
    fontSize = 26.sp,
    lineHeight = 30.sp,
    letterSpacing = 1.0.sp,
  ),
  headlineSmall = TextStyle(
    fontFamily = RussoOneFamily,
    fontWeight = FontWeight.Normal,
    fontStyle = FontStyle.Italic,
    fontSize = 22.sp,
    lineHeight = 26.sp,
    letterSpacing = 0.8.sp,
  ),
  titleLarge = TextStyle(
    fontFamily = ChakraPetchFamily,
    fontWeight = FontWeight.Bold,
    fontSize = 20.sp,
    lineHeight = 25.sp,
    letterSpacing = 0.9.sp,
  ),
  titleMedium = TextStyle(
    fontFamily = ChakraPetchFamily,
    fontWeight = FontWeight.Bold,
    fontSize = 15.sp,
    lineHeight = 20.sp,
    letterSpacing = 0.8.sp,
  ),
  titleSmall = TextStyle(
    fontFamily = ChakraPetchFamily,
    fontWeight = FontWeight.SemiBold,
    fontSize = 13.sp,
    lineHeight = 18.sp,
    letterSpacing = 0.5.sp,
  ),
  bodyLarge = TextStyle(
    fontFamily = SpaceGroteskFamily,
    fontWeight = FontWeight.Normal,
    fontSize = 15.sp,
    lineHeight = 21.sp,
  ),
  bodyMedium = TextStyle(
    fontFamily = SpaceGroteskFamily,
    fontWeight = FontWeight.Normal,
    fontSize = 13.sp,
    lineHeight = 18.sp,
  ),
  bodySmall = TextStyle(
    fontFamily = SpaceGroteskFamily,
    fontWeight = FontWeight.Normal,
    fontSize = 12.sp,
    lineHeight = 16.sp,
  ),
  labelLarge = TextStyle(
    fontFamily = ChakraPetchFamily,
    fontWeight = FontWeight.Bold,
    fontSize = 14.sp,
    lineHeight = 18.sp,
    letterSpacing = 1.0.sp,
  ),
  labelMedium = TextStyle(
    fontFamily = SpaceGroteskFamily,
    fontWeight = FontWeight.Medium,
    fontSize = 12.sp,
    lineHeight = 16.sp,
    letterSpacing = 0.4.sp,
  ),
  labelSmall = TextStyle(
    fontFamily = SpaceGroteskFamily,
    fontWeight = FontWeight.Medium,
    fontSize = 10.sp,
    lineHeight = 14.sp,
    letterSpacing = 0.5.sp,
  ),
)
