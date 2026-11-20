package com.example.viewmodel

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.bridge.VizagBridgeController
import com.example.data.PlayerSaveEntity
import com.example.data.VizagGameRepository
import com.example.model.ActiveOverlay
import com.example.model.AssetManifestEntry
import com.example.model.GameTelemetry
import com.example.model.GarageVehicleSpec
import com.example.model.GisDatasetStatus
import com.example.model.GisLayerState
import com.example.model.GisPoiItem
import com.example.model.GraphicsPreset
import com.example.model.GraphicsSettingsState
import com.example.model.SettingsTab
import com.example.model.VizagDistrict
import com.example.model.VizagMission
import com.example.model.WeatherType
import java.io.File
import kotlin.math.hypot
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

class GameViewModel(private val repository: VizagGameRepository) : ViewModel() {

  val savedProgress: StateFlow<PlayerSaveEntity?> =
    repository.primarySaveFlow.stateIn(
      scope = viewModelScope,
      started = SharingStarted.WhileSubscribed(5000),
      initialValue = null,
    )

  private val _telemetry = MutableStateFlow(GameTelemetry())
  val telemetry: StateFlow<GameTelemetry> = _telemetry.asStateFlow()

  private val _overlay = MutableStateFlow(ActiveOverlay.MAIN_MENU)
  val overlay: StateFlow<ActiveOverlay> = _overlay.asStateFlow()

  private val _returnOverlay = MutableStateFlow(ActiveOverlay.MAIN_MENU)

  private val _graphicsSettings = MutableStateFlow(GraphicsSettingsState())
  val graphicsSettings: StateFlow<GraphicsSettingsState> = _graphicsSettings.asStateFlow()

  private val _selectedSettingsTab = MutableStateFlow(SettingsTab.GRAPHICS)
  val selectedSettingsTab: StateFlow<SettingsTab> = _selectedSettingsTab.asStateFlow()

  private val _assetManifest = MutableStateFlow(VizagGameRepository.DEFAULT_ASSET_MANIFEST)
  val assetManifest: StateFlow<List<AssetManifestEntry>> = _assetManifest.asStateFlow()

  private val _gisLayers = MutableStateFlow(VizagGameRepository.DEFAULT_GIS_LAYERS)
  val gisLayers: StateFlow<List<GisLayerState>> = _gisLayers.asStateFlow()

  private val _gisDatasets = MutableStateFlow(VizagGameRepository.DEFAULT_GIS_DATASETS)
  val gisDatasets: StateFlow<List<GisDatasetStatus>> = _gisDatasets.asStateFlow()

  private val _gisPois = MutableStateFlow(VizagGameRepository.DEFAULT_GIS_POIS)
  val gisPois: StateFlow<List<GisPoiItem>> = _gisPois.asStateFlow()

  private val _isImportingGis = MutableStateFlow(false)
  val isImportingGis: StateFlow<Boolean> = _isImportingGis.asStateFlow()

  private val _isSprintToggled = MutableStateFlow(false)
  val isSprintToggled: StateFlow<Boolean> = _isSprintToggled.asStateFlow()

  private val _autoCycle = MutableStateFlow(true)
  val autoCycle: StateFlow<Boolean> = _autoCycle.asStateFlow()

  private val _cashRupees = MutableStateFlow(1500)
  val cashRupees: StateFlow<Int> = _cashRupees.asStateFlow()

  private val _completedMissions = MutableStateFlow<Set<Int>>(emptySet())
  val completedMissions: StateFlow<Set<Int>> = _completedMissions.asStateFlow()

  private val _bannerMessage = MutableStateFlow<String?>(null)
  val bannerMessage: StateFlow<String?> = _bannerMessage.asStateFlow()

  private var totalDistanceMeters: Float = 0f
  private var lastPosInitialized = false
  private var lastX = 0f
  private var lastZ = 1.77f
  private var bannerClearJob: Job? = null
  private var pendingRestoreSave: PlayerSaveEntity? = null

  val districts: List<VizagDistrict> = VizagGameRepository.VIZAG_DISTRICTS
  val missions: List<VizagMission> = VizagGameRepository.PROTOTYPE_MISSIONS
  val garageVehicles: List<GarageVehicleSpec> = VizagGameRepository.GARAGE_VEHICLES

