package com.example.ui.overlays

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Gamepad
import androidx.compose.material.icons.filled.Memory
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.filled.ViewInAr
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.data.PlayerSaveEntity
import com.example.model.AssetManifestEntry
import com.example.model.GameTelemetry
import com.example.model.GraphicsPreset
import com.example.model.GraphicsSettingsState
import com.example.model.SettingsTab
import com.example.model.WeatherType
import com.example.ui.components.VizagAnimatedBackdrop
import com.example.ui.components.formatClock24
import com.example.ui.theme.LocalViceColors
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun GraphicsAndEnvironmentSettingsOverlay(
  telemetry: GameTelemetry,
  graphicsSettings: GraphicsSettingsState,
  selectedTab: SettingsTab,
  autoCycle: Boolean,
  savedProgress: PlayerSaveEntity?,
  onSelectTab: (SettingsTab) -> Unit,
  onSelectPreset: (GraphicsPreset) -> Unit,
  onResolutionScaleChanged: (Float) -> Unit,
  onShadowSizeChanged: (Int) -> Unit,
  onAnisotropyChanged: (Int) -> Unit,
  onAntiAliasingChanged: (Boolean) -> Unit,
  onDrawDistanceChanged: (Float) -> Unit,
  onShadowsChanged: (Boolean) -> Unit,
  onTargetFpsChanged: (Int) -> Unit,
  onAudioChanged: (Boolean) -> Unit,
  onAudioVolumeChanged: (Float) -> Unit,
  onTimeChanged: (Float) -> Unit,
  onAutoCycleChanged: (Boolean) -> Unit,
  onWeatherChanged: (WeatherType) -> Unit,
  onCameraSensitivityChanged: (Float) -> Unit,
  onInvertCameraYChanged: (Boolean) -> Unit,
  onControllerProfileChanged: (String) -> Unit,
  onSaveProgress: () -> Unit,
  onClose: () -> Unit,
  modifier: Modifier = Modifier,
) {
  BackHandler(onBack = onClose)
  val vice = LocalViceColors.current

  Box(modifier = modifier.fillMaxSize().testTag("settings_overlay")) {
    VizagAnimatedBackdrop(scrimAlpha = 0.89f, showScenicBadge = false, showPalms = true)

    Column(
      modifier =
        Modifier.fillMaxSize()
          .windowInsetsPadding(WindowInsets.safeDrawing)
          .padding(horizontal = 20.dp, vertical = 12.dp),
      verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
      // Top Vice Settings Header + Category Tabs + Close Button
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
      ) {
        Column {
          Text(
            text = "VIZAG CITY SETTINGS & PIPELINE TUNING",
            style = MaterialTheme.typography.headlineSmall,
            color = vice.neonCyan,
          )
          Text(
            text =
              "Preset: ${graphicsSettings.preset.label} • Shadow ${graphicsSettings.shadowMapSize}px • ${graphicsSettings.textureAnisotropy}x Aniso • ${graphicsSettings.targetFps} FPS",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
          )
        }

        Row(
          horizontalArrangement = Arrangement.spacedBy(8.dp),
          verticalAlignment = Alignment.CenterVertically,
        ) {
          SettingsTab.entries.forEach { tab ->
            val tabIcon =
              when (tab) {
                SettingsTab.GRAPHICS -> Icons.Filled.Tune
                SettingsTab.AUDIO_WORLD -> Icons.Filled.WbSunny
                SettingsTab.CONTROLS -> Icons.Filled.Gamepad
              }
            FilterChip(
              selected = selectedTab == tab,
              onClick = { onSelectTab(tab) },
              leadingIcon = {
                Icon(imageVector = tabIcon, contentDescription = null, modifier = Modifier.size(16.dp))
              },
              label = { Text(tab.label, style = MaterialTheme.typography.labelLarge) },
              colors =
                FilterChipDefaults.filterChipColors(
                  selectedContainerColor = vice.neonPink,
                  selectedLabelColor = Color.White,
                  selectedLeadingIconColor = Color.White,
                ),
              modifier = Modifier.height(48.dp).testTag("settings_tab_${tab.name.lowercase()}"),
            )
          }

          IconButton(
            onClick = onClose,
            modifier = Modifier.size(48.dp).testTag("close_settings_button"),
          ) {
            Icon(
              imageVector = Icons.Filled.Close,
              contentDescription = stringResource(R.string.btn_close),
              tint = Color.White,
            )
          }
        }
      }

      when (selectedTab) {
        SettingsTab.GRAPHICS -> {
          GraphicsTabContent(
            graphicsSettings = graphicsSettings,
            onSelectPreset = onSelectPreset,
            onResolutionScaleChanged = onResolutionScaleChanged,
            onShadowSizeChanged = onShadowSizeChanged,
            onAnisotropyChanged = onAnisotropyChanged,
            onAntiAliasingChanged = onAntiAliasingChanged,
            onDrawDistanceChanged = onDrawDistanceChanged,
            onShadowsChanged = onShadowsChanged,
            onTargetFpsChanged = onTargetFpsChanged,
            modifier = Modifier.fillMaxSize(),
          )
        }

        SettingsTab.AUDIO_WORLD -> {
          AudioAndAtmosphereTabContent(
            telemetry = telemetry,
            graphicsSettings = graphicsSettings,
            autoCycle = autoCycle,
            savedProgress = savedProgress,
            onAudioChanged = onAudioChanged,
            onAudioVolumeChanged = onAudioVolumeChanged,
            onTimeChanged = onTimeChanged,
            onAutoCycleChanged = onAutoCycleChanged,
            onWeatherChanged = onWeatherChanged,
            onSaveProgress = onSaveProgress,
            modifier = Modifier.fillMaxSize(),
          )
        }

        SettingsTab.CONTROLS -> {
          ControlsTabContent(
            graphicsSettings = graphicsSettings,
            onCameraSensitivityChanged = onCameraSensitivityChanged,
            onInvertCameraYChanged = onInvertCameraYChanged,
            onControllerProfileChanged = onControllerProfileChanged,
            modifier = Modifier.fillMaxSize(),
          )
        }
      }
    }
  }
}

