package com.example.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FilterDrama
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.NightsStay
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.Thunderstorm
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.filled.WaterDrop
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.data.GeoMath
import com.example.data.VizagGameRepository
import com.example.model.GameTelemetry
import com.example.model.WeatherType
import com.example.ui.theme.LocalViceColors
import java.util.Locale
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.sin

@Composable
fun TopTacticalHud(
  telemetry: GameTelemetry,
  cashRupees: Int,
  bannerMessage: String?,
  onOpenMap: () -> Unit,
  onOpenMissions: () -> Unit,
  onOpenSettings: () -> Unit,
  onPause: () -> Unit,
  modifier: Modifier = Modifier,
) {
  val vice = LocalViceColors.current
  Column(
    modifier =
      modifier
        .fillMaxWidth()
        .windowInsetsPadding(WindowInsets.safeDrawing)
        .padding(horizontal = 14.dp, vertical = 8.dp),
    verticalArrangement = Arrangement.spacedBy(6.dp),
  ) {
    Row(
      modifier = Modifier.fillMaxWidth(),
      horizontalArrangement = Arrangement.SpaceBetween,
      verticalAlignment = Alignment.Top,
    ) {
      // Top-Left: Circular Vice Minimap + Location Name + Health & Stamina Indicators
      Row(
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.Top,
      ) {
        RadarMiniMapCard(
          telemetry = telemetry,
          onClick = onOpenMap,
        )

        Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
          // Location Name & Interior/Floor Display
          Surface(
            shape = RoundedCornerShape(10.dp),
            color = MaterialTheme.colorScheme.surface.copy(alpha = 0.86f),
            border = BorderStroke(1.dp, vice.neonCyan.copy(alpha = 0.65f)),
            modifier = Modifier.testTag("hud_location_badge"),
          ) {
            Column(modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)) {
              val locTitle =
                if (telemetry.interiorName.isNotBlank()) telemetry.interiorName.uppercase(Locale.US)
                else telemetry.districtName.uppercase(Locale.US)
              val locSub =
                if (telemetry.interiorName.isNotBlank() && telemetry.floorLabel.isNotBlank()) {
                  "${telemetry.floorLabel} • ${telemetry.districtName}"
                } else {
                  "${telemetry.activeChunks} chunks • ${telemetry.fps} FPS"
                }
              Text(
                text = locTitle,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
                color = vice.neonCyan,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
              )
              Text(
                text = locSub,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
              )
            }
          }

          // Health Indicator
          Surface(
            shape = RoundedCornerShape(10.dp),
            color = MaterialTheme.colorScheme.surface.copy(alpha = 0.86f),
            border = BorderStroke(1.dp, vice.neonPink.copy(alpha = 0.55f)),
            modifier = Modifier.testTag("hud_health_bar"),
          ) {
            Row(
              modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
              verticalAlignment = Alignment.CenterVertically,
              horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
              Icon(
                imageVector = Icons.Filled.Favorite,
                contentDescription = "Health",
                tint = if (telemetry.playerHealth > 35) vice.neonPink else MaterialTheme.colorScheme.error,
                modifier = Modifier.size(13.dp),
              )
              Box(
                modifier =
                  Modifier.width(74.dp)
                    .height(6.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.surfaceVariant)
              ) {
                Box(
                  modifier =
                    Modifier.fillMaxHeight()
                      .fillMaxWidth((telemetry.playerHealth / 100f).coerceIn(0f, 1f))
                      .background(
                        Brush.horizontalGradient(listOf(vice.neonPink, vice.sunsetOrange))
                      )
                )
              }
              Text(
                text = "${telemetry.playerHealth}%",
                style = MaterialTheme.typography.labelSmall,
                color = Color.White,
              )
            }
          }

          // Stamina Indicator
          Surface(
            shape = RoundedCornerShape(10.dp),
            color = MaterialTheme.colorScheme.surface.copy(alpha = 0.86f),
            border = BorderStroke(1.dp, vice.neonCyan.copy(alpha = 0.50f)),
            modifier = Modifier.testTag("hud_stamina_bar"),
          ) {
            Row(
              modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
              verticalAlignment = Alignment.CenterVertically,
              horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
              Icon(
                imageVector = Icons.Filled.Bolt,
                contentDescription = "Stamina",
                tint = vice.neonCyan,
                modifier = Modifier.size(13.dp),
              )
              Box(
                modifier =
                  Modifier.width(74.dp)
                    .height(6.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.surfaceVariant)
              ) {
                Box(
                  modifier =
                    Modifier.fillMaxHeight()
                      .fillMaxWidth((telemetry.playerStamina / 100f).coerceIn(0f, 1f))
                      .background(
                        Brush.horizontalGradient(listOf(vice.staminaTeal, vice.neonCyan))
                      )
                )
              }
              Text(
                text = "${telemetry.playerStamina}%",
                style = MaterialTheme.typography.labelSmall,
                color = Color.White,
              )
            }
          }
        }
      }

      Spacer(modifier = Modifier.width(8.dp))

      // Top-Right: Vice Cash & Vehicle Speedometer/Info, Time/Weather, Pause & Mission Objective
      Column(
        horizontalAlignment = Alignment.End,
        verticalArrangement = Arrangement.spacedBy(6.dp),
        modifier = Modifier.weight(1f, fill = false),
      ) {
        Row(
          horizontalArrangement = Arrangement.spacedBy(8.dp),
          verticalAlignment = Alignment.CenterVertically,
        ) {
          // Cash, Vehicle Speedometer & Vehicle Info Pill
          Surface(
            shape = RoundedCornerShape(12.dp),
            color = MaterialTheme.colorScheme.surface.copy(alpha = 0.86f),
            border = BorderStroke(1.dp, vice.staminaTeal.copy(alpha = 0.7f)),
            modifier = Modifier.testTag("hud_cash_badge"),
          ) {
            Row(
              modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
              horizontalArrangement = Arrangement.spacedBy(10.dp),
              verticalAlignment = Alignment.CenterVertically,
            ) {
              Text(
                text = "₹$cashRupees",
                style = MaterialTheme.typography.titleMedium,
                color = vice.staminaTeal,
              )
              if (telemetry.inVehicle || telemetry.speedKmh > 0) {
                Row(
                  verticalAlignment = Alignment.CenterVertically,
                  horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                  if (telemetry.vehicleName.isNotEmpty()) {
                    Icon(
                      imageVector = Icons.Filled.DirectionsCar,
                      contentDescription = null,
                      tint = vice.neonCyan,
                      modifier = Modifier.size(14.dp),
                    )
                    Text(
                      text = telemetry.vehicleName,
                      style = MaterialTheme.typography.labelSmall,
                      color = Color.White,
                      maxLines = 1,
                    )
                  }
                  Text(
                    text = "${telemetry.speedKmh} KM/H",
                    style = MaterialTheme.typography.labelLarge,
                    color = vice.neonPink,
                  )
                }
              }
              if (telemetry.inVehicle) {
                Row(
                  verticalAlignment = Alignment.CenterVertically,
                  horizontalArrangement = Arrangement.spacedBy(4.dp),
                  modifier = Modifier.testTag("hud_vehicle_condition"),
                ) {
                  Icon(
                    imageVector = Icons.Filled.Build,
                    contentDescription = null,
                    tint =
                      if (telemetry.vehicleCondition >= 50) vice.neonCyan
                      else MaterialTheme.colorScheme.error,
                    modifier = Modifier.size(14.dp),
                  )
                  Text(
                    text = "${telemetry.vehicleCondition}%",
                    style = MaterialTheme.typography.labelMedium,
                    color = Color.White,
                  )
                }
              }
            }
          }

          // Time & Weather Quick Settings Trigger
          val settingsDesc = stringResource(R.string.cd_quick_settings)
          Surface(
            shape = RoundedCornerShape(12.dp),
            color = MaterialTheme.colorScheme.surface.copy(alpha = 0.86f),
            border = BorderStroke(1.dp, vice.neonCyan.copy(alpha = 0.6f)),
            modifier =
              Modifier.minimumInteractiveComponentSize()
                .clickable(onClick = onOpenSettings)
                .semantics { contentDescription = settingsDesc }
                .testTag("hud_quick_settings_button"),
          ) {
            Row(
              modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
              horizontalArrangement = Arrangement.spacedBy(6.dp),
              verticalAlignment = Alignment.CenterVertically,
            ) {
              Icon(
                imageVector = weatherTimeIcon(telemetry.timeOfDay, telemetry.weather),
                contentDescription = null,
                tint = vice.sunsetOrange,
                modifier = Modifier.size(17.dp),
              )
              Text(
                text = formatClock24(telemetry.timeOfDay),
                style = MaterialTheme.typography.labelLarge,
                color = Color.White,
              )
              Icon(
                imageVector = Icons.Filled.Tune,
                contentDescription = null,
                tint = vice.neonCyan,
                modifier = Modifier.size(15.dp),
              )
            }
          }

          // Vice Pause Button
          val pauseDesc = stringResource(R.string.cd_pause)
          Surface(
            shape = RoundedCornerShape(12.dp),
            color = vice.neonPink.copy(alpha = 0.90f),
            border = BorderStroke(1.5.dp, vice.neonCyan),
            modifier =
              Modifier.minimumInteractiveComponentSize()
                .size(48.dp)
                .clickable(onClick = onPause)
                .semantics { contentDescription = pauseDesc }
                .testTag("pause_button"),
          ) {
            Box(contentAlignment = Alignment.Center) {
              Icon(
                imageVector = Icons.Filled.Pause,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(22.dp),
              )
            }
          }
        }

        // Active Mission Objective & GPS Distance Card
        val missionsDesc = stringResource(R.string.cd_missions)
        Surface(
          shape = RoundedCornerShape(12.dp),
          color = MaterialTheme.colorScheme.surface.copy(alpha = 0.86f),
          border = BorderStroke(1.dp, vice.neonPink.copy(alpha = 0.72f)),
          modifier =
            Modifier.widthIn(max = 290.dp)
              .minimumInteractiveComponentSize()
              .clickable(onClick = onOpenMissions)
              .semantics { contentDescription = missionsDesc }
              .testTag("mission_banner"),
        ) {
          Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
          ) {
            Icon(
              imageVector = Icons.Filled.Flag,
              contentDescription = null,
              tint = vice.neonPink,
              modifier = Modifier.size(17.dp),
            )
            Column(modifier = Modifier.weight(1f, fill = false)) {
              Text(
                text = telemetry.waypointLabel,
                style = MaterialTheme.typography.labelLarge,
                color = Color.White,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
              )
              Text(
                text = "${telemetry.waypointDistanceMeters}m • Story & Objectives",
                style = MaterialTheme.typography.labelSmall,
                color = vice.neonCyan,
              )
            }
          }
        }
      }
    }

    // Dynamic Mission / Interaction Prompt / System Notification Banner
    val activeBanner =
      bannerMessage
        ?: telemetry.interactHint.takeIf { it.isNotBlank() }?.let { "INTERACT • $it" }

    AnimatedVisibility(
      visible = activeBanner != null,
      enter = fadeIn(),
      exit = fadeOut(),
      modifier = Modifier.align(Alignment.CenterHorizontally),
    ) {
      Surface(
        shape = CircleShape,
        color = vice.deepPlum.copy(alpha = 0.94f),
        border =
          BorderStroke(
            1.5.dp,
            Brush.horizontalGradient(listOf(vice.neonPink, vice.neonCyan)),
          ),
      ) {
        Text(
          text = activeBanner.orEmpty(),
          style = MaterialTheme.typography.labelLarge,
          color = Color.White,
          modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp),
        )
      }
    }
  }
}

