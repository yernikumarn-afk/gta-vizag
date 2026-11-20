package com.example.ui.overlays

import androidx.activity.compose.BackHandler
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.interaction.collectIsPressedAsState
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
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.FolderOpen
import androidx.compose.material.icons.filled.Gamepad
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Layers
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Restore
import androidx.compose.material.icons.filled.ScreenRotation
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.data.PlayerSaveEntity
import com.example.model.VizagDistrict
import com.example.ui.components.VizagAnimatedBackdrop
import com.example.ui.theme.LocalViceColors
import com.example.ui.theme.ViceScriptTitleStyle
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

private data class MainMenuActionItem(
  val tag: String,
  val labelRes: Int,
  val subtitle: String,
  val icon: ImageVector,
  val highlightGradient: Boolean = false,
  val onClick: () -> Unit,
)

@Composable
fun RotateDeviceOverlay(modifier: Modifier = Modifier) {
  val vice = LocalViceColors.current
  Surface(
    modifier = modifier.fillMaxSize().testTag("rotate_device_screen"),
    color = MaterialTheme.colorScheme.background,
  ) {
    Column(
      modifier =
        Modifier.fillMaxSize()
          .windowInsetsPadding(WindowInsets.safeDrawing)
          .padding(28.dp),
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.Center,
    ) {
      Surface(
        shape = CircleShape,
        color = MaterialTheme.colorScheme.primaryContainer,
        border = BorderStroke(2.dp, vice.neonCyan),
        modifier = Modifier.size(88.dp),
      ) {
        Box(contentAlignment = Alignment.Center) {
          Icon(
            imageVector = Icons.Filled.ScreenRotation,
            contentDescription = null,
            tint = vice.neonPink,
            modifier = Modifier.size(44.dp),
          )
        }
      }
      Spacer(modifier = Modifier.height(20.dp))
      Text(
        text = stringResource(R.string.rotate_device_title),
        style = MaterialTheme.typography.headlineSmall,
        color = vice.neonCyan,
        textAlign = TextAlign.Center,
      )
      Spacer(modifier = Modifier.height(10.dp))
      Text(
        text = stringResource(R.string.rotate_device_body),
        style = MaterialTheme.typography.bodyLarge,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        textAlign = TextAlign.Center,
        modifier = Modifier.widthIn(max = 420.dp),
      )
    }
  }
}

@Composable
fun LandscapeLoadingOverlay(modifier: Modifier = Modifier) {
  val vice = LocalViceColors.current
  Box(
    modifier = modifier.fillMaxSize().testTag("landscape_loading_screen"),
    contentAlignment = Alignment.Center,
  ) {
    VizagAnimatedBackdrop(scrimAlpha = 0.80f, showScenicBadge = true, showPalms = true)

    Column(
      horizontalAlignment = Alignment.CenterHorizontally,
      verticalArrangement = Arrangement.spacedBy(12.dp),
      modifier = Modifier.padding(28.dp),
    ) {
      VizagCoastalLogoCrest(size = 76)
      Text(
        text = stringResource(R.string.game_title),
        style =
          MaterialTheme.typography.displayLarge.copy(
            shadow = Shadow(color = vice.neonPink, offset = Offset(3f, 3f), blurRadius = 18f)
          ),
        color = MaterialTheme.colorScheme.onBackground,
      )
      Text(
        text = stringResource(R.string.game_subtitle),
        style =
          ViceScriptTitleStyle.copy(
            shadow = Shadow(color = vice.neonCyan, offset = Offset(0f, 0f), blurRadius = 14f)
          ),
        color = vice.neonPink,
      )
      Spacer(modifier = Modifier.height(6.dp))
      CircularProgressIndicator(
        color = vice.neonCyan,
        trackColor = vice.electricPurple.copy(alpha = 0.35f),
      )
      Text(
        text = stringResource(R.string.loading_stage_title),
        style = MaterialTheme.typography.labelLarge,
        color = vice.neonCyan,
        textAlign = TextAlign.Center,
      )
      Text(
        text = "Streaming Three.js PBR Shaders, Volumetric Coastal Sky & Visakhapatnam 15-Zone Geometry",
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        textAlign = TextAlign.Center,
      )
    }
  }
}

