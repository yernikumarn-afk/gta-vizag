package com.example.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

@Immutable
data class ViceNeonExtendedColors(
  val neonPink: Color = ViceNeonPink,
  val hotMagenta: Color = ViceHotMagenta,
  val electricPurple: Color = ViceElectricPurple,
  val neonCyan: Color = ViceNeonCyan,
  val sunsetOrange: Color = ViceSunsetOrange,
  val sunsetGold: Color = ViceSunsetGold,
  val staminaTeal: Color = ViceStaminaTeal,
  val deepPlum: Color = VicePlumSurface,
  val twilightIndigo: Color = ViceTwilightIndigo,
)

val LocalViceColors = staticCompositionLocalOf { ViceNeonExtendedColors() }

private val VizagDarkColorScheme = darkColorScheme(
  primary = ViceNeonPink,
  onPrimary = ViceCrispWhite,
  primaryContainer = ViceDeepCard,
  onPrimaryContainer = ViceNeonCyan,
  secondary = ViceNeonCyan,
  onSecondary = ViceTwilightIndigo,
  secondaryContainer = ViceCyanContainer,
  onSecondaryContainer = ViceCrispWhite,
  tertiary = ViceStaminaTeal,
  onTertiary = ViceTwilightIndigo,
  tertiaryContainer = ViceElectricPurple,
  onTertiaryContainer = ViceCrispWhite,
  error = ViceCrimson,
  onError = ViceCrispWhite,
  background = ViceTwilightIndigo,
  onBackground = ViceCrispWhite,
  surface = VicePlumSurface,
  onSurface = ViceCrispWhite,
  surfaceVariant = ViceDeepCard,
  onSurfaceVariant = ViceSoftLavender,
  outline = ViceOutlineViolet,
)

private val VizagLightColorScheme = lightColorScheme(
  primary = LightPrimary,
  onPrimary = Color.White,
  secondary = LightSecondary,
  onSecondary = Color.White,
  tertiary = LightTertiary,
  onTertiary = Color.White,
  background = LightBackground,
  onBackground = ViceTwilightIndigo,
  surface = LightSurface,
  onSurface = ViceTwilightIndigo,
)

val VizagShapes = Shapes(
  extraSmall = RoundedCornerShape(6.dp),
  small = RoundedCornerShape(10.dp),
  medium = RoundedCornerShape(14.dp),
  large = RoundedCornerShape(20.dp),
  extraLarge = RoundedCornerShape(28.dp),
)

@Composable
fun VizagCityTheme(
  darkTheme: Boolean = true,
  content: @Composable () -> Unit,
) {
  val colorScheme = if (darkTheme) VizagDarkColorScheme else VizagLightColorScheme
  CompositionLocalProvider(LocalViceColors provides ViceNeonExtendedColors()) {
    MaterialTheme(
      colorScheme = colorScheme,
      typography = Typography,
      shapes = VizagShapes,
      content = content,
    )
  }
}

@Composable
fun MyApplicationTheme(
  darkTheme: Boolean = true,
  dynamicColor: Boolean = false,
  content: @Composable () -> Unit,
) {
  VizagCityTheme(darkTheme = darkTheme, content = content)
}
