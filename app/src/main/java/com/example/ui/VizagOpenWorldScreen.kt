package com.example.ui

import android.app.Activity
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.model.ActiveOverlay
import com.example.model.SettingsTab
import com.example.ui.components.MobileGameplayControls
import com.example.ui.components.TopTacticalHud
import com.example.ui.components.VizagWebGLView
import com.example.ui.overlays.AboutAndAssetRegistryOverlay
import com.example.ui.overlays.GisLayersAndImportOverlay
import com.example.ui.overlays.GraphicsAndEnvironmentSettingsOverlay
import com.example.ui.overlays.LandscapeLoadingOverlay
import com.example.ui.overlays.LandscapePauseMenuOverlay
import com.example.ui.overlays.LoadGameOverlay
import com.example.ui.overlays.RotateDeviceOverlay
import com.example.ui.overlays.StoryAndMissionsOverlay
import com.example.ui.overlays.VehiclesGarageOverlay
import com.example.ui.overlays.VizagLandscapeMainMenu
import com.example.ui.overlays.VizagMapOverlay
import com.example.viewmodel.GameViewModel

@Composable
fun VizagOpenWorldScreen(
  viewModel: GameViewModel,
  modifier: Modifier = Modifier,
) {
  val context = LocalContext.current
  val telemetry by viewModel.telemetry.collectAsStateWithLifecycle()
  val overlay by viewModel.overlay.collectAsStateWithLifecycle()
  val graphicsSettings by viewModel.graphicsSettings.collectAsStateWithLifecycle()
  val selectedSettingsTab by viewModel.selectedSettingsTab.collectAsStateWithLifecycle()
  val assetManifest by viewModel.assetManifest.collectAsStateWithLifecycle()
  val gisLayers by viewModel.gisLayers.collectAsStateWithLifecycle()
  val gisDatasets by viewModel.gisDatasets.collectAsStateWithLifecycle()
  val gisPois by viewModel.gisPois.collectAsStateWithLifecycle()
  val isImportingGis by viewModel.isImportingGis.collectAsStateWithLifecycle()
  val isSprintActive by viewModel.isSprintToggled.collectAsStateWithLifecycle()
  val autoCycle by viewModel.autoCycle.collectAsStateWithLifecycle()
  val cashRupees by viewModel.cashRupees.collectAsStateWithLifecycle()
  val completedMissions by viewModel.completedMissions.collectAsStateWithLifecycle()
  val savedProgress by viewModel.savedProgress.collectAsStateWithLifecycle()
  val bannerMessage by viewModel.bannerMessage.collectAsStateWithLifecycle()

  // Hardware/system Back during active gameplay opens the Landscape Pause Menu
  BackHandler(enabled = overlay == ActiveOverlay.NONE) {
    viewModel.pauseGameplay()
  }

  BoxWithConstraints(
    modifier = modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)
  ) {
    val isPortraitViewport = maxWidth < maxHeight

    // Layer 1: Live Three.js WebGL 3D Open-World Viewport (kept mounted to preserve world state)
    VizagWebGLView(
      bridge = viewModel.bridge,
      modifier = Modifier.fillMaxSize(),
    )

    // Strict Landscape Guard: Never stretch or render horizontal gameplay UI into portrait
    if (isPortraitViewport) {
      RotateDeviceOverlay()
    } else {
      // Layer 2: Active Landscape Gameplay HUD & Multi-Touch Controls
      if (overlay == ActiveOverlay.NONE) {
        MobileGameplayControls(
          telemetry = telemetry,
          isSprintActive = isSprintActive,
          onJoystickChanged = viewModel::onJoystickMoved,
          onCameraDragged = viewModel::onCameraDragged,
          onJump = viewModel::onJumpPressed,
          onToggleSprint = viewModel::onToggleSprint,
          onInteract = viewModel::onInteractPressed,
          onEnterOrExitVehicle = viewModel::onEnterOrExitVehicle,
          onDrivingControlsChanged = viewModel::onDrivingControlsChanged,
          onHonkHorn = viewModel::onHonkHorn,
          modifier = Modifier.fillMaxSize(),
        )

        TopTacticalHud(
          telemetry = telemetry,
          cashRupees = cashRupees,
          bannerMessage = bannerMessage,
          onOpenMap = { viewModel.openSubMenu(ActiveOverlay.CITY_MAP, fromMainMenu = false) },
          onOpenMissions = { viewModel.openSubMenu(ActiveOverlay.STORY_MODE, fromMainMenu = false) },
          onOpenSettings = { viewModel.openSubMenu(ActiveOverlay.SETTINGS, fromMainMenu = false) },
          onPause = viewModel::pauseGameplay,
          modifier = Modifier.align(Alignment.TopCenter),
        )
      }

      // Layer 3: Full-Screen 16:9 Vice Neon Menus & Sub-Screens
      when (overlay) {
        ActiveOverlay.NONE -> Unit
        ActiveOverlay.LOADING -> {
          LandscapeLoadingOverlay()
        }
        ActiveOverlay.MAIN_MENU -> {
          VizagLandscapeMainMenu(
            engineReady = telemetry.engineReady,
            riggedGlbLoaded = telemetry.riggedGlbLoaded,
            savedProgress = savedProgress,
            onNewGame = viewModel::startNewGame,
            onContinueGame = viewModel::continueSavedGame,
            onLoadGame = { viewModel.openSubMenu(ActiveOverlay.LOAD_GAME, fromMainMenu = true) },
            onSettings = {
              viewModel.openSettingsTab(SettingsTab.AUDIO_WORLD, fromMainMenu = true)
            },
            onGraphics = {
              viewModel.openSettingsTab(SettingsTab.GRAPHICS, fromMainMenu = true)
            },
            onControls = {
              viewModel.openSettingsTab(SettingsTab.CONTROLS, fromMainMenu = true)
            },
            onCredits = { viewModel.openSubMenu(ActiveOverlay.ABOUT_ASSETS, fromMainMenu = true) },
            onExitGame = {
              viewModel.saveProgressManually()
              (context as? Activity)?.finish()
            },
            onStoryMode = { viewModel.openSubMenu(ActiveOverlay.STORY_MODE, fromMainMenu = true) },
            onFreeRoam = viewModel::startFreeRoam,
            onVehicles = { viewModel.openSubMenu(ActiveOverlay.VEHICLES_GARAGE, fromMainMenu = true) },
            onCityMap = { viewModel.openSubMenu(ActiveOverlay.CITY_MAP, fromMainMenu = true) },
            onGisLayers = { viewModel.openSubMenu(ActiveOverlay.GIS_LAYERS, fromMainMenu = true) },
          )
        }
        ActiveOverlay.LOAD_GAME -> {
          LoadGameOverlay(
            savedProgress = savedProgress,
            featuredDistricts = viewModel.districts.take(6),
            onLoadCheckpoint = viewModel::continueSavedGame,
            onSpawnAtDistrict = viewModel::fastTravelToDistrict,
            onClose = viewModel::closeSubMenu,
          )
        }
        ActiveOverlay.PAUSE_MENU -> {
          LandscapePauseMenuOverlay(
            telemetry = telemetry,
            cashRupees = cashRupees,
            savedProgress = savedProgress,
            onResume = viewModel::resumeFromPause,
            onSaveProgress = viewModel::saveProgressManually,
            onOpenStory = { viewModel.openSubMenu(ActiveOverlay.STORY_MODE, fromMainMenu = false) },
            onOpenVehicles = { viewModel.openSubMenu(ActiveOverlay.VEHICLES_GARAGE, fromMainMenu = false) },
            onOpenMap = { viewModel.openSubMenu(ActiveOverlay.CITY_MAP, fromMainMenu = false) },
            onOpenGisLayers = { viewModel.openSubMenu(ActiveOverlay.GIS_LAYERS, fromMainMenu = false) },
            onOpenSettings = {
              viewModel.openSettingsTab(SettingsTab.GRAPHICS, fromMainMenu = false)
            },
            onOpenControls = {
              viewModel.openSettingsTab(SettingsTab.CONTROLS, fromMainMenu = false)
            },
            onOpenAbout = { viewModel.openSubMenu(ActiveOverlay.ABOUT_ASSETS, fromMainMenu = false) },
            onReturnToMainMenu = viewModel::returnToMainMenu,
          )
        }
        ActiveOverlay.STORY_MODE -> {
          StoryAndMissionsOverlay(
            missions = viewModel.missions,
            activeMissionIndex = telemetry.activeMissionIndex,
            completedMissions = completedMissions,
            cashRupees = cashRupees,
            onSelectMission = viewModel::activateMission,
            onClose = viewModel::closeSubMenu,
          )
        }
        ActiveOverlay.VEHICLES_GARAGE -> {
          VehiclesGarageOverlay(
            vehicles = viewModel.garageVehicles,
            onSpawnVehicle = viewModel::spawnGarageVehicle,
            onClose = viewModel::closeSubMenu,
          )
        }
        ActiveOverlay.CITY_MAP -> {
          VizagMapOverlay(
            telemetry = telemetry,
            districts = viewModel.districts,
            pois = gisPois,
            onSetWaypoint = viewModel::setWaypointToDistrict,
            onFastTravel = viewModel::fastTravelToDistrict,
            onOpenGisLayers = { viewModel.openSubMenu(ActiveOverlay.GIS_LAYERS, fromMainMenu = false) },
            onClose = viewModel::closeSubMenu,
          )
        }
        ActiveOverlay.GIS_LAYERS -> {
          GisLayersAndImportOverlay(
            layers = gisLayers,
            datasets = gisDatasets,
            isImporting = isImportingGis,
            onToggleLayer = viewModel::toggleGisLayer,
            onImportDocument = viewModel::importGisDocument,
            onClose = viewModel::closeSubMenu,
          )
        }
        ActiveOverlay.SETTINGS -> {
          GraphicsAndEnvironmentSettingsOverlay(
            telemetry = telemetry,
            graphicsSettings = graphicsSettings,
            selectedTab = selectedSettingsTab,
            autoCycle = autoCycle,
            savedProgress = savedProgress,
            onSelectTab = viewModel::selectSettingsTab,
            onSelectPreset = viewModel::selectGraphicsPreset,
            onResolutionScaleChanged = { scale ->
              viewModel.updateCustomGraphics(resolutionScale = scale)
            },
            onShadowSizeChanged = { sz ->
              viewModel.updateCustomGraphics(shadowMapSize = sz)
            },
            onAnisotropyChanged = { aniso ->
              viewModel.updateCustomGraphics(textureAnisotropy = aniso)
            },
            onAntiAliasingChanged = { aa ->
              viewModel.updateCustomGraphics(antiAliasing = aa)
            },
            onDrawDistanceChanged = { dist ->
              viewModel.updateCustomGraphics(drawDistance = dist)
            },
            onShadowsChanged = { enabled ->
              viewModel.updateCustomGraphics(shadowsEnabled = enabled)
            },
            onTargetFpsChanged = { fps ->
              viewModel.updateCustomGraphics(targetFps = fps)
            },
            onAudioChanged = { enabled ->
              viewModel.updateCustomGraphics(audioEnabled = enabled)
            },
            onAudioVolumeChanged = { vol ->
              viewModel.updateCustomGraphics(audioVolume = vol)
            },
            onTimeChanged = viewModel::setTimeOfDay,
            onAutoCycleChanged = viewModel::setAutoCycle,
            onWeatherChanged = viewModel::setWeather,
            onCameraSensitivityChanged = { sens ->
              viewModel.updateControlsPreferences(cameraSensitivity = sens)
            },
            onInvertCameraYChanged = { invert ->
              viewModel.updateControlsPreferences(invertCameraY = invert)
            },
            onControllerProfileChanged = { prof ->
              viewModel.updateControlsPreferences(controllerProfile = prof)
            },
            onSaveProgress = viewModel::saveProgressManually,
            onClose = viewModel::closeSubMenu,
          )
        }
        ActiveOverlay.ABOUT_ASSETS -> {
          AboutAndAssetRegistryOverlay(
            assetManifest = assetManifest,
            telemetry = telemetry,
            onClose = viewModel::closeSubMenu,
          )
        }
      }
    }
  }
}