@Composable
fun VizagLandscapeMainMenu(
  engineReady: Boolean,
  riggedGlbLoaded: Boolean,
  savedProgress: PlayerSaveEntity?,
  onNewGame: () -> Unit,
  onContinueGame: () -> Unit,
  onLoadGame: () -> Unit,
  onSettings: () -> Unit,
  onGraphics: () -> Unit,
  onControls: () -> Unit,
  onCredits: () -> Unit,
  onExitGame: () -> Unit,
  onStoryMode: () -> Unit,
  onFreeRoam: () -> Unit,
  onVehicles: () -> Unit,
  onCityMap: () -> Unit,
  onGisLayers: () -> Unit = {},
  modifier: Modifier = Modifier,
) {
  val vice = LocalViceColors.current
  val menuItems =
    listOf(
      MainMenuActionItem(
        tag = "menu_new_game",
        labelRes = R.string.menu_new_game,
        subtitle = "RK Beach Sunset Arrival",
        icon = Icons.Filled.PlayArrow,
        highlightGradient = savedProgress == null,
        onClick = onNewGame,
      ),
      MainMenuActionItem(
        tag = "menu_continue",
        labelRes = R.string.menu_continue,
        subtitle =
          if (savedProgress != null) "Resume • ${savedProgress.districtName}"
          else "Begin & Auto-Save Session",
        icon = Icons.Filled.Restore,
        highlightGradient = savedProgress != null,
        onClick = onContinueGame,
      ),
      MainMenuActionItem(
        tag = "menu_load_game",
        labelRes = R.string.menu_load_game,
        subtitle = "Save Slots & Landmark Spawns",
        icon = Icons.Filled.FolderOpen,
        onClick = onLoadGame,
      ),
      MainMenuActionItem(
        tag = "menu_settings",
        labelRes = R.string.menu_settings,
        subtitle = "Audio, Sky & Gameplay Setup",
        icon = Icons.Filled.Settings,
        onClick = onSettings,
      ),
      MainMenuActionItem(
        tag = "menu_graphics",
        labelRes = R.string.menu_graphics,
        subtitle = "Shadows, Texture, AA & Resolution",
        icon = Icons.Filled.Tune,
        onClick = onGraphics,
      ),
      MainMenuActionItem(
        tag = "menu_controls",
        labelRes = R.string.menu_controls,
        subtitle = "Sensitivity, Invert Y & Gamepad",
        icon = Icons.Filled.Gamepad,
        onClick = onControls,
      ),
      MainMenuActionItem(
        tag = "menu_credits",
        labelRes = R.string.menu_credits,
        subtitle = "Architecture & GLB Registry",
        icon = Icons.Filled.Info,
        onClick = onCredits,
      ),
      MainMenuActionItem(
        tag = "menu_exit_game",
        labelRes = R.string.menu_exit_game,
        subtitle = "Save & Close Vizag City",
        icon = Icons.AutoMirrored.Filled.ExitToApp,
        onClick = onExitGame,
      ),
    )

  Box(modifier = modifier.fillMaxSize().testTag("landscape_main_menu")) {
    // Rotating Authentic 16:9 Vizag Photography + Retro Palms + Neon Twilight Scrim
    VizagAnimatedBackdrop(
      scrimAlpha = 0.72f,
      showScenicBadge = true,
      showPalms = true,
    )

    Row(
      modifier =
        Modifier.fillMaxSize()
          .windowInsetsPadding(WindowInsets.safeDrawing)
          .padding(horizontal = 24.dp, vertical = 14.dp),
      horizontalArrangement = Arrangement.spacedBy(22.dp),
      verticalAlignment = Alignment.CenterVertically,
    ) {
      // Left Hero Column: Vice-inspired Vizag Title Typography, Quick Access & Telemetry Status
      Column(
        modifier = Modifier.weight(0.96f).fillMaxHeight(),
        verticalArrangement = Arrangement.SpaceBetween,
      ) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
          Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
          ) {
            VizagCoastalLogoCrest(size = 64)
            Column {
              Text(
                text = "VISAKHAPATNAM • COASTAL NEON EDITION",
                style = MaterialTheme.typography.labelSmall,
                color = vice.neonCyan,
                fontWeight = FontWeight.Bold,
              )
              Text(
                text = stringResource(R.string.game_title),
                style =
                  MaterialTheme.typography.displayMedium.copy(
                    shadow =
                      Shadow(
                        color = vice.neonPink.copy(alpha = 0.85f),
                        offset = Offset(3f, 3f),
                        blurRadius = 16f,
                      )
                  ),
                color = MaterialTheme.colorScheme.onBackground,
              )
              Text(
                text = stringResource(R.string.game_subtitle),
                style =
                  ViceScriptTitleStyle.copy(
                    shadow =
                      Shadow(
                        color = vice.neonCyan.copy(alpha = 0.7f),
                        offset = Offset(0f, 0f),
                        blurRadius = 12f,
                      )
                  ),
                color = vice.neonPink,
              )
            }
          }

          Text(
            text =
              "Cruise sunlit Beach Road in a classic coupe, hike Kailasagiri, or roam 15 seamless Visakhapatnam districts rendered with real-time PBR shaders.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
          )

          // Quick-Launch Action Pills (Free Roam, Story, Garage, City Map, 10-Layer GIS)
          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(5.dp),
          ) {
            ViceQuickPill(
              label = "ROAM",
              icon = Icons.Filled.Explore,
              tag = "menu_free_roam",
              onClick = onFreeRoam,
              modifier = Modifier.weight(1f),
            )
            ViceQuickPill(
              label = "STORY",
              icon = Icons.AutoMirrored.Filled.MenuBook,
              tag = "menu_story_mode",
              onClick = onStoryMode,
              modifier = Modifier.weight(1f),
            )
            ViceQuickPill(
              label = "GARAGE",
              icon = Icons.Filled.DirectionsCar,
              tag = "menu_vehicles",
              onClick = onVehicles,
              modifier = Modifier.weight(1f),
            )
            ViceQuickPill(
              label = "MAP",
              icon = Icons.Filled.Map,
              tag = "menu_city_map",
              onClick = onCityMap,
              modifier = Modifier.weight(1f),
            )
            ViceQuickPill(
              label = "GIS",
              icon = Icons.Filled.Layers,
              tag = "menu_gis_layers",
              onClick = onGisLayers,
              modifier = Modifier.weight(0.85f),
            )
          }

          if (savedProgress != null) {
            Surface(
              shape = RoundedCornerShape(14.dp),
              color = MaterialTheme.colorScheme.surface.copy(alpha = 0.86f),
              border =
                BorderStroke(
                  1.dp,
                  Brush.horizontalGradient(listOf(vice.neonPink, vice.neonCyan)),
                ),
              modifier = Modifier.fillMaxWidth(),
            ) {
              Row(
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 9.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
              ) {
                Column {
                  Text(
                    text = "CHECKPOINT • ${savedProgress.districtName.uppercase(Locale.US)}",
                    style = MaterialTheme.typography.labelLarge,
                    color = vice.sunsetOrange,
                  )
                  Text(
                    text =
                      "₹${savedProgress.cashRupees} • ${savedProgress.completedSet().size}/5 Missions • ${savedProgress.graphicsPreset}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurface,
                  )
                }
                Icon(
                  imageVector = Icons.Filled.AutoAwesome,
                  contentDescription = null,
                  tint = vice.neonCyan,
                  modifier = Modifier.size(18.dp),
                )
              }
            }
          }
        }

        // Engine Ready Telemetry Strip
        Surface(
          shape = RoundedCornerShape(12.dp),
          color = MaterialTheme.colorScheme.surface.copy(alpha = 0.82f),
          border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
          modifier = Modifier.fillMaxWidth(),
        ) {
          Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
          ) {
            Row(
              verticalAlignment = Alignment.CenterVertically,
              horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
              Box(
                modifier =
                  Modifier.size(9.dp)
                    .clip(CircleShape)
                    .background(if (engineReady) vice.staminaTeal else vice.sunsetOrange)
              )
              Text(
                text =
                  if (engineReady) {
                    if (riggedGlbLoaded) "WEBGL ENGINE READY • PBR + RIGGED GLB"
                    else "WEBGL ENGINE READY • 6-MANAGER PBR PIPELINE"
                  } else {
                    "STREAMING RK BEACH 3D SECTOR..."
                  },
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurface,
              )
            }
            Text(
              text = "16:9 VIZAG",
              style = MaterialTheme.typography.labelSmall,
              color = vice.neonPink,
              fontWeight = FontWeight.Bold,
            )
          }
        }
      }

      // Right Menu Column: 2x4 Grid of All 8 Iconic Vice City Main Menu Buttons
      LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        modifier = Modifier.weight(1.12f).fillMaxHeight(),
        contentPadding = PaddingValues(top = 28.dp, bottom = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
      ) {
        itemsIndexed(menuItems, key = { _, item -> item.tag }) { _, item ->
          MainMenuViceButton(item = item)
        }
      }
    }
  }
}

