package com.example.ui.overlays

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
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
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CenterFocusStrong
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Layers
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.NearMe
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.data.GeoMath
import com.example.data.VizagGameRepository
import com.example.model.GameTelemetry
import com.example.model.GisPoiItem
import com.example.model.VizagDistrict
import com.example.ui.theme.LocalViceColors
import java.util.Locale
import kotlin.math.hypot

@Composable
fun VizagMapOverlay(
  telemetry: GameTelemetry,
  districts: List<VizagDistrict>,
  pois: List<GisPoiItem>,
  onSetWaypoint: (VizagDistrict) -> Unit,
  onFastTravel: (VizagDistrict) -> Unit,
  onOpenGisLayers: () -> Unit,
  onClose: () -> Unit,
  modifier: Modifier = Modifier,
) {
  BackHandler(onBack = onClose)

  var selectedDistrict by remember {
    mutableStateOf(
      districts.firstOrNull { it.name.equals(telemetry.districtName, ignoreCase = true) }
        ?: districts.first()
    )
  }
  var mapZoom by remember { mutableFloatStateOf(1f) }
  var panOffset by remember { mutableStateOf(Offset.Zero) }

  Surface(
    modifier = modifier.fillMaxSize(),
    color = MaterialTheme.colorScheme.background.copy(alpha = 0.96f),
  ) {
    Column(
      modifier =
        Modifier.fillMaxSize()
          .windowInsetsPadding(WindowInsets.safeDrawing)
          .padding(horizontal = 16.dp, vertical = 10.dp),
      verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
      // Landscape Header Bar
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
      ) {
        Column {
          Text(
            text = "VISAKHAPATNAM 16-REGION SATELLITE & STREAMING MAP",
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.primary,
          )
          Text(
            text =
              String.format(
                Locale.US,
                "GPS %.4f°N, %.4f°E • %d Active Chunks • Zoom %.1fx",
                telemetry.latitude,
                telemetry.longitude,
                telemetry.activeChunks,
                mapZoom,
              ),
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.secondary,
          )
        }

        Row(
          horizontalArrangement = Arrangement.spacedBy(8.dp),
          verticalAlignment = Alignment.CenterVertically,
        ) {
          OutlinedButton(
            onClick = onOpenGisLayers,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.secondary),
            modifier = Modifier.height(48.dp).testTag("open_gis_layers_from_map"),
          ) {
            Icon(
              imageVector = Icons.Filled.Layers,
              contentDescription = null,
              tint = MaterialTheme.colorScheme.secondary,
              modifier = Modifier.size(18.dp),
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
              text = stringResource(R.string.btn_gis_layers_short),
              style = MaterialTheme.typography.labelLarge,
              color = MaterialTheme.colorScheme.secondary,
            )
          }

          IconButton(
            onClick = onClose,
            modifier = Modifier.size(48.dp).testTag("close_map_button"),
          ) {
            Icon(
              imageVector = Icons.Filled.Close,
              contentDescription = stringResource(R.string.btn_close),
              tint = MaterialTheme.colorScheme.onSurface,
            )
          }
        }
      }

      // Landscape Two-Pane Map + Region Inspector & Directory
      Row(
        modifier = Modifier.fillMaxSize(),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
      ) {
        InteractiveVizagCanvasMap(
          telemetry = telemetry,
          districts = districts,
          pois = pois,
          selected = selectedDistrict,
          zoom = mapZoom,
          panOffset = panOffset,
          onZoomChanged = { nextZoom ->
            mapZoom = nextZoom.coerceIn(1f, 3.2f)
            if (mapZoom <= 1.02f) panOffset = Offset.Zero
          },
          onPanChanged = { delta ->
            if (mapZoom > 1f) {
              val maxPan = 260f * mapZoom
              panOffset =
                Offset(
                  (panOffset.x + delta.x).coerceIn(-maxPan, maxPan),
                  (panOffset.y + delta.y).coerceIn(-maxPan, maxPan),
                )
            }
          },
          onResetView = {
            mapZoom = 1f
            panOffset = Offset.Zero
          },
          onSelectDistrict = { selectedDistrict = it },
          modifier = Modifier.weight(1.25f).fillMaxHeight(),
        )

        DistrictDirectoryAndActions(
          districts = districts,
          selected = selectedDistrict,
          onSelect = { selectedDistrict = it },
          onSetWaypoint = onSetWaypoint,
          onFastTravel = onFastTravel,
          modifier = Modifier.weight(1f).fillMaxHeight(),
        )
      }
    }
  }
}