@Composable
private fun GraphicsTabContent(
  graphicsSettings: GraphicsSettingsState,
  onSelectPreset: (GraphicsPreset) -> Unit,
  onResolutionScaleChanged: (Float) -> Unit,
  onShadowSizeChanged: (Int) -> Unit,
  onAnisotropyChanged: (Int) -> Unit,
  onAntiAliasingChanged: (Boolean) -> Unit,
  onDrawDistanceChanged: (Float) -> Unit,
  onShadowsChanged: (Boolean) -> Unit,
  onTargetFpsChanged: (Int) -> Unit,
  modifier: Modifier = Modifier,
) {
  val vice = LocalViceColors.current
  Row(modifier = modifier, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
    // Left Card: Quality Preset, Resolution, Draw Distance & Frame Rate
    Surface(
      shape = RoundedCornerShape(18.dp),
      color = MaterialTheme.colorScheme.surface.copy(alpha = 0.90f),
      border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
      modifier = Modifier.weight(1f).fillMaxHeight(),
    ) {
      Column(
        modifier = Modifier.padding(16.dp).verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp),
      ) {
        Text(
          text = stringResource(R.string.label_graphics_preset),
          style = MaterialTheme.typography.titleMedium,
          color = vice.neonPink,
        )

        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
          GraphicsPreset.entries.forEach { preset ->
            FilterChip(
              selected = graphicsSettings.preset == preset,
              onClick = { onSelectPreset(preset) },
              label = { Text(preset.label) },
              modifier =
                Modifier.weight(1f)
                  .height(48.dp)
                  .testTag("preset_chip_${preset.name.lowercase()}"),
            )
          }
        }

        Text(
          text = graphicsSettings.preset.summary,
          style = MaterialTheme.typography.labelSmall,
          color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        // Resolution Scale Slider
        Column {
          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
          ) {
            Text(stringResource(R.string.label_resolution_scale), style = MaterialTheme.typography.bodyMedium)
            Text(
              text = "${(graphicsSettings.resolutionScale * 100).toInt()}%",
              style = MaterialTheme.typography.labelLarge,
              color = vice.neonCyan,
            )
          }
          Slider(
            value = graphicsSettings.resolutionScale,
            onValueChange = onResolutionScaleChanged,
            valueRange = 0.55f..1.50f,
            colors = SliderDefaults.colors(thumbColor = vice.neonCyan, activeTrackColor = vice.neonPink),
            modifier = Modifier.fillMaxWidth().testTag("resolution_scale_slider"),
          )
        }

        // Draw Distance Slider
        Column {
          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
          ) {
            Text(stringResource(R.string.label_draw_distance), style = MaterialTheme.typography.bodyMedium)
            Text(
              text = "${graphicsSettings.drawDistance.toInt()}m",
              style = MaterialTheme.typography.labelLarge,
              color = vice.neonCyan,
            )
          }
          Slider(
            value = graphicsSettings.drawDistance,
            onValueChange = onDrawDistanceChanged,
            valueRange = 180f..700f,
            colors = SliderDefaults.colors(thumbColor = vice.neonCyan, activeTrackColor = vice.neonPink),
            modifier = Modifier.fillMaxWidth().testTag("draw_distance_slider"),
          )
        }

        // Target Frame Rate
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.SpaceBetween,
          verticalAlignment = Alignment.CenterVertically,
        ) {
          Text("Target Frame Rate", style = MaterialTheme.typography.bodyMedium)
          Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(
              selected = graphicsSettings.targetFps == 30,
              onClick = { onTargetFpsChanged(30) },
              label = { Text("30 FPS") },
              modifier = Modifier.height(48.dp).testTag("fps_chip_30"),
            )
            FilterChip(
              selected = graphicsSettings.targetFps == 60,
              onClick = { onTargetFpsChanged(60) },
              label = { Text("60 FPS") },
              modifier = Modifier.height(48.dp).testTag("fps_chip_60"),
            )
          }
        }
      }
    }

    // Right Card: Shadow Quality, Texture Quality (Anisotropy) & Anti-Aliasing
    Surface(
      shape = RoundedCornerShape(18.dp),
      color = MaterialTheme.colorScheme.surface.copy(alpha = 0.90f),
      border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
      modifier = Modifier.weight(1f).fillMaxHeight(),
    ) {
      Column(
        modifier = Modifier.padding(16.dp).verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp),
      ) {
        Text(
          text = "SHADOWS, TEXTURES & ANTI-ALIASING",
          style = MaterialTheme.typography.titleMedium,
          color = vice.neonCyan,
        )

        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.SpaceBetween,
          verticalAlignment = Alignment.CenterVertically,
        ) {
          Text(stringResource(R.string.label_shadows), style = MaterialTheme.typography.bodyMedium)
          Switch(
            checked = graphicsSettings.shadowsEnabled,
            onCheckedChange = onShadowsChanged,
            modifier = Modifier.testTag("shadows_switch"),
          )
        }

        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
          Text(
            text = stringResource(R.string.label_shadow_quality),
            style = MaterialTheme.typography.bodyMedium,
          )
          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
          ) {
            listOf(512 to "LOW", 1024 to "MED", 1536 to "HIGH", 2048 to "ULTRA").forEach { (sz, lbl) ->
              FilterChip(
                selected = graphicsSettings.shadowMapSize == sz,
                onClick = { onShadowSizeChanged(sz) },
                label = { Text(lbl) },
                modifier = Modifier.weight(1f).height(48.dp).testTag("shadow_chip_$sz"),
              )
            }
          }
        }

        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
          Text(
            text = stringResource(R.string.label_texture_quality),
            style = MaterialTheme.typography.bodyMedium,
          )
          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
          ) {
            listOf(1 to "1x", 2 to "2x", 4 to "4x", 8 to "8x").forEach { (aniso, lbl) ->
              FilterChip(
                selected = graphicsSettings.textureAnisotropy == aniso,
                onClick = { onAnisotropyChanged(aniso) },
                label = { Text(lbl) },
                modifier = Modifier.weight(1f).height(48.dp).testTag("texture_chip_$aniso"),
              )
            }
          }
        }

        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.SpaceBetween,
          verticalAlignment = Alignment.CenterVertically,
        ) {
          Text(stringResource(R.string.label_anti_aliasing), style = MaterialTheme.typography.bodyMedium)
          Switch(
            checked = graphicsSettings.antiAliasing,
            onCheckedChange = onAntiAliasingChanged,
            modifier = Modifier.testTag("anti_aliasing_switch"),
          )
        }
      }
    }
  }
}