@Composable
private fun MainMenuViceButton(item: MainMenuActionItem) {
  val vice = LocalViceColors.current
  val label = stringResource(item.labelRes)
  val interactionSource = remember { MutableInteractionSource() }
  val isHovered by interactionSource.collectIsHoveredAsState()
  val isFocused by interactionSource.collectIsFocusedAsState()
  val isPressed by interactionSource.collectIsPressedAsState()

  val isHighlighted = isHovered || isFocused || isPressed
  val scale by
    animateFloatAsState(
      targetValue = if (isPressed) 0.97f else if (isHighlighted) 1.035f else 1.0f,
      animationSpec = tween(durationMillis = 160),
      label = "menuBtnScale",
    )
  val borderColor by
    animateColorAsState(
      targetValue =
        when {
          isHighlighted -> vice.neonCyan
          item.highlightGradient -> vice.neonPink
          else -> MaterialTheme.colorScheme.outline.copy(alpha = 0.9f)
        },
      animationSpec = tween(durationMillis = 180),
      label = "menuBtnBorder",
    )

  val backgroundBrush =
    if (item.highlightGradient || isHighlighted) {
      Brush.linearGradient(
        colors =
          listOf(
            vice.neonPink.copy(alpha = if (isHighlighted) 0.95f else 0.85f),
            vice.electricPurple.copy(alpha = 0.92f),
          )
      )
    } else {
      Brush.linearGradient(
        colors =
          listOf(
            MaterialTheme.colorScheme.surface.copy(alpha = 0.90f),
            MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.88f),
          )
      )
    }

  val shape = RoundedCornerShape(14.dp)
  Box(
    modifier =
      Modifier.fillMaxWidth()
        .height(62.dp)
        .graphicsLayer {
          scaleX = scale
          scaleY = scale
        }
        .then(
          if (isHighlighted || item.highlightGradient) {
            Modifier.shadow(
              elevation = if (isHighlighted) 12.dp else 6.dp,
              shape = shape,
              ambientColor = vice.neonCyan,
              spotColor = vice.neonPink,
            )
          } else {
            Modifier
          }
        )
        .clip(shape)
        .background(backgroundBrush)
        .border(BorderStroke(if (isHighlighted) 2.dp else 1.2.dp, borderColor), shape)
        .minimumInteractiveComponentSize()
        .clickable(interactionSource = interactionSource, indication = null, onClick = item.onClick)
        .padding(horizontal = 12.dp, vertical = 8.dp)
        .testTag(item.tag),
    contentAlignment = Alignment.CenterStart,
  ) {
    Row(
      modifier = Modifier.fillMaxWidth(),
      verticalAlignment = Alignment.CenterVertically,
      horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
      Icon(
        imageVector = item.icon,
        contentDescription = null,
        tint = if (isHighlighted || item.highlightGradient) Color.White else vice.neonCyan,
        modifier = Modifier.size(21.dp),
      )
      Column(modifier = Modifier.weight(1f)) {
        Text(
          text = label,
          style = MaterialTheme.typography.titleMedium,
          fontWeight = FontWeight.Bold,
          color = Color.White,
          maxLines = 1,
          overflow = TextOverflow.Ellipsis,
        )
        Text(
          text = item.subtitle,
          style = MaterialTheme.typography.labelSmall,
          color =
            if (isHighlighted || item.highlightGradient) Color.White.copy(alpha = 0.88f)
            else MaterialTheme.colorScheme.onSurfaceVariant,
          maxLines = 1,
          overflow = TextOverflow.Ellipsis,
        )
      }
    }
  }
}