@Composable
private fun InteractiveVizagCanvasMap(
  telemetry: GameTelemetry,
  districts: List<VizagDistrict>,
  pois: List<GisPoiItem>,
  selected: VizagDistrict,
  zoom: Float,
  panOffset: Offset,
  onZoomChanged: (Float) -> Unit,
  onPanChanged: (Offset) -> Unit,
  onResetView: () -> Unit,
  onSelectDistrict: (VizagDistrict) -> Unit,
  modifier: Modifier = Modifier,
) {
  // Authoritative Conformal WGS84 Metro Bounds matching GeoProjection.js
  val minWorldX = GeoMath.MIN_WORLD_X
  val maxWorldX = GeoMath.MAX_WORLD_X
  val minWorldZ = GeoMath.MIN_WORLD_Z
  val maxWorldZ = GeoMath.MAX_WORLD_Z

  val oceanCol = MaterialTheme.colorScheme.secondary.copy(alpha = 0.28f)
  val coastStrokeCol = MaterialTheme.colorScheme.secondary.copy(alpha = 0.85f)
  val landCol = MaterialTheme.colorScheme.surfaceVariant
  val roadCol = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.42f)
  val chunkCol = MaterialTheme.colorScheme.tertiary.copy(alpha = 0.72f)
  val pinCol = MaterialTheme.colorScheme.onSurface
  val selectedPinCol = MaterialTheme.colorScheme.primary
  val playerCol = MaterialTheme.colorScheme.tertiary
  val routeCol = MaterialTheme.colorScheme.secondary.copy(alpha = 0.88f)
  val poiCol = LocalViceColors.current.sunsetGold

  fun mapToScreen(wx: Float, wz: Float, w: Float, h: Float): Offset {
    val normX = (wx - minWorldX) / (maxWorldX - minWorldX)
    val normY = (wz - minWorldZ) / (maxWorldZ - minWorldZ)
    val cx = w * 0.5f
    val cy = h * 0.5f
    val sx = cx + (normX * w - cx) * zoom + panOffset.x
    val sy = cy + (normY * h - cy) * zoom + panOffset.y
    return Offset(sx, sy)
  }

  Box(
    modifier =
      modifier
        .clip(RoundedCornerShape(18.dp))
        .background(landCol)
        .border(1.5.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(18.dp))
        .testTag("interactive_city_map")
        .pointerInput(districts, zoom, panOffset) {
          detectTapGestures { tapOffset ->
            val w = size.width.toFloat()
            val h = size.height.toFloat()
            var closest: VizagDistrict? = null
            var bestDist = 48.dp.toPx()
            for (d in districts) {
              val pt = mapToScreen(d.worldX, d.worldZ, w, h)
              val dist = hypot(tapOffset.x - pt.x, tapOffset.y - pt.y)
              if (dist < bestDist) {
                bestDist = dist
                closest = d
              }
            }
            if (closest != null) {
              onSelectDistrict(closest)
            }
          }
        }
        .pointerInput(zoom) {
          detectDragGestures { change, dragAmount ->
            change.consume()
            onPanChanged(dragAmount)
          }
        }
  ) {
    Canvas(modifier = Modifier.fillMaxSize()) {
      fun toScreen(wx: Float, wz: Float): Offset = mapToScreen(wx, wz, size.width, size.height)

      // 1. Bay of Bengal Ocean Region (+X East of conformal 21-point Dolphin's Nose -> Bheemili coastline)
      val coastPts = VizagGameRepository.COASTLINE_WORLD
      if (coastPts.size >= 2) {
        val oceanPoly =
          Path().apply {
            val first = toScreen(coastPts.first().first, coastPts.first().second)
            moveTo(size.width * 2f, size.height * 2f)
            lineTo(first.x, size.height * 2f)
            lineTo(first.x, first.y)
            for (i in 1 until coastPts.size) {
              val pt = toScreen(coastPts[i].first, coastPts[i].second)
              lineTo(pt.x, pt.y)
            }
            val last = toScreen(coastPts.last().first, coastPts.last().second)
            lineTo(last.x, -size.height)
            lineTo(size.width * 2f, -size.height)
            close()
          }
        drawPath(path = oceanPoly, color = oceanCol)

        // Port Inner Entrance Channel Water Inlet
        val portChan = VizagGameRepository.PORT_CHANNEL_WORLD
        if (portChan.size >= 3) {
          val chanPath =
            Path().apply {
              portChan.forEachIndexed { i, (wx, wz) ->
                val p = toScreen(wx, wz)
                if (i == 0) moveTo(p.x, p.y) else lineTo(p.x, p.y)
              }
              close()
            }
          drawPath(path = chanPath, color = oceanCol)
        }

        // Sharp Cyan Coastline Boundary Stroke
        val coastLine =
          Path().apply {
            coastPts.forEachIndexed { i, (wx, wz) ->
              val p = toScreen(wx, wz)
              if (i == 0) moveTo(p.x, p.y) else lineTo(p.x, p.y)
            }
          }
        drawPath(path = coastLine, color = coastStrokeCol, style = Stroke(width = 2.dp.toPx()))
      }

      // 2. Projected Authentic Visakhapatnam Road & Highway Network across all 16 Regions
      for ((p1, p2, strokeDp) in VizagGameRepository.MAP_ROAD_PAIRS_WORLD) {
        drawLine(
          color = roadCol,
          start = toScreen(p1.first, p1.second),
          end = toScreen(p2.first, p2.second),
          strokeWidth = strokeDp.dp.toPx(),
        )
      }

      // 3. Active Spatial Chunk Streaming Window around Player
      val chunkTopLeft = toScreen(telemetry.playerX - 210f, telemetry.playerZ - 210f)
      val chunkBotRight = toScreen(telemetry.playerX + 210f, telemetry.playerZ + 210f)
      drawRect(
        color = chunkCol,
        topLeft = chunkTopLeft,
        size = Size(chunkBotRight.x - chunkTopLeft.x, chunkBotRight.y - chunkTopLeft.y),
        style =
          Stroke(
            width = 1.6.dp.toPx(),
            pathEffect = PathEffect.dashPathEffect(floatArrayOf(8f, 6f), 0f),
          ),
      )

      // 4. Connected Road-Graph GPS Navigation Route + Direct Target Indicator
      val playerPos = toScreen(telemetry.playerX, telemetry.playerZ)
      val selectedPos = toScreen(selected.worldX, selected.worldZ)
      if (telemetry.navRoute.size >= 2) {
        val navPath =
          Path().apply {
            telemetry.navRoute.forEachIndexed { idx, pt ->
              val sp = toScreen(pt.x, pt.z)
              if (idx == 0) moveTo(sp.x, sp.y) else lineTo(sp.x, sp.y)
            }
          }
        drawPath(
          path = navPath,
          color = routeCol,
          style = Stroke(width = 2.6.dp.toPx()),
        )
      }
      drawLine(
        color = selectedPinCol.copy(alpha = 0.72f),
        start = playerPos,
        end = selectedPos,
        strokeWidth = 1.8.dp.toPx(),
        pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 8f), 0f),
      )

      // Enterable Buildings Markers (small teal squares)
      VizagGameRepository.ENTERABLE_COORDS_WORLD.forEach { (bx, bz) ->
        val bp = toScreen(bx, bz)
        drawRect(
          color = playerCol.copy(alpha = 0.85f),
          topLeft = Offset(bp.x - 3.dp.toPx(), bp.y - 3.dp.toPx()),
          size = Size(6.dp.toPx(), 6.dp.toPx()),
        )
      }

      // GIS POI Markers (golden dots)
      for (poi in pois) {
        val pp = toScreen(poi.x, poi.z)
        drawCircle(color = poiCol.copy(alpha = 0.88f), radius = 3.2.dp.toPx(), center = pp)
      }

      // 5. All 16 Visakhapatnam Region Pins
      for (d in districts) {
        val pt = toScreen(d.worldX, d.worldZ)
        val isSel = d.id == selected.id
        if (isSel) {
          drawCircle(
            color = selectedPinCol.copy(alpha = 0.28f),
            radius = 13.dp.toPx(),
            center = pt,
          )
        }
        drawCircle(
          color = if (isSel) selectedPinCol else pinCol,
          radius = if (isSel) 6.5.dp.toPx() else 4.5.dp.toPx(),
          center = pt,
        )
      }

      // 6. Live Player Position Marker
      drawCircle(color = playerCol, radius = 6.dp.toPx(), center = playerPos)
    }

    Text(
      text = "N ↑  •  BAY OF BENGAL (EAST)",
      style = MaterialTheme.typography.labelSmall,
      color = MaterialTheme.colorScheme.secondary,
      modifier = Modifier.align(Alignment.TopStart).padding(10.dp),
    )

    // Interactive Map Zoom Controls (+ / - / Reset)
    Column(
      modifier = Modifier.align(Alignment.TopEnd).padding(10.dp),
      verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
      Surface(
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.90f),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
      ) {
        IconButton(
          onClick = { onZoomChanged(zoom + 0.45f) },
          modifier = Modifier.size(48.dp).testTag("map_zoom_in"),
        ) {
          Icon(
            imageVector = Icons.Filled.Add,
            contentDescription = stringResource(R.string.cd_zoom_in),
            tint = MaterialTheme.colorScheme.primary,
          )
        }
      }

      Surface(
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.90f),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
      ) {
        IconButton(
          onClick = { onZoomChanged(zoom - 0.45f) },
          modifier = Modifier.size(48.dp).testTag("map_zoom_out"),
        ) {
          Icon(
            imageVector = Icons.Filled.Remove,
            contentDescription = stringResource(R.string.cd_zoom_out),
            tint = MaterialTheme.colorScheme.onSurface,
          )
        }
      }

      Surface(
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.90f),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
      ) {
        IconButton(
          onClick = onResetView,
          modifier = Modifier.size(48.dp).testTag("map_zoom_reset"),
        ) {
          Icon(
            imageVector = Icons.Filled.CenterFocusStrong,
            contentDescription = stringResource(R.string.cd_zoom_reset),
            tint = MaterialTheme.colorScheme.secondary,
          )
        }
      }
    }

    Text(
      text = "Dashed Green Box = Active Streamed Chunks • Drag when zoomed",
      style = MaterialTheme.typography.labelSmall,
      color = MaterialTheme.colorScheme.tertiary,
      modifier = Modifier.align(Alignment.BottomStart).padding(10.dp),
    )
  }
}