  val bridge =
    VizagBridgeController(
      onEngineReadyCallback = { handleEngineReady() },
      onTelemetryCallback = { json -> parseTelemetry(json) },
      onMissionCompletedCallback = { idx, reward -> handleMissionCompleted(idx, reward) },
      onNotificationCallback = { msg -> showBanner(msg) },
      onAssetManifestCallback = { json -> parseAssetManifest(json) },
      onGisStateChangedCallback = { json -> parseGisState(json) },
    )

  init {
    viewModelScope.launch {
      val existing = repository.getPrimarySave()
      if (existing != null) {
        _cashRupees.value = existing.cashRupees
        _completedMissions.value = existing.completedSet()
        _autoCycle.value = existing.autoCycle
        totalDistanceMeters = existing.totalDistanceMeters
        _graphicsSettings.value =
          GraphicsSettingsState(
            preset = GraphicsPreset.fromName(existing.graphicsPreset),
            resolutionScale = existing.resolutionScale,
            shadowsEnabled = existing.shadowsEnabled,
            drawDistance = existing.drawDistance,
            targetFps = existing.targetFps,
            audioEnabled = existing.audioEnabled,
          )
      }
    }

    // Automatic periodic save while actively playing in the 3D world
    viewModelScope.launch {
      while (true) {
        delay(20_000L)
        if (_overlay.value == ActiveOverlay.NONE && _telemetry.value.engineReady) {
          persistCurrentStateSilently()
        }
      }
    }
  }

  private fun handleEngineReady() {
    _telemetry.update { it.copy(engineReady = true) }
    val g = _graphicsSettings.value
    bridge.applyCustomGraphics(
      g.resolutionScale,
      g.shadowsEnabled,
      g.drawDistance,
      g.targetFps,
      g.shadowMapSize,
      g.textureAnisotropy,
      g.antiAliasing,
    )
    bridge.setAudioEnabled(g.audioEnabled)
    bridge.setAudioVolume(g.audioVolume)
    bridge.setPaused(_overlay.value != ActiveOverlay.NONE)

    val pending = pendingRestoreSave
    if (pending != null) {
      pendingRestoreSave = null
      applySaveToEngine(pending)
    }
    if (_overlay.value == ActiveOverlay.LOADING) {
      enterGameplayNow()
    }
  }

  private fun parseAssetManifest(jsonString: String) {
    runCatching {
      val arr = JSONArray(jsonString)
      val parsed = buildList {
        for (i in 0 until arr.length()) {
          val obj = arr.getJSONObject(i)
          add(
            AssetManifestEntry(
              id = obj.optString("id"),
              title = obj.optString("title"),
              localPath = obj.optString("localPath"),
              status = obj.optString("status"),
              detail = obj.optString("detail"),
            )
          )
        }
      }
      if (parsed.isNotEmpty()) {
        _assetManifest.value = parsed
      }
    }
  }

  private fun parseGisState(jsonString: String) {
    runCatching {
      val root = JSONObject(jsonString)
      val layersArr = root.optJSONArray("layers")
      if (layersArr != null) {
        val parsedLayers = buildList {
          for (i in 0 until layersArr.length()) {
            val o = layersArr.getJSONObject(i)
            add(
              GisLayerState(
                id = o.optString("id"),
                name = o.optString("name"),
                visible = o.optBoolean("visible", true),
                sourceType = o.optString("sourceType", "CURATED_REF"),
                sourceName = o.optString("sourceName", ""),
                featureCount = o.optInt("count", 0),
              )
            )
          }
        }
        if (parsedLayers.isNotEmpty()) _gisLayers.value = parsedLayers
      }

      val dsArr = root.optJSONArray("datasets")
      if (dsArr != null) {
        val parsedDs = buildList {
          for (i in 0 until dsArr.length()) {
            val o = dsArr.getJSONObject(i)
            add(
              GisDatasetStatus(
                id = o.optString("id"),
                title = o.optString("title"),
                expectedFormat = o.optString("expectedFormat"),
                status = o.optString("status"),
                detail = o.optString("detail"),
              )
            )
          }
        }
        if (parsedDs.isNotEmpty()) _gisDatasets.value = parsedDs
      }

      val poiArr = root.optJSONArray("pois")
      if (poiArr != null) {
        val parsedPois = buildList {
          for (i in 0 until poiArr.length()) {
            val o = poiArr.getJSONObject(i)
            add(
              GisPoiItem(
                name = o.optString("name"),
                x = o.optDouble("x", 0.0).toFloat(),
                z = o.optDouble("z", 0.0).toFloat(),
                category = o.optString("category", "POI"),
              )
            )
          }
        }
        _gisPois.value = parsedPois
      }
    }
  }

