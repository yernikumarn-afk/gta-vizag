package com.example.ui.components

import androidx.annotation.DrawableRes
import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.ui.theme.LocalViceColors
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin
import kotlin.random.Random
import kotlinx.coroutines.delay

data class VizagBackdropScene(
  @DrawableRes val drawableRes: Int,
  val locationTitle: String,
  val subtitle: String,
)

private val VIZAG_SCENES =
  listOf(
    VizagBackdropScene(
      R.drawable.vizag_rk_beach_sunset_1795108043420,
      "RK BEACH SUNSET",
      "INS Kursura Promenade",
    ),
    VizagBackdropScene(
      R.drawable.img_vizag_hero_1793385953980,
      "VIZAG BEACH ROAD",
      "Coastal Palms Boulevard",
    ),
    VizagBackdropScene(
      R.drawable.vizag_kailasagiri_vista_1795108043446,
      "KAILASAGIRI PANORAMA",
      "Hilltop Overlook & Bay Curve",
    ),
    VizagBackdropScene(
      R.drawable.vizag_rushikonda_bay_1795108043350,
      "RUSHIKONDA BEACH",
      "Golden Cove & Coastal Highway",
    ),
    VizagBackdropScene(
      R.drawable.vizag_yarada_cliffs_1795108043766,
      "YARADA BEACH COVE",
      "Dolphin's Nose & Bay Surf",
    ),
    VizagBackdropScene(
      R.drawable.vizag_night_skyline_1795108043795,
      "VIZAG NIGHT SKYLINE",
      "Neon Wet-Asphalt Beach Road",
    ),
    VizagBackdropScene(
      R.drawable.vizag_port_harbor_1795108043797,
      "VISAKHAPATNAM PORT",
      "Harbor Gantries & Twilight Bay",
    ),
    VizagBackdropScene(
      R.drawable.img_vizag_menu_bg_1793387977801,
      "EASTERN GHATS COAST",
      "Bay of Bengal Horizon",
    ),
  )