@Composable
private fun ViceQuickPill(
  label: String,
  icon: ImageVector,
  tag: String,
  onClick: () -> Unit,
  modifier: Modifier = Modifier,
) {
  val vice = LocalViceColors.current
  val interactionSource = remember { MutableInteractionSource() }
  val isHovered by interactionSource.collectIsHoveredAsState()
  val isFocused by interactionSource.collectIsFocusedAsState()
  val border = if (isHovered || isFocused) vice.neonCyan else vice.neonPink.copy(alpha = 0.55f)

  Surface(
    shape = RoundedCornerShape(10.dp),
    color = MaterialTheme.colorScheme.surface.copy(alpha = 0.84f),
    border = BorderStroke(1.2.dp, border),
    modifier =
      modifier
        .height(48.dp)
        .minimumInteractiveComponentSize()
        .clickable(interactionSource = interactionSource, indication = null, onClick = onClick)
        .testTag(tag),
  ) {
    Row(
      modifier = Modifier.padding(horizontal = 6.dp),
      horizontalArrangement = Arrangement.Center,
      verticalAlignment = Alignment.CenterVertically,
    ) {
      Icon(
        imageVector = icon,
        contentDescription = null,
        tint = vice.neonCyan,
        modifier = Modifier.size(15.dp),
      )
      Spacer(modifier = Modifier.width(4.dp))
      Text(
        text = label,
        style = MaterialTheme.typography.labelSmall,
        fontWeight = FontWeight.Bold,
        color = Color.White,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
      )
    }
  }
}