@Composable
private fun AudioAndAtmosphereTabContent(
  telemetry: GameTelemetry,
  graphicsSettings: GraphicsSettingsState,
  autoCycle: Boolean,
  savedProgress: PlayerSaveEntity?,
  onAudioChanged: (Boolean) -> Unit,
  onAudioVolumeChanged: (Float) -> Unit,
  onTimeChanged: (Float) -> Unit,
  onAutoCycleChanged: (Boolean) -> Unit,
  onWeatherChanged: (WeatherType) -> Unit,
  onSaveProgress: () -> Unit,
  modifier: Modifier = Modifier,
) {
  val vice = LocalViceColors.current
  Row(modifier = modifier, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
    // Left Card: Audio Controls + Time of Day
    Surface(
      shape = RoundedCornerShape(18.dp),
      color = MaterialTheme.colorScheme.surface.copy(alpha = 0.90f),
      border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
      modifier = Modifier.weight(1f).fillMaxHeight(),
    ) {
      Column(
        modifier = Modifier.padding(16.dp).verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp),
      ) {
        Text(
          text = "AUDIO & VIZAG SOLAR CYCLE",
          style = MaterialTheme.typography.titleMedium,
          color = vice.neonPink,
        )

        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.SpaceBetween,
          verticalAlignment = Alignment.CenterVertically,
        ) {
          Text(stringResource(R.string.label_audio), style = MaterialTheme.typography.bodyMedium)
          Switch(
            checked = graphicsSettings.audioEnabled,
            onCheckedChange = onAudioChanged,
            modifier = Modifier.testTag("audio_switch"),
          )
        }

        Column {
          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
          ) {
            Text(stringResource(R.string.label_audio_volume), style = MaterialTheme.typography.bodyMedium)
            Text(
              text = "${(graphicsSettings.audioVolume * 100).toInt()}%",
              style = MaterialTheme.typography.labelLarge,
              color = vice.neonCyan,
            )
          }
          Slider(
            value = graphicsSettings.audioVolume,
            onValueChange = onAudioVolumeChanged,
            valueRange = 0f..1f,
            colors = SliderDefaults.colors(thumbColor = vice.neonCyan, activeTrackColor = vice.neonPink),
            modifier = Modifier.fillMaxWidth().testTag("audio_volume_slider"),
          )
        }

        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.SpaceBetween,
          verticalAlignment = Alignment.CenterVertically,
        ) {
          Text(
            text = stringResource(R.string.label_time_of_day),
            style = MaterialTheme.typography.titleMedium,
            color = vice.neonCyan,
          )
          Text(
            text = "${formatClock24(telemetry.timeOfDay)} IST",
            style = MaterialTheme.typography.titleMedium,
            color = vice.sunsetOrange,
          )
        }

        Slider(
          value = telemetry.timeOfDay,
          onValueChange = onTimeChanged,
          valueRange = 0f..23.95f,
          colors = SliderDefaults.colors(thumbColor = vice.sunsetOrange, activeTrackColor = vice.neonPink),
          modifier = Modifier.fillMaxWidth().testTag("time_of_day_slider"),
        )

        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.SpaceBetween,
          verticalAlignment = Alignment.CenterVertically,
        ) {
          Text(stringResource(R.string.label_auto_cycle), style = MaterialTheme.typography.bodyMedium)
          Switch(
            checked = autoCycle,
            onCheckedChange = onAutoCycleChanged,
            modifier = Modifier.testTag("auto_cycle_switch"),
          )
        }
      }
    }

    // Right Card: Weather Presets + Room Save
    Surface(
      shape = RoundedCornerShape(18.dp),
      color = MaterialTheme.colorScheme.surface.copy(alpha = 0.90f),
      border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
      modifier = Modifier.weight(1f).fillMaxHeight(),
    ) {
      Column(
        modifier = Modifier.padding(16.dp).verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp),
      ) {
        Text(
          text = stringResource(R.string.label_weather),
          style = MaterialTheme.typography.titleMedium,
          color = vice.neonCyan,
        )

        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
          WeatherType.entries.chunked(3).forEach { rowWeathers ->
            Row(
              modifier = Modifier.fillMaxWidth(),
              horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
              rowWeathers.forEach { wt ->
                FilterChip(
                  selected = telemetry.weather == wt,
                  onClick = { onWeatherChanged(wt) },
                  label = { Text(wt.label, maxLines = 1) },
                  modifier =
                    Modifier.weight(1f)
                      .height(48.dp)
                      .testTag("weather_chip_${wt.jsKey.lowercase()}"),
                )
              }
            }
          }
        }

        Surface(
          shape = RoundedCornerShape(12.dp),
          color = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.55f),
          border = BorderStroke(1.dp, vice.neonCyan),
          modifier = Modifier.fillMaxWidth(),
        ) {
          val lastSaved =
            savedProgress?.updatedAt?.let {
              SimpleDateFormat("HH:mm:ss", Locale.US).format(Date(it))
            } ?: "Not saved yet"
          Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
          ) {
            Text(
              text = "LOCAL ROOM DATABASE PERSISTENCE",
              style = MaterialTheme.typography.labelMedium,
              color = vice.neonCyan,
            )
            Text(
              text = "Zone: ${telemetry.districtName} • Last Saved: $lastSaved",
              style = MaterialTheme.typography.bodySmall,
              color = Color.White,
            )
          }
        }

        Button(
          onClick = onSaveProgress,
          colors =
            ButtonDefaults.buttonColors(
              containerColor = vice.neonPink,
              contentColor = Color.White,
            ),
          modifier = Modifier.fillMaxWidth().height(48.dp).testTag("save_progress_button"),
        ) {
          Icon(Icons.Filled.Save, contentDescription = null, modifier = Modifier.size(18.dp))
          Spacer(modifier = Modifier.width(8.dp))
          Text(stringResource(R.string.btn_save_progress), style = MaterialTheme.typography.labelLarge)
        }
      }
    }
  }
}