@Composable
private fun RadarMiniMapCard(
  telemetry: GameTelemetry,
  onClick: () -> Unit,
) {
  val vice = LocalViceColors.current
  val mapDesc = stringResource(R.string.cd_minimap)
  val seaColor = vice.neonCyan.copy(alpha = 0.28f)
  val landColor = vice.deepPlum.copy(alpha = 0.92f)
  val roadColor = Color.White.copy(alpha = 0.45f)
  val beaconColor = vice.neonPink
  val landmarkColor = vice.sunsetOrange
  val playerColor = vice.staminaTeal

  Box(
    modifier =
      Modifier.size(90.dp)
        .clip(CircleShape)
        .background(landColor)
        .border(
          2.2.dp,
          Brush.sweepGradient(listOf(vice.neonPink, vice.neonCyan, vice.sunsetOrange, vice.neonPink)),
          CircleShape,
        )
        .clickable(onClick = onClick)
        .semantics { contentDescription = mapDesc }
        .testTag("minimap_button")
  ) {
    Canvas(modifier = Modifier.fillMaxSize()) {
      val center = Offset(size.width / 2f, size.height / 2f)
      val scale = 0.20f

      // Conformal Bay of Bengal Ocean polygon East of COASTLINE_WORLD
      val coastPts = VizagGameRepository.COASTLINE_WORLD
      if (coastPts.size >= 2) {
        val seaPoly =
          Path().apply {
            val firstX = center.x + (coastPts.first().first - telemetry.playerX) * scale
            val firstY = center.y + (coastPts.first().second - telemetry.playerZ) * scale
            moveTo(size.width * 3f, size.height * 3f)
            lineTo(firstX, size.height * 3f)
            lineTo(firstX, firstY)
            for (i in 1 until coastPts.size) {
              val sx = center.x + (coastPts[i].first - telemetry.playerX) * scale
              val sy = center.y + (coastPts[i].second - telemetry.playerZ) * scale
              lineTo(sx, sy)
            }
            val lastX = center.x + (coastPts.last().first - telemetry.playerX) * scale
            lineTo(lastX, -size.height * 2f)
            lineTo(size.width * 3f, -size.height * 2f)
            close()
          }
        drawPath(path = seaPoly, color = seaColor)
      }

      // Projected road segments in radar window
      for ((p1, p2, _) in VizagGameRepository.MAP_ROAD_PAIRS_WORLD) {
        val sx1 = center.x + (p1.first - telemetry.playerX) * scale
        val sy1 = center.y + (p1.second - telemetry.playerZ) * scale
        val sx2 = center.x + (p2.first - telemetry.playerX) * scale
        val sy2 = center.y + (p2.second - telemetry.playerZ) * scale
        drawLine(
          color = roadColor,
          start = Offset(sx1, sy1),
          end = Offset(sx2, sy2),
          strokeWidth = 2.dp.toPx(),
        )
      }

      // Connected Road-Graph GPS Route Polyline inside Radar
      if (telemetry.navRoute.size >= 2) {
        val routePath =
          Path().apply {
            telemetry.navRoute.forEachIndexed { idx, pt ->
              val sx = center.x + (pt.x - telemetry.playerX) * scale
              val sy = center.y + (pt.z - telemetry.playerZ) * scale
              if (idx == 0) moveTo(sx, sy) else lineTo(sx, sy)
            }
          }
        drawPath(
          path = routePath,
          color = vice.neonCyan.copy(alpha = 0.85f),
          style = androidx.compose.ui.graphics.drawscope.Stroke(width = 2.2.dp.toPx()),
        )
      }

      // Key Vizag landmark dots clamped to radar rim (RK Beach, Kailasagiri, Dolphin's Nose, Yarada)
      listOf(
        GeoMath.latLngToWorld(17.7142, 83.3236),
        GeoMath.latLngToWorld(17.7492, 83.3422),
        GeoMath.latLngToWorld(17.6775, 83.2948),
        GeoMath.latLngToWorld(17.6548, 83.2712),
      ).forEach { (lx, lz) ->
        val dx = (lx - telemetry.playerX) * scale
        val dy = (lz - telemetry.playerZ) * scale
        val maxRim = size.minDimension * 0.42f
        val d = hypot(dx, dy)
        val pt =
          if (d > maxRim) Offset(center.x + dx / d * maxRim, center.y + dy / d * maxRim)
          else Offset(center.x + dx, center.y + dy)
        drawCircle(color = landmarkColor, radius = 3.2.dp.toPx(), center = pt)
      }

      // Active Waypoint Beacon clamped to radar rim
      val rawWpX = (telemetry.waypointX - telemetry.playerX) * scale
      val rawWpY = (telemetry.waypointZ - telemetry.playerZ) * scale
      val maxRim = size.minDimension * 0.40f
      val wpDist = hypot(rawWpX, rawWpY)
      val clampedWp =
        if (wpDist > maxRim) {
          Offset(center.x + rawWpX / wpDist * maxRim, center.y + rawWpY / wpDist * maxRim)
        } else {
          Offset(center.x + rawWpX, center.y + rawWpY)
        }
      drawCircle(color = beaconColor, radius = 4.5.dp.toPx(), center = clampedWp)

      // Player heading cone
      val dirX = sin(telemetry.playerYaw)
      val dirY = cos(telemetry.playerYaw)
      val tip = Offset(center.x + dirX * 8.dp.toPx(), center.y + dirY * 8.dp.toPx())
      val left =
        Offset(
          center.x - dirY * 5.dp.toPx() - dirX * 4.dp.toPx(),
          center.y + dirX * 5.dp.toPx() - dirY * 4.dp.toPx(),
        )
      val right =
        Offset(
          center.x + dirY * 5.dp.toPx() - dirX * 4.dp.toPx(),
          center.y - dirX * 5.dp.toPx() - dirY * 4.dp.toPx(),
        )
      val tri =
        Path().apply {
          moveTo(tip.x, tip.y)
          lineTo(left.x, left.y)
          lineTo(right.x, right.y)
          close()
        }
      drawPath(path = tri, color = playerColor)
    }

    Text(
      text = "N",
      style = MaterialTheme.typography.labelSmall,
      fontWeight = FontWeight.Bold,
      color = vice.neonCyan,
      modifier = Modifier.align(Alignment.TopCenter).padding(top = 4.dp),
    )
  }
}

fun formatClock24(hourFloat: Float): String {
  val totalMinutes = ((hourFloat.coerceIn(0f, 23.99f)) * 60).toInt()
  val h = (totalMinutes / 60) % 24
  val m = totalMinutes % 60
  return String.format(Locale.US, "%02d:%02d", h, m)
}

private fun weatherTimeIcon(hour: Float, weather: WeatherType) =
  when (weather) {
    WeatherType.RAIN -> Icons.Filled.WaterDrop
    WeatherType.STORMY -> Icons.Filled.Thunderstorm
    WeatherType.FOG -> Icons.Filled.Cloud
    WeatherType.CLOUDY -> Icons.Filled.FilterDrama
    WeatherType.CLEAR_NIGHT -> Icons.Filled.NightsStay
    WeatherType.SUNNY -> if (hour < 6f || hour > 18.5f) Icons.Filled.NightsStay else Icons.Filled.WbSunny
  }