@Composable
private fun DistrictDirectoryAndActions(
  districts: List<VizagDistrict>,
  selected: VizagDistrict,
  onSelect: (VizagDistrict) -> Unit,
  onSetWaypoint: (VizagDistrict) -> Unit,
  onFastTravel: (VizagDistrict) -> Unit,
  modifier: Modifier = Modifier,
) {
  LazyColumn(
    modifier = modifier,
    verticalArrangement = Arrangement.spacedBy(8.dp),
  ) {
    item(key = "selected_inspector") {
      Surface(
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary),
        modifier = Modifier.fillMaxWidth(),
      ) {
        Column(
          modifier = Modifier.padding(12.dp),
          verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
          ) {
            Text(
              text = selected.name,
              style = MaterialTheme.typography.titleLarge,
              color = MaterialTheme.colorScheme.primary,
            )
            Text(
              text = "${selected.category} • +${selected.elevationMeters.toInt()}m",
              style = MaterialTheme.typography.labelSmall,
              color = MaterialTheme.colorScheme.secondary,
            )
          }
          Text(
            text = selected.subtitle,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface,
          )
          Text(
            text =
              String.format(
                Locale.US,
                "Coords: %.4f° N, %.4f° E",
                selected.latitude,
                selected.longitude,
              ),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
          )

          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
          ) {
            Button(
              onClick = { onSetWaypoint(selected) },
              modifier = Modifier.weight(1f).height(48.dp).testTag("set_waypoint_button"),
            ) {
              Icon(Icons.Filled.LocationOn, contentDescription = null, modifier = Modifier.size(18.dp))
              Spacer(modifier = Modifier.width(4.dp))
              Text(stringResource(R.string.btn_gps_route), style = MaterialTheme.typography.labelLarge)
            }

            OutlinedButton(
              onClick = { onFastTravel(selected) },
              modifier = Modifier.weight(1f).height(48.dp).testTag("fast_travel_button"),
              border = BorderStroke(1.dp, MaterialTheme.colorScheme.secondary),
            ) {
              Icon(Icons.Filled.NearMe, contentDescription = null, modifier = Modifier.size(18.dp))
              Spacer(modifier = Modifier.width(4.dp))
              Text(
                text = stringResource(R.string.btn_stream_zone),
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.secondary,
              )
            }
          }
        }
      }
    }

    items(districts, key = { it.id }) { district ->
      val isSelected = district.id == selected.id
      Surface(
        shape = RoundedCornerShape(12.dp),
        color =
          if (isSelected) MaterialTheme.colorScheme.secondaryContainer
          else MaterialTheme.colorScheme.surface.copy(alpha = 0.72f),
        border =
          BorderStroke(
            1.dp,
            if (isSelected) MaterialTheme.colorScheme.secondary
            else MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
          ),
        modifier =
          Modifier.fillMaxWidth()
            .clickable { onSelect(district) }
            .testTag("district_item_${district.id}"),
      ) {
        Row(
          modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
          verticalAlignment = Alignment.CenterVertically,
          horizontalArrangement = Arrangement.SpaceBetween,
        ) {
          Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
          ) {
            Box(
              modifier =
                Modifier.size(10.dp)
                  .clip(CircleShape)
                  .background(
                    if (isSelected) MaterialTheme.colorScheme.primary
                    else MaterialTheme.colorScheme.secondary
                  )
            )
            Column {
              Text(
                text = district.name,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface,
              )
              Text(
                text = district.category,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
              )
            }
          }
          Icon(
            imageVector = Icons.Filled.Explore,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.secondary,
            modifier = Modifier.size(18.dp),
          )
        }
      }
    }
  }
}