@Composable
fun LoadGameOverlay(
  savedProgress: PlayerSaveEntity?,
  featuredDistricts: List<VizagDistrict>,
  onLoadCheckpoint: () -> Unit,
  onSpawnAtDistrict: (VizagDistrict) -> Unit,
  onClose: () -> Unit,
  modifier: Modifier = Modifier,
) {
  BackHandler(onBack = onClose)
  val vice = LocalViceColors.current

  Box(modifier = modifier.fillMaxSize().testTag("load_game_overlay")) {
    VizagAnimatedBackdrop(scrimAlpha = 0.88f, showScenicBadge = false, showPalms = true)

    Column(
      modifier =
        Modifier.fillMaxSize()
          .windowInsetsPadding(WindowInsets.safeDrawing)
          .padding(horizontal = 22.dp, vertical = 14.dp),
      verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
      ) {
        Column {
          Text(
            text = "LOAD GAME & COASTAL CHECKPOINTS",
            style = MaterialTheme.typography.headlineSmall,
            color = vice.neonCyan,
          )
          Text(
            text = "Resume your saved Room session or drop straight into an iconic Vizag landmark",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
          )
        }
        IconButton(
          onClick = onClose,
          modifier = Modifier.size(48.dp).testTag("close_load_game_button"),
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
        // Primary Saved Slot Card
        Surface(
          shape = RoundedCornerShape(18.dp),
          color = MaterialTheme.colorScheme.surface.copy(alpha = 0.92f),
          border = BorderStroke(1.5.dp, vice.neonPink),
          modifier = Modifier.weight(0.95f).fillMaxHeight(),
        ) {
          Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.SpaceBetween,
          ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
              Text(
                text = "PRIMARY ROOM SAVE SLOT #1",
                style = MaterialTheme.typography.labelLarge,
                color = vice.sunsetOrange,
              )
              if (savedProgress != null) {
                val timeStr =
                  SimpleDateFormat("MMM dd, HH:mm:ss", Locale.US).format(Date(savedProgress.updatedAt))
                Text(
                  text = savedProgress.districtName.uppercase(Locale.US),
                  style = MaterialTheme.typography.headlineMedium,
                  color = Color.White,
                )
                Text(
                  text =
                    "Balance: ₹${savedProgress.cashRupees} • Missions: ${savedProgress.completedSet().size}/5\nWeather: ${savedProgress.weatherKey} • Preset: ${savedProgress.graphicsPreset}\nLast Saved: $timeStr",
                  style = MaterialTheme.typography.bodyMedium,
                  color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
              } else {
                Text(
                  text = "NO CHECKPOINT YET",
                  style = MaterialTheme.typography.titleLarge,
                  color = Color.White,
                )
                Text(
                  text =
                    "Play a session or tap below to launch RK Beach Sunset Promenade and auto-create Slot #1.",
                  style = MaterialTheme.typography.bodyMedium,
                  color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
              }
            }

            Button(
              onClick = onLoadCheckpoint,
              colors =
                ButtonDefaults.buttonColors(
                  containerColor = vice.neonPink,
                  contentColor = Color.White,
                ),
              modifier = Modifier.fillMaxWidth().height(50.dp).testTag("load_primary_slot_button"),
            ) {
              Icon(Icons.Filled.Restore, contentDescription = null)
              Spacer(modifier = Modifier.width(8.dp))
              Text(
                text = if (savedProgress != null) "LOAD SAVED SESSION" else "START AT RK BEACH",
                style = MaterialTheme.typography.labelLarge,
              )
            }
          }
        }

        // Quick Landmark Spawn Slots
        LazyColumn(
          modifier = Modifier.weight(1.1f).fillMaxHeight(),
          verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
          items(featuredDistricts, key = { it.id }) { district ->
            Surface(
              shape = RoundedCornerShape(14.dp),
              color = MaterialTheme.colorScheme.surface.copy(alpha = 0.88f),
              border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            ) {
              Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
              ) {
                Column(modifier = Modifier.weight(1f)) {
                  Text(
                    text = district.name.uppercase(Locale.US),
                    style = MaterialTheme.typography.titleMedium,
                    color = vice.neonCyan,
                  )
                  Text(
                    text = district.subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                  )
                }
                Spacer(modifier = Modifier.width(10.dp))
                OutlinedButton(
                  onClick = { onSpawnAtDistrict(district) },
                  border = BorderStroke(1.dp, vice.neonCyan),
                  modifier = Modifier.height(48.dp).testTag("load_district_${district.id}"),
                ) {
                  Icon(
                    imageVector = Icons.Filled.LocationOn,
                    contentDescription = null,
                    tint = vice.neonPink,
                    modifier = Modifier.size(16.dp),
                  )
                  Spacer(modifier = Modifier.width(4.dp))
                  Text("DEPLOY", style = MaterialTheme.typography.labelLarge, color = Color.White)
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
fun VizagCoastalLogoCrest(size: Int = 62) {
  val vice = LocalViceColors.current
  Surface(
    shape = RoundedCornerShape(16.dp),
    color = vice.twilightIndigo.copy(alpha = 0.92f),
    border =
      BorderStroke(
        2.dp,
        Brush.linearGradient(listOf(vice.neonPink, vice.sunsetOrange, vice.neonCyan)),
      ),
    modifier = Modifier.size(size.dp),
  ) {
    Canvas(modifier = Modifier.fillMaxSize().padding(7.dp)) {
      val w = this.size.width
      val h = this.size.height

      // Retro 1980s Sunset Sun Disc
      drawCircle(
        brush = Brush.verticalGradient(listOf(vice.sunsetGold, vice.sunsetOrange, vice.neonPink)),
        radius = w * 0.30f,
        center = Offset(w * 0.52f, h * 0.42f),
      )

      // Palm silhouette in foreground
      val trunkStart = Offset(w * 0.25f, h * 0.86f)
      val trunkTop = Offset(w * 0.46f, h * 0.36f)
      drawLine(
        color = vice.twilightIndigo,
        start = trunkStart,
        end = trunkTop,
        strokeWidth = 3.dp.toPx(),
        cap = StrokeCap.Round,
      )
      listOf(-150f, -95f, -30f, 20f).forEach { deg ->
        val rad = (deg * PI / 180.0).toFloat()
        drawLine(
          color = vice.twilightIndigo,
          start = trunkTop,
          end = Offset(trunkTop.x + cos(rad) * w * 0.25f, trunkTop.y + sin(rad) * h * 0.20f),
          strokeWidth = 2.dp.toPx(),
          cap = StrokeCap.Round,
        )
      }

      // Neon Cyan Bay of Bengal Stripes
      drawLine(
        color = vice.neonCyan,
        start = Offset(0f, h * 0.78f),
        end = Offset(w, h * 0.78f),
        strokeWidth = 2.4.dp.toPx(),
      )
      drawLine(
        color = vice.neonPink,
        start = Offset(w * 0.14f, h * 0.90f),
        end = Offset(w * 0.92f, h * 0.90f),
        strokeWidth = 2.dp.toPx(),
      )
      drawCircle(
        color = vice.neonCyan.copy(alpha = 0.25f),
        radius = w * 0.48f,
        center = Offset(w * 0.5f, h * 0.5f),
        style = Stroke(width = 1.dp.toPx()),
      )
    }
  }
}