@Composable
fun VizagAnimatedBackdrop(
  modifier: Modifier = Modifier,
  scrimAlpha: Float = 0.78f,
  showScenicBadge: Boolean = true,
  showPalms: Boolean = true,
) {
  val vice = LocalViceColors.current
  val initialScene = remember { Random.nextInt(VIZAG_SCENES.size) }
  var currentIndex by remember { mutableIntStateOf(initialScene) }

  LaunchedEffect(Unit) {
    while (true) {
      delay(8000L)
      currentIndex = (currentIndex + 1) % VIZAG_SCENES.size
    }
  }

  val infiniteTransition = rememberInfiniteTransition(label = "vizagBackdropMotion")
  val kenBurnsScale by
    infiniteTransition.animateFloat(
      initialValue = 1.03f,
      targetValue = 1.11f,
      animationSpec =
        infiniteRepeatable(
          animation = tween(durationMillis = 15000, easing = FastOutSlowInEasing),
          repeatMode = RepeatMode.Reverse,
        ),
      label = "kenBurnsScale",
    )
  val parallaxX by
    infiniteTransition.animateFloat(
      initialValue = -14f,
      targetValue = 14f,
      animationSpec =
        infiniteRepeatable(
          animation = tween(durationMillis = 18000, easing = FastOutSlowInEasing),
          repeatMode = RepeatMode.Reverse,
        ),
      label = "parallaxX",
    )
  val neonPulse by
    infiniteTransition.animateFloat(
      initialValue = 0.28f,
      targetValue = 0.56f,
      animationSpec =
        infiniteRepeatable(
          animation = tween(durationMillis = 4200, easing = FastOutSlowInEasing),
          repeatMode = RepeatMode.Reverse,
        ),
      label = "neonPulse",
    )

  val activeScene = VIZAG_SCENES[currentIndex]

  Box(modifier = modifier.fillMaxSize()) {
    // 1. Crossfading 16:9 Vizag authentic landscape photography with subtle zoom & parallax
    Crossfade(
      targetState = activeScene,
      animationSpec = tween(durationMillis = 1300),
      label = "vizagSceneCrossfade",
      modifier = Modifier.fillMaxSize(),
    ) { scene ->
      Image(
        painter = painterResource(id = scene.drawableRes),
        contentDescription = scene.locationTitle,
        contentScale = ContentScale.Crop,
        modifier =
          Modifier.fillMaxSize().graphicsLayer {
            scaleX = kenBurnsScale
            scaleY = kenBurnsScale
            translationX = parallaxX
          },
      )
    }

    // 2. Dark Vice twilight purple/indigo gradient scrim to ensure clean UI legibility
    Box(
      modifier =
        Modifier.fillMaxSize()
          .background(
            Brush.horizontalGradient(
              colors =
                listOf(
                  vice.twilightIndigo.copy(alpha = (scrimAlpha + 0.14f).coerceAtMost(0.96f)),
                  vice.deepPlum.copy(alpha = scrimAlpha),
                  vice.twilightIndigo.copy(alpha = (scrimAlpha - 0.08f).coerceAtLeast(0.55f)),
                )
            )
          )
    )

    // 3. Subtle 1980s neon sunset-pink / cyan atmosphere wash along horizon corners
    Box(
      modifier =
        Modifier.fillMaxSize()
          .background(
            Brush.verticalGradient(
              colors =
                listOf(
                  vice.neonPink.copy(alpha = neonPulse * 0.22f),
                  Color.Transparent,
                  vice.neonCyan.copy(alpha = neonPulse * 0.16f),
                )
            )
          )
    )

    // 4. Layered Retro Palm-Tree Silhouettes & Horizon Glow Line
    if (showPalms) {
      Canvas(modifier = Modifier.fillMaxSize()) {
        val w = size.width
        val h = size.height
        val silhouetteColor = vice.twilightIndigo.copy(alpha = 0.62f)

        // Left-side tall coastal palm silhouette
        drawVicePalm(
          base = Offset(w * 0.04f, h),
          top = Offset(w * 0.11f, h * 0.42f),
          frondRadius = h * 0.20f,
          color = silhouetteColor,
        )
        // Right-side framing palm silhouette
        drawVicePalm(
          base = Offset(w * 0.96f, h),
          top = Offset(w * 0.89f, h * 0.46f),
          frondRadius = h * 0.18f,
          color = silhouetteColor,
        )

        // Subtle glowing retro cyan horizon accent line at bottom
        drawLine(
          brush =
            Brush.horizontalGradient(
              colors = listOf(vice.neonPink, vice.sunsetOrange, vice.neonCyan)
            ),
          start = Offset(0f, h - 2.dp.toPx()),
          end = Offset(w, h - 2.dp.toPx()),
          strokeWidth = 2.5.dp.toPx(),
        )
      }
    }

    // 5. Rotating Vizag Location Showcase Tag (top-center-right / non-obstructive)
    if (showScenicBadge) {
      Surface(
        shape = RoundedCornerShape(999.dp),
        color = vice.twilightIndigo.copy(alpha = 0.72f),
        border = BorderStroke(1.dp, vice.neonCyan.copy(alpha = 0.55f)),
        modifier = Modifier.align(Alignment.TopEnd).padding(top = 12.dp, end = 20.dp),
      ) {
        Row(
          modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp),
          verticalAlignment = Alignment.CenterVertically,
          horizontalArrangement = Arrangement.spacedBy(7.dp),
        ) {
          Box(
            modifier =
              Modifier.size(7.dp).clip(CircleShape).background(vice.neonPink)
          )
          Text(
            text = "${activeScene.locationTitle} • ${activeScene.subtitle}",
            style = MaterialTheme.typography.labelSmall,
            color = vice.neonCyan,
          )
        }
      }
    }
  }
}

private fun androidx.compose.ui.graphics.drawscope.DrawScope.drawVicePalm(
  base: Offset,
  top: Offset,
  frondRadius: Float,
  color: Color,
) {
  val trunkPath =
    Path().apply {
      moveTo(base.x - 10.dp.toPx(), base.y)
      quadraticTo(
        (base.x + top.x) * 0.5f - 6.dp.toPx(),
        (base.y + top.y) * 0.48f,
        top.x - 2.5.dp.toPx(),
        top.y,
      )
      lineTo(top.x + 2.5.dp.toPx(), top.y)
      quadraticTo(
        (base.x + top.x) * 0.5f + 8.dp.toPx(),
        (base.y + top.y) * 0.50f,
        base.x + 12.dp.toPx(),
        base.y,
      )
      close()
    }
  drawPath(path = trunkPath, color = color)

  val frondAnglesDeg = listOf(-160f, -125f, -85f, -35f, 10f, 38f, 145f)
  frondAnglesDeg.forEach { deg ->
    val rad = (deg * PI / 180.0).toFloat()
    val endX = top.x + cos(rad) * frondRadius
    val endY = top.y + sin(rad) * frondRadius * 0.72f + frondRadius * 0.24f
    val ctrlX = top.x + cos(rad) * frondRadius * 0.55f
    val ctrlY = top.y + sin(rad) * frondRadius * 0.55f - frondRadius * 0.18f

    val frond =
      Path().apply {
        moveTo(top.x, top.y)
        quadraticTo(ctrlX, ctrlY, endX, endY)
      }
    drawPath(
      path = frond,
      color = color,
      style = androidx.compose.ui.graphics.drawscope.Stroke(
        width = 7.dp.toPx(),
        cap = StrokeCap.Round,
      ),
    )
  }
}