@Composable
private fun ControlsTabContent(
  graphicsSettings: GraphicsSettingsState,
  onCameraSensitivityChanged: (Float) -> Unit,
  onInvertCameraYChanged: (Boolean) -> Unit,
  onControllerProfileChanged: (String) -> Unit,
  modifier: Modifier = Modifier,
) {
  val vice = LocalViceColors.current
  val profiles = listOf("Hybrid Touch + Gamepad", "Dual-Stick Touch", "Controller / Keyboard")

  Row(modifier = modifier, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
    Surface(
      shape = RoundedCornerShape(18.dp),
      color = MaterialTheme.colorScheme.surface.copy(alpha = 0.90f),
      border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
      modifier = Modifier.weight(1f).fillMaxHeight(),
    ) {
      Column(
        modifier = Modifier.padding(16.dp).verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp),
      ) {
        Text(
          text = "CAMERA & CONTROLLER SETUP",
          style = MaterialTheme.typography.titleMedium,
          color = vice.neonPink,
        )

        Column {
          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
          ) {
            Text(stringResource(R.string.label_camera_sensitivity), style = MaterialTheme.typography.bodyMedium)
            Text(
              text = String.format(Locale.US, "%.2fx", graphicsSettings.cameraSensitivity),
              style = MaterialTheme.typography.labelLarge,
              color = vice.neonCyan,
            )
          }
          Slider(
            value = graphicsSettings.cameraSensitivity,
            onValueChange = onCameraSensitivityChanged,
            valueRange = 0.4f..2.2f,
            colors = SliderDefaults.colors(thumbColor = vice.neonCyan, activeTrackColor = vice.neonPink),
            modifier = Modifier.fillMaxWidth().testTag("camera_sensitivity_slider"),
          )
        }

        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.SpaceBetween,
          verticalAlignment = Alignment.CenterVertically,
        ) {
          Text(stringResource(R.string.label_invert_y), style = MaterialTheme.typography.bodyMedium)
          Switch(
            checked = graphicsSettings.invertCameraY,
            onCheckedChange = onInvertCameraYChanged,
            modifier = Modifier.testTag("invert_y_switch"),
          )
        }

        Text(
          text = stringResource(R.string.label_controller_profile),
          style = MaterialTheme.typography.bodyMedium,
        )

        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
          profiles.forEach { prof ->
            FilterChip(
              selected = graphicsSettings.controllerProfile == prof,
              onClick = { onControllerProfileChanged(prof) },
              label = { Text(prof) },
              modifier = Modifier.fillMaxWidth().height(48.dp),
            )
          }
        }
      }
    }

    Surface(
      shape = RoundedCornerShape(18.dp),
      color = MaterialTheme.colorScheme.surface.copy(alpha = 0.90f),
      border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
      modifier = Modifier.weight(1f).fillMaxHeight(),
    ) {
      Column(
        modifier = Modifier.padding(16.dp).verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(10.dp),
      ) {
        Text(
          text = "TOUCH, GAMEPAD & KEYBOARD BINDINGS",
          style = MaterialTheme.typography.titleMedium,
          color = vice.neonCyan,
        )
        listOf(
          "Movement / Steering" to "Left Virtual Stick / WASD / Gamepad LS",
          "Orbit Camera" to "Right Touch Pad / Mouse Drag / Gamepad RS",
          "Sprint (Drains Stamina)" to "RUN Button / Shift / Gamepad L3",
          "Jump / Vault" to "JUMP Button / Space / Gamepad A",
          "Enter / Exit Vehicle" to "DRIVE Button / F / Gamepad Y",
          "Accelerate / Brake / Drift" to "Pedal Buttons / W-S-Space / Triggers",
          "Horn & Interact" to "HORN (H) & ACT (E) Context Button",
        ).forEach { (action, binding) ->
          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
          ) {
            Text(action, style = MaterialTheme.typography.labelLarge, color = Color.White)
            Text(binding, style = MaterialTheme.typography.bodySmall, color = vice.neonCyan)
          }
        }
      }
    }
  }
}

