package com.example.ui.overlays

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.ElectricRickshaw
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.Gamepad
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Layers
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.filled.TwoWheeler
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.data.PlayerSaveEntity
import com.example.model.GameTelemetry
import com.example.model.GarageVehicleSpec
import com.example.model.VizagMission
import com.example.ui.components.VizagAnimatedBackdrop
import com.example.ui.theme.LocalViceColors
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun LandscapePauseMenuOverlay(
  telemetry: GameTelemetry,
  cashRupees: Int,
  savedProgress: PlayerSaveEntity?,
  onResume: () -> Unit,
  onSaveProgress: () -> Unit,
  onOpenStory: () -> Unit,
  onOpenVehicles: () -> Unit,
  onOpenMap: () -> Unit,
  onOpenGisLayers: () -> Unit,
  onOpenSettings: () -> Unit,
  onOpenControls: () -> Unit,
  onOpenAbout: () -> Unit,
  onReturnToMainMenu: () -> Unit,
  modifier: Modifier = Modifier,
) {
  BackHandler(onBack = onResume)
  val vice = LocalViceColors.current

  Box(modifier = modifier.fillMaxSize().testTag("pause_menu_overlay")) {
    VizagAnimatedBackdrop(scrimAlpha = 0.88f, showScenicBadge = false, showPalms = true)

    Row(
      modifier =
        Modifier.fillMaxSize()
          .windowInsetsPadding(WindowInsets.safeDrawing)
          .padding(horizontal = 24.dp, vertical = 16.dp),
      horizontalArrangement = Arrangement.spacedBy(20.dp),
    ) {
      // Left Column: Session Status + Resume / Save / Main Menu
      Surface(
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.90f),
        border = BorderStroke(1.5.dp, Brush.linearGradient(listOf(vice.neonPink, vice.neonCyan))),
        modifier = Modifier.weight(1f).fillMaxHeight(),
      ) {
        Column(
          modifier = Modifier.padding(18.dp).verticalScroll(rememberScrollState()),
          verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
          Text(
            text = "GAME PAUSED",
            style = MaterialTheme.typography.headlineSmall,
            color = vice.neonCyan,
          )
          Text(
            text =
              "Sector: ${telemetry.districtName} • Balance ₹$cashRupees\nHealth ${telemetry.playerHealth}% • Stamina ${telemetry.playerStamina}%",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface,
          )
          val lastSavedText =
            savedProgress?.updatedAt?.let {
              SimpleDateFormat("HH:mm:ss", Locale.US).format(Date(it))
            } ?: "Unsaved session"
          Text(
            text = "Room Save: $lastSavedText",
            style = MaterialTheme.typography.labelMedium,
            color = vice.sunsetOrange,
          )

          Spacer(modifier = Modifier.height(4.dp))

          Button(
            onClick = onResume,
            colors =
              ButtonDefaults.buttonColors(
                containerColor = vice.neonPink,
                contentColor = Color.White,
              ),
            modifier = Modifier.fillMaxWidth().height(50.dp).testTag("pause_resume_button"),
          ) {
            Icon(Icons.Filled.PlayArrow, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text(stringResource(R.string.btn_resume), style = MaterialTheme.typography.titleMedium)
          }

          OutlinedButton(
            onClick = onSaveProgress,
            modifier = Modifier.fillMaxWidth().height(48.dp).testTag("save_progress_button"),
            border = BorderStroke(1.2.dp, vice.neonCyan),
          ) {
            Icon(Icons.Filled.Save, contentDescription = null, tint = vice.neonCyan)
            Spacer(modifier = Modifier.width(8.dp))
            Text(
              text = stringResource(R.string.btn_save_progress),
              style = MaterialTheme.typography.labelLarge,
              color = vice.neonCyan,
            )
          }

          OutlinedButton(
            onClick = onReturnToMainMenu,
            modifier = Modifier.fillMaxWidth().height(48.dp).testTag("pause_main_menu_button"),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
          ) {
            Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = null, tint = Color.White)
            Spacer(modifier = Modifier.width(8.dp))
            Text(
              stringResource(R.string.btn_main_menu),
              style = MaterialTheme.typography.labelLarge,
              color = Color.White,
            )
          }
        }
      }

      // Right Column: Sub-screen Navigation Cards
      LazyColumn(
        modifier = Modifier.weight(1.15f).fillMaxHeight(),
        verticalArrangement = Arrangement.spacedBy(8.dp),
      ) {
        item {
          PauseNavCard(
            title = "STORY & MISSIONS",
            subtitle = "Track Arjun Rao's coastal objectives across Vizag",
            icon = Icons.AutoMirrored.Filled.MenuBook,
            tag = "pause_story_button",
            onClick = onOpenStory,
          )
        }
        item {
          PauseNavCard(
            title = "VEHICLES GARAGE",
            subtitle = "Deliver GT Coupe, Coastal 350 Bike or Vizag City Auto",
            icon = Icons.Filled.DirectionsCar,
            tag = "pause_vehicles_button",
            onClick = onOpenVehicles,
          )
        }
        item {
          PauseNavCard(
            title = "VISAKHAPATNAM CITY MAP",
            subtitle = "Zoomable 16-region GPS map from Bheemili to Steel Plant",
            icon = Icons.Filled.Map,
            tag = "pause_map_button",
            onClick = onOpenMap,
          )
        }
        item {
          PauseNavCard(
            title = "10-LAYER GIS & FILE IMPORT",
            subtitle = "Toggle DEM/OSM/VMRDA layers & import KML, GeoJSON, GeoTIFF or GLB",
            icon = Icons.Filled.Layers,
            tag = "pause_gis_layers_button",
            onClick = onOpenGisLayers,
          )
        }
        item {
          PauseNavCard(
            title = "GRAPHICS, AUDIO & WEATHER",
            subtitle = "Presets, shadow quality, textures, AA & sky time",
            icon = Icons.Filled.Tune,
            tag = "pause_settings_button",
            onClick = onOpenSettings,
          )
        }
        item {
          PauseNavCard(
            title = "CONTROLS & SENSITIVITY",
            subtitle = "Camera sensitivity, invert Y-axis & gamepad profile",
            icon = Icons.Filled.Gamepad,
            tag = "pause_controls_button",
            onClick = onOpenControls,
          )
        }
        item {
          PauseNavCard(
            title = "CREDITS & GLB ASSET REGISTRY",
            subtitle = "Inspect active SkinnedMesh GLB & shader pipeline",
            icon = Icons.Filled.Info,
            tag = "pause_about_button",
            onClick = onOpenAbout,
          )
        }
      }
    }
  }
}