  fun toggleGisLayer(layerId: String, visible: Boolean) {
    _gisLayers.update { list ->
      list.map { if (it.id == layerId) it.copy(visible = visible) else it }
    }
    bridge.setGisLayerVisibility(layerId, visible)
  }

  fun importGisDocument(context: Context, uri: Uri, layerHint: String = "auto") {
    viewModelScope.launch {
      _isImportingGis.value = true
      val result =
        withContext(Dispatchers.IO) {
          runCatching {
            val resolver = context.contentResolver
            var displayName =
              resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c ->
                if (c.moveToFirst()) c.getString(0) else null
              }
            if (displayName.isNullOrBlank()) {
              displayName = uri.lastPathSegment?.substringAfterLast('/') ?: "gis_import.geojson"
            }
            val mime = resolver.getType(uri).orEmpty().lowercase()
            if (!displayName.contains('.')) {
              val ext =
                when {
                  mime.contains("kml") -> ".kml"
                  mime.contains("tiff") -> ".tif"
                  mime.contains("png") -> ".png"
                  mime.contains("jpeg") || mime.contains("jpg") -> ".jpg"
                  mime.contains("gltf") -> ".glb"
                  else -> ".geojson"
                }
              displayName += ext
            }
            val safeBase = displayName.replace(Regex("[^A-Za-z0-9._-]"), "_")
            val storedName = "${System.currentTimeMillis()}_$safeBase"
            val importsDir = File(context.filesDir, "gis_imports").apply { mkdirs() }
            val outFile = File(importsDir, storedName)
            resolver.openInputStream(uri)?.use { input ->
              outFile.outputStream().use { output -> input.copyTo(output) }
            } ?: error("Unable to open selected file stream")
            displayName to storedName
          }
        }
      _isImportingGis.value = false
      result.fold(
        onSuccess = { (displayName, storedName) ->
          val url = "https://vizag.local/imports/$storedName"
          bridge.importGisAsset(url, displayName, layerHint)
          showBanner("Importing $displayName into GIS world...")
        },
        onFailure = { err ->
          showBanner("Import error: ${err.message ?: "unreadable file"}")
        },
      )
    }
  }

  private fun parseTelemetry(jsonString: String) {
    runCatching {
      val obj = JSONObject(jsonString)
      val px = obj.optDouble("x", 3.5).toFloat()
      val py = obj.optDouble("y", 1.85).toFloat()
      val pz = obj.optDouble("z", 12.0).toFloat()

      if (lastPosInitialized) {
        val step = hypot(px - lastX, pz - lastZ)
        if (step in 0.05f..45f) {
          totalDistanceMeters += step
        }
      } else {
        lastPosInitialized = true
      }
      lastX = px
      lastZ = pz

      val navArr = obj.optJSONArray("navRoute")
      val navPts =
        if (navArr != null) {
          buildList {
            for (i in 0 until navArr.length()) {
              val pt = navArr.optJSONObject(i) ?: continue
              add(
                com.example.model.NavPoint(
                  x = pt.optDouble("x", 0.0).toFloat(),
                  z = pt.optDouble("z", 0.0).toFloat(),
                )
              )
            }
          }
        } else {
          emptyList()
        }

      _telemetry.value =
        GameTelemetry(
          engineReady = true,
          playerX = px,
          playerY = py,
          playerZ = pz,
          playerYaw = obj.optDouble("yaw", 3.14).toFloat(),
          playerHealth = obj.optInt("health", 100),
          playerStamina = obj.optInt("stamina", 100),
          latitude = obj.optDouble("lat", 17.7142),
          longitude = obj.optDouble("lng", 83.3236),
          districtName = obj.optString("district", "RK Beach"),
          speedKmh = obj.optInt("speedKmh", 0),
          inVehicle = obj.optBoolean("inVehicle", false),
          vehicleName = obj.optString("vehicleName", ""),
          vehicleType = obj.optString("vehicleType", ""),
          vehicleCondition = obj.optInt("vehicleCondition", 100),
          nearbyVehicleName = obj.optString("nearbyVehicle", ""),
          nearbyVehicleDistance = obj.optDouble("nearbyDist", 99.0).toFloat(),
          interactHint = obj.optString("interactHint", ""),
          interiorName = obj.optString("interiorName", ""),
          floorLabel = obj.optString("floorLabel", ""),
          isSeated = obj.optBoolean("isSeated", false),
          navRoute = navPts,
          riggedGlbLoaded = obj.optBoolean("riggedGlb", false),
          isSprinting = _isSprintToggled.value,
          isGrounded = obj.optBoolean("grounded", true),
          timeOfDay = obj.optDouble("timeOfDay", 16.4).toFloat(),
          weather = WeatherType.fromKey(obj.optString("weather", "SUNNY")),
          activeChunks = obj.optInt("chunks", 9),
          fps = obj.optInt("fps", 60),
          activeMissionIndex = obj.optInt("missionIdx", 0),
          waypointX = obj.optDouble("wpX", 16.0).toFloat(),
          waypointZ = obj.optDouble("wpZ", -36.0).toFloat(),
          waypointLabel = obj.optString("wpLabel", "1. Kursura Recon"),
          waypointDistanceMeters = obj.optInt("wpDist", 48),
        )
    }
  }

  private fun handleMissionCompleted(missionIndex: Int, rewardRupees: Int) {
    viewModelScope.launch {
      val alreadyDone = _completedMissions.value.contains(missionIndex)
      val actualReward = if (alreadyDone) rewardRupees / 2 else rewardRupees
      _completedMissions.update { it + missionIndex }
      _cashRupees.update { it + actualReward }
      val missionTitle =
        missions.getOrNull(missionIndex)?.title ?: "Vizag Objective #${missionIndex + 1}"
      showBanner("MISSION COMPLETE • $missionTitle (+₹$actualReward)")
      persistCurrentStateSilently()
    }
  }

  private fun enterGameplayNow() {
    _overlay.value = ActiveOverlay.NONE
    _returnOverlay.value = ActiveOverlay.PAUSE_MENU
    bridge.setPaused(false)
  }

  fun startNewGame() {
    viewModelScope.launch {
      _isSprintToggled.value = false
      _completedMissions.value = emptySet()
      _cashRupees.value = 1500
      totalDistanceMeters = 0f
      bridge.setSprint(false)
      bridge.setTimeOfDay(16.4f, true)
      bridge.setWeather("SUNNY")
      bridge.teleportPlayer(0f, 1.77f, 2.28f)
      bridge.selectMission(0)
      enterGameplayNow()
      persistCurrentStateSilently()
      showBanner("RK Beach, Visakhapatnam • Stage 1 Active")
    }
  }

  fun startFreeRoam() {
    _isSprintToggled.value = false
    bridge.setSprint(false)
    enterGameplayNow()
    showBanner("Free Roam • Explore RK Beach & Beach Road")
  }

  fun continueSavedGame() {
    val save = savedProgress.value
    if (save == null) {
      startNewGame()
      return
    }
    _cashRupees.value = save.cashRupees
    _completedMissions.value = save.completedSet()
    _autoCycle.value = save.autoCycle
    totalDistanceMeters = save.totalDistanceMeters
    if (_telemetry.value.engineReady) {
      applySaveToEngine(save)
      enterGameplayNow()
    } else {
      pendingRestoreSave = save
      enterGameplayNow()
    }
    showBanner("Resumed saved session in ${save.districtName}")
  }

  private fun applySaveToEngine(save: PlayerSaveEntity) {
    bridge.applySavedWorldState(
      x = save.posX,
      z = save.posZ,
      yaw = save.yaw,
      timeOfDay = save.timeOfDay,
      autoCycle = save.autoCycle,
      weatherKey = save.weatherKey,
      missionIndex = save.activeMissionIndex,
    )
  }

  fun openSubMenu(target: ActiveOverlay, fromMainMenu: Boolean = false) {
    bridge.setJoystick(0f, 0f)
    bridge.setDrivingControls(0f, 0f, 0f, 0f)
    bridge.setPaused(true)
    if (fromMainMenu) {
      _returnOverlay.value = ActiveOverlay.MAIN_MENU
    } else if (_overlay.value == ActiveOverlay.NONE) {
      _returnOverlay.value = ActiveOverlay.NONE
    }
    _overlay.value = target
  }

  fun pauseGameplay() {
    bridge.setJoystick(0f, 0f)
    bridge.setDrivingControls(0f, 0f, 0f, 0f)
    bridge.setPaused(true)
    _returnOverlay.value = ActiveOverlay.NONE
    _overlay.value = ActiveOverlay.PAUSE_MENU
  }

  fun resumeFromPause() {
    enterGameplayNow()
  }

  fun returnToMainMenu() {
    viewModelScope.launch {
      if (_telemetry.value.engineReady) {
        persistCurrentStateSilently()
      }
      bridge.setPaused(true)
      _returnOverlay.value = ActiveOverlay.MAIN_MENU
      _overlay.value = ActiveOverlay.MAIN_MENU
    }
  }

  fun closeSubMenu() {
    val dest = _returnOverlay.value
    _overlay.value = dest
    bridge.setPaused(dest != ActiveOverlay.NONE)
  }

  fun openSettingsTab(tab: SettingsTab, fromMainMenu: Boolean = false) {
    _selectedSettingsTab.value = tab
    openSubMenu(ActiveOverlay.SETTINGS, fromMainMenu = fromMainMenu)
  }

  fun selectSettingsTab(tab: SettingsTab) {
    _selectedSettingsTab.value = tab
  }

  fun onJoystickMoved(x: Float, y: Float) {
    bridge.setJoystick(x, y)
  }

  fun onCameraDragged(dxPx: Float, dyPx: Float) {
    val sens = _graphicsSettings.value.cameraSensitivity
    val ySign = if (_graphicsSettings.value.invertCameraY) -1f else 1f
    bridge.addCameraDelta(dxPx * 0.0052f * sens, dyPx * 0.0040f * sens * ySign)
  }

  fun onJumpPressed() {
    bridge.triggerJump()
  }

  fun onToggleSprint() {
    val next = !_isSprintToggled.value
    _isSprintToggled.value = next
    bridge.setSprint(next)
  }

  fun onInteractPressed() {
    bridge.triggerInteract()
  }

  fun onEnterOrExitVehicle() {
    if (_telemetry.value.inVehicle) {
      bridge.setDrivingControls(0f, 0f, 0f, 0f)
    }
    bridge.toggleVehicle()
  }

  fun onDrivingControlsChanged(throttle: Float, brake: Float, reverse: Float, handbrake: Float) {
    bridge.setDrivingControls(throttle, brake, reverse, handbrake)
  }

  fun onHonkHorn() {
    bridge.honkHorn()
  }

  fun spawnGarageVehicle(spec: GarageVehicleSpec) {
    bridge.spawnGarageVehicle(spec.id)
    enterGameplayNow()
  }

  fun selectGraphicsPreset(preset: GraphicsPreset) {
    val updated =
      _graphicsSettings.value.copy(
        preset = preset,
        resolutionScale = preset.defaultResScale,
        shadowsEnabled = preset.defaultShadows,
        shadowMapSize = preset.defaultShadowSize,
        textureAnisotropy = preset.defaultAnisotropy,
        antiAliasing = preset.defaultAa,
        drawDistance = preset.defaultDrawDist,
        targetFps = preset.defaultTargetFps,
      )
    _graphicsSettings.value = updated
    bridge.applyGraphicsPreset(preset.name)
    viewModelScope.launch { persistCurrentStateSilently() }
    showBanner("Graphics Preset: ${preset.label}")
  }

  fun updateCustomGraphics(
    resolutionScale: Float = _graphicsSettings.value.resolutionScale,
    shadowsEnabled: Boolean = _graphicsSettings.value.shadowsEnabled,
    shadowMapSize: Int = _graphicsSettings.value.shadowMapSize,
    textureAnisotropy: Int = _graphicsSettings.value.textureAnisotropy,
    antiAliasing: Boolean = _graphicsSettings.value.antiAliasing,
    drawDistance: Float = _graphicsSettings.value.drawDistance,
    targetFps: Int = _graphicsSettings.value.targetFps,
    audioEnabled: Boolean = _graphicsSettings.value.audioEnabled,
    audioVolume: Float = _graphicsSettings.value.audioVolume,
  ) {
    val updated =
      _graphicsSettings.value.copy(
        resolutionScale = resolutionScale.coerceIn(0.55f, 1.5f),
        shadowsEnabled = shadowsEnabled,
        shadowMapSize = shadowMapSize.coerceIn(512, 2048),
        textureAnisotropy = textureAnisotropy.coerceIn(1, 8),
        antiAliasing = antiAliasing,
        drawDistance = drawDistance.coerceIn(180f, 700f),
        targetFps = targetFps,
        audioEnabled = audioEnabled,
        audioVolume = audioVolume.coerceIn(0f, 1f),
      )
    _graphicsSettings.value = updated
    bridge.applyCustomGraphics(
      updated.resolutionScale,
      updated.shadowsEnabled,
      updated.drawDistance,
      updated.targetFps,
      updated.shadowMapSize,
      updated.textureAnisotropy,
      updated.antiAliasing,
    )
    bridge.setAudioEnabled(updated.audioEnabled)
    bridge.setAudioVolume(updated.audioVolume)
    viewModelScope.launch { persistCurrentStateSilently() }
  }

  fun updateControlsPreferences(
    cameraSensitivity: Float = _graphicsSettings.value.cameraSensitivity,
    invertCameraY: Boolean = _graphicsSettings.value.invertCameraY,
    controllerProfile: String = _graphicsSettings.value.controllerProfile,
  ) {
    _graphicsSettings.update {
      it.copy(
        cameraSensitivity = cameraSensitivity.coerceIn(0.4f, 2.2f),
        invertCameraY = invertCameraY,
        controllerProfile = controllerProfile,
      )
    }
  }

  fun setTimeOfDay(hour: Float) {
    val clamped = hour.coerceIn(0f, 23.99f)
    _telemetry.update { it.copy(timeOfDay = clamped) }
    bridge.setTimeOfDay(clamped, _autoCycle.value)
  }

  fun setAutoCycle(enabled: Boolean) {
    _autoCycle.value = enabled
    bridge.setTimeOfDay(_telemetry.value.timeOfDay, enabled)
  }

  fun setWeather(weather: WeatherType) {
    _telemetry.update { it.copy(weather = weather) }
    bridge.setWeather(weather.jsKey)
    showBanner("Weather: ${weather.label}")
  }

  fun setWaypointToDistrict(district: VizagDistrict) {
    bridge.setCustomWaypoint(district.worldX, district.worldZ, district.name)
    enterGameplayNow()
    showBanner("GPS Waypoint set to ${district.name}")
  }

  fun fastTravelToDistrict(district: VizagDistrict) {
    bridge.teleportPlayer(district.worldX, district.worldZ + 8f, 3.14f)
    enterGameplayNow()
    showBanner("Streamed zone: ${district.name}")
  }

  fun activateMission(mission: VizagMission) {
    bridge.selectMission(mission.index)
    enterGameplayNow()
    showBanner("Mission Active: ${mission.title}")
  }

  fun saveProgressManually() {
    viewModelScope.launch {
      persistCurrentStateSilently()
      showBanner("Saved game progress locally")
    }
  }

  private suspend fun persistCurrentStateSilently() {
    val t = _telemetry.value
    val g = _graphicsSettings.value
    val entity =
      PlayerSaveEntity(
        slotId = 1,
        posX = t.playerX,
        posY = t.playerY,
        posZ = t.playerZ,
        yaw = t.playerYaw,
        districtName = t.districtName,
        timeOfDay = t.timeOfDay,
        autoCycle = _autoCycle.value,
        weatherKey = t.weather.jsKey,
        activeMissionIndex = t.activeMissionIndex,
        completedMissionsCsv = _completedMissions.value.sorted().joinToString(","),
        cashRupees = _cashRupees.value,
        totalDistanceMeters = totalDistanceMeters,
        graphicsPreset = g.preset.name,
        resolutionScale = g.resolutionScale,
        shadowsEnabled = g.shadowsEnabled,
        drawDistance = g.drawDistance,
        targetFps = g.targetFps,
        audioEnabled = g.audioEnabled,
      )
    repository.saveProgress(entity)
  }

  fun showBanner(message: String) {
    bannerClearJob?.cancel()
    _bannerMessage.value = message
    bannerClearJob =
      viewModelScope.launch {
        delay(3400L)
        _bannerMessage.value = null
      }
  }

  class Factory(private val repository: VizagGameRepository) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
      return GameViewModel(repository) as T
    }
  }
}