@Composable
fun AboutAndAssetRegistryOverlay(
  assetManifest: List<AssetManifestEntry>,
  telemetry: GameTelemetry,
  onClose: () -> Unit,
  modifier: Modifier = Modifier,
) {
  BackHandler(onBack = onClose)
  val vice = LocalViceColors.current

  Box(modifier = modifier.fillMaxSize().testTag("about_assets_overlay")) {
    VizagAnimatedBackdrop(scrimAlpha = 0.90f, showScenicBadge = false, showPalms = true)

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
            text = "CREDITS • VIZAG CITY ENGINE & 3D GLB ASSET REGISTRY",
            style = MaterialTheme.typography.headlineSmall,
            color = vice.neonCyan,
          )
          Text(
            text = "Coastal Neon UI • Three.js 6-Manager PBR Pipeline • Samsung Galaxy Tab A9 Landscape Target",
            style = MaterialTheme.typography.labelMedium,
            color = vice.neonPink,
          )
        }
        IconButton(
          onClick = onClose,
          modifier = Modifier.size(48.dp).testTag("close_about_button"),
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
          modifier = Modifier.weight(0.95f).fillMaxHeight(),
        ) {
          Column(
            modifier = Modifier.padding(16.dp).verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(10.dp),
          ) {
            Row(
              verticalAlignment = Alignment.CenterVertically,
              horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
              Icon(
                imageVector = Icons.Filled.Memory,
                contentDescription = null,
                tint = vice.neonPink,
              )
              Text(
                text = "ENGINE & VISUAL ARCHITECTURE CREDITS",
                style = MaterialTheme.typography.titleMedium,
                color = vice.neonPink,
              )
            }
            Text(
              text =
                "• Visakhapatnam Open World: 15 mapped coastal & hill districts spanning Bheemili, Rushikonda, Kailasagiri, RK Beach, Siripuram, Visakhapatnam Port & Steel Plant streamed via 140m spatial chunks.\n• 6-Manager Realistic Lighting & PBR Stack: TextureManager (11 procedural PBR material classes), MaterialManager, LightingManager (GI bounce, soft shadows & sun volumetric god rays), EnvironmentManager (atmospheric scattering & cloud FBM), WeatherVisualManager (6 presets), and PostProcessingManager (HDR bloom, ACES filmic grading, FXAA).\n• Typography & UI Palette: Russo One, Kaushan Script, Chakra Petch & Space Grotesk on a 1980s Vice-inspired coastal pink/cyan palette.",
              style = MaterialTheme.typography.bodyMedium,
              color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
              text = "Live Engine Status: ${telemetry.activeChunks} active chunks • ${telemetry.fps} FPS",
              style = MaterialTheme.typography.labelMedium,
              color = vice.staminaTeal,
            )
          }
        }

        LazyColumn(
          modifier = Modifier.weight(1.15f).fillMaxHeight(),
          verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
          items(assetManifest, key = { it.id }) { entry ->
            val isLoadedGlb = entry.status.contains("LOADED", ignoreCase = true)
            Surface(
              shape = RoundedCornerShape(14.dp),
              color = MaterialTheme.colorScheme.surface.copy(alpha = 0.90f),
              border =
                BorderStroke(
                  1.dp,
                  if (isLoadedGlb) vice.staminaTeal else MaterialTheme.colorScheme.outline,
                ),
            ) {
              Column(
                modifier = Modifier.padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
              ) {
                Row(
                  modifier = Modifier.fillMaxWidth(),
                  horizontalArrangement = Arrangement.SpaceBetween,
                  verticalAlignment = Alignment.CenterVertically,
                ) {
                  Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.weight(1f),
                  ) {
                    Icon(
                      imageVector = if (isLoadedGlb) Icons.Filled.CheckCircle else Icons.Filled.ViewInAr,
                      contentDescription = null,
                      tint = if (isLoadedGlb) vice.staminaTeal else vice.neonPink,
                      modifier = Modifier.size(18.dp),
                    )
                    Text(
                      text = entry.title,
                      style = MaterialTheme.typography.titleSmall,
                      fontWeight = FontWeight.SemiBold,
                      color = Color.White,
                    )
                  }
                  Surface(
                    shape = RoundedCornerShape(6.dp),
                    color =
                      if (isLoadedGlb) vice.staminaTeal.copy(alpha = 0.2f)
                      else MaterialTheme.colorScheme.secondaryContainer,
                  ) {
                    Text(
                      text = entry.status,
                      style = MaterialTheme.typography.labelSmall,
                      color = if (isLoadedGlb) vice.staminaTeal else vice.neonCyan,
                      modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                    )
                  }
                }
                Text(
                  text = "Slot Path: ${entry.localPath}",
                  style = MaterialTheme.typography.labelSmall,
                  color = vice.neonCyan,
                )
                Text(
                  text = entry.detail,
                  style = MaterialTheme.typography.bodySmall,
                  color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
              }
            }
          }
        }
      }
    }
  }
}