@Composable
private fun PauseNavCard(
  title: String,
  subtitle: String,
  icon: ImageVector,
  tag: String,
  onClick: () -> Unit,
) {
  val vice = LocalViceColors.current
  OutlinedButton(
    onClick = onClick,
    shape = RoundedCornerShape(14.dp),
    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 11.dp),
    modifier = Modifier.fillMaxWidth().testTag(tag),
  ) {
    Row(
      modifier = Modifier.fillMaxWidth(),
      verticalAlignment = Alignment.CenterVertically,
      horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
      Icon(
        imageVector = icon,
        contentDescription = null,
        tint = vice.neonCyan,
        modifier = Modifier.size(22.dp),
      )
      Column(modifier = Modifier.weight(1f)) {
        Text(
          text = title,
          style = MaterialTheme.typography.titleMedium,
          color = Color.White,
        )
        Text(
          text = subtitle,
          style = MaterialTheme.typography.labelSmall,
          color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
      }
    }
  }
}

@Composable
fun StoryAndMissionsOverlay(
  missions: List<VizagMission>,
  activeMissionIndex: Int,
  completedMissions: Set<Int>,
  cashRupees: Int,
  onSelectMission: (VizagMission) -> Unit,
  onClose: () -> Unit,
  modifier: Modifier = Modifier,
) {
  BackHandler(onBack = onClose)
  val vice = LocalViceColors.current

  Box(modifier = modifier.fillMaxSize().testTag("story_mode_overlay")) {
    VizagAnimatedBackdrop(scrimAlpha = 0.89f, showScenicBadge = false, showPalms = true)

    Column(
      modifier =
        Modifier.fillMaxSize()
          .windowInsetsPadding(WindowInsets.safeDrawing)
          .padding(horizontal = 20.dp, vertical = 12.dp),
      verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
      ) {
        Column {
          Text(
            text = "STORY MODE • ARJUN RAO: COASTAL ARRIVAL",
            style = MaterialTheme.typography.headlineSmall,
            color = vice.neonCyan,
          )
          Text(
            text = "${completedMissions.size}/${missions.size} Objectives Complete • Balance ₹$cashRupees",
            style = MaterialTheme.typography.labelMedium,
            color = vice.staminaTeal,
          )
        }
        IconButton(
          onClick = onClose,
          modifier = Modifier.size(48.dp).testTag("close_story_button"),
        ) {
          Icon(
            imageVector = Icons.Filled.Close,
            contentDescription = stringResource(R.string.btn_close),
            tint = Color.White,
          )
        }
      }

      Row(
        modifier = Modifier.fillMaxSize(),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
      ) {
        Surface(
          shape = RoundedCornerShape(18.dp),
          color = MaterialTheme.colorScheme.surface.copy(alpha = 0.90f),
          border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
          modifier = Modifier.weight(0.9f).fillMaxHeight(),
        ) {
          Column(
            modifier = Modifier.padding(16.dp).verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(10.dp),
          ) {
            Text(
              text = "ORIGINAL VISAKHAPATNAM NARRATIVE",
              style = MaterialTheme.typography.labelLarge,
              color = vice.neonPink,
            )
            Text(
              text =
                "Returning to Visakhapatnam after years at sea, former marine courier Arjun Rao steps onto the terracotta promenade of RK Beach. Alongside port engineer Raghav and Siripuram dispatcher Meera, Arjun takes on high-speed coastal runs from INS Kursura up the Kailasagiri ghat road to the gantry berths of Visakhapatnam Port.",
              style = MaterialTheme.typography.bodyMedium,
              color = MaterialTheme.colorScheme.onSurface,
            )
            Surface(
              shape = RoundedCornerShape(12.dp),
              color = MaterialTheme.colorScheme.surfaceVariant,
            ) {
              Column(
                modifier = Modifier.padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
              ) {
                Text(
                  text = "VIZAG COASTAL OPERATIONS",
                  style = MaterialTheme.typography.labelMedium,
                  color = vice.neonCyan,
                )
                Text(
                  text =
                    "• 5 GPS-guided objectives across RK Beach, Beach Road, Siripuram & Visakhapatnam Port.\n• Instant Coupe, Coastal 350 Bike & City Auto vehicle delivery.",
                  style = MaterialTheme.typography.labelSmall,
                  color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
              }
            }
          }
        }

        LazyColumn(
          modifier = Modifier.weight(1.2f).fillMaxHeight(),
          verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
          items(missions, key = { it.id }) { mission ->
            val isDone = completedMissions.contains(mission.index)
            val isActive = mission.index == activeMissionIndex

            Surface(
              shape = RoundedCornerShape(14.dp),
              color =
                if (isActive) MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.78f)
                else MaterialTheme.colorScheme.surface.copy(alpha = 0.90f),
              border =
                BorderStroke(
                  1.2.dp,
                  if (isActive) vice.neonPink else MaterialTheme.colorScheme.outline,
                ),
            ) {
              Column(
                modifier = Modifier.padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
              ) {
                Text(
                  text = mission.chapter.uppercase(Locale.US),
                  style = MaterialTheme.typography.labelSmall,
                  color = vice.neonCyan,
                )
                Row(
                  modifier = Modifier.fillMaxWidth(),
                  horizontalArrangement = Arrangement.SpaceBetween,
                  verticalAlignment = Alignment.CenterVertically,
                ) {
                  Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                  ) {
                    Icon(
                      imageVector = if (isDone) Icons.Filled.CheckCircle else Icons.Filled.Flag,
                      contentDescription = null,
                      tint = if (isDone) vice.staminaTeal else vice.neonPink,
                      modifier = Modifier.size(19.dp),
                    )
                    Text(
                      text = mission.title,
                      style = MaterialTheme.typography.titleMedium,
                      color = Color.White,
                    )
                  }
                  Text(
                    text = "+₹${mission.rewardRupees}",
                    style = MaterialTheme.typography.labelLarge,
                    color = vice.staminaTeal,
                  )
                }

                Text(
                  text = mission.briefing,
                  style = MaterialTheme.typography.bodyMedium,
                  color = MaterialTheme.colorScheme.onSurfaceVariant,
                )

                Row(
                  modifier = Modifier.fillMaxWidth(),
                  horizontalArrangement = Arrangement.SpaceBetween,
                  verticalAlignment = Alignment.CenterVertically,
                ) {
                  Text(
                    text =
                      if (mission.requiresVehicle) "${mission.targetDistrict} • Vehicle Recommended"
                      else mission.targetDistrict,
                    style = MaterialTheme.typography.labelSmall,
                    color = vice.neonCyan,
                  )
                  Button(
                    onClick = { onSelectMission(mission) },
                    colors =
                      ButtonDefaults.buttonColors(
                        containerColor = vice.neonPink,
                        contentColor = Color.White,
                      ),
                    modifier = Modifier.height(48.dp).testTag("track_mission_${mission.index}"),
                  ) {
                    Text(
                      text = if (isActive) "LAUNCH / TRACK GPS" else "START MISSION",
                      style = MaterialTheme.typography.labelLarge,
                    )
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

@Composable
fun VehiclesGarageOverlay(
  vehicles: List<GarageVehicleSpec>,
  onSpawnVehicle: (GarageVehicleSpec) -> Unit,
  onClose: () -> Unit,
  modifier: Modifier = Modifier,
) {
  BackHandler(onBack = onClose)
  val vice = LocalViceColors.current

  Box(modifier = modifier.fillMaxSize().testTag("vehicles_garage_overlay")) {
    VizagAnimatedBackdrop(scrimAlpha = 0.89f, showScenicBadge = false, showPalms = true)

    Column(
      modifier =
        Modifier.fillMaxSize()
          .windowInsetsPadding(WindowInsets.safeDrawing)
          .padding(horizontal = 20.dp, vertical = 12.dp),
      verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
      ) {
        Column {
          Text(
            text = "VISAKHAPATNAM COASTAL GARAGE",
            style = MaterialTheme.typography.headlineSmall,
            color = vice.neonCyan,
          )
          Text(
            text = "Select a drivable vehicle to deliver directly beside your character on Beach Road",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
          )
        }
        IconButton(
          onClick = onClose,
          modifier = Modifier.size(48.dp).testTag("close_vehicles_button"),
        ) {
          Icon(
            imageVector = Icons.Filled.Close,
            contentDescription = stringResource(R.string.btn_close),
            tint = Color.White,
          )
        }
      }

      Row(
        modifier = Modifier.fillMaxWidth().weight(1f),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
      ) {
        vehicles.forEach { spec ->
          val icon =
            when {
              spec.id.contains("bike") -> Icons.Filled.TwoWheeler
              spec.id.contains("auto") -> Icons.Filled.ElectricRickshaw
              else -> Icons.Filled.DirectionsCar
            }

          Surface(
            shape = RoundedCornerShape(18.dp),
            color = MaterialTheme.colorScheme.surface.copy(alpha = 0.90f),
            border = BorderStroke(1.2.dp, MaterialTheme.colorScheme.outline),
            modifier = Modifier.weight(1f).fillMaxHeight(),
          ) {
            Column(
              modifier = Modifier.padding(16.dp).verticalScroll(rememberScrollState()),
              verticalArrangement = Arrangement.SpaceBetween,
            ) {
              Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                  verticalAlignment = Alignment.CenterVertically,
                  horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                  Surface(
                    shape = CircleShape,
                    color = MaterialTheme.colorScheme.primaryContainer,
                    border = BorderStroke(1.dp, vice.neonCyan),
                    modifier = Modifier.size(42.dp),
                  ) {
                    Box(contentAlignment = Alignment.Center) {
                      Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = vice.neonPink,
                      )
                    }
                  }
                  Column {
                    Text(
                      text = spec.name,
                      style = MaterialTheme.typography.titleMedium,
                      fontWeight = FontWeight.Bold,
                      color = Color.White,
                    )
                    Text(
                      text = spec.category,
                      style = MaterialTheme.typography.labelSmall,
                      color = vice.neonCyan,
                    )
                  }
                }

                Text(
                  text = spec.description,
                  style = MaterialTheme.typography.bodyMedium,
                  color = MaterialTheme.colorScheme.onSurfaceVariant,
                )

                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                  Text(
                    text = "Top Speed: ${spec.topSpeedKmh} KM/H",
                    style = MaterialTheme.typography.labelMedium,
                    color = vice.staminaTeal,
                  )
                  Box(
                    modifier =
                      Modifier.fillMaxWidth()
                        .height(6.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.surfaceVariant)
                  ) {
                    Box(
                      modifier =
                        Modifier.fillMaxHeight()
                          .fillMaxWidth((spec.topSpeedKmh / 120f).coerceIn(0.2f, 1f))
                          .background(Brush.horizontalGradient(listOf(vice.neonPink, vice.neonCyan)))
                    )
                  }
                }
              }

              Spacer(modifier = Modifier.height(12.dp))

              Button(
                onClick = { onSpawnVehicle(spec) },
                colors =
                  ButtonDefaults.buttonColors(
                    containerColor = vice.neonPink,
                    contentColor = Color.White,
                  ),
                modifier =
                  Modifier.fillMaxWidth()
                    .height(48.dp)
                    .testTag("spawn_vehicle_${spec.id}"),
              ) {
                Text(
                  text = stringResource(R.string.btn_spawn_vehicle),
                  style = MaterialTheme.typography.labelLarge,
                )
              }
            }
          }
        }
      }
    }
  }
}
