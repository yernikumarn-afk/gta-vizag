package com.example.model

enum class WeatherType(val jsKey: String, val label: String) {
  SUNNY("SUNNY", "Sunny"),
  CLOUDY("CLOUDY", "Cloudy"),
  RAIN("RAIN", "Rainy"),
  FOG("FOG", "Foggy"),
  STORMY("STORMY", "Stormy"),
  CLEAR_NIGHT("CLEAR_NIGHT", "Clear Night");

  companion object {
    fun fromKey(key: String): WeatherType =
      when (key.trim().uppercase()) {
        "CLEAR", "SUNNY" -> SUNNY
        "CLOUDY" -> CLOUDY
        "RAIN", "RAINY" -> RAIN
        "FOG", "FOGGY" -> FOG
        "STORMY", "STORM" -> STORMY
        "CLEAR_NIGHT", "CLEAR NIGHT" -> CLEAR_NIGHT
        else -> SUNNY
      }
  }
}

enum class GraphicsPreset(
  val label: String,
  val summary: String,
  val defaultResScale: Float,
  val defaultShadows: Boolean,
  val defaultShadowSize: Int,
  val defaultAnisotropy: Int,
  val defaultAa: Boolean,
  val defaultDrawDist: Float,
  val defaultTargetFps: Int,
) {
  LOW("LOW", "Maximum FPS & battery efficiency", 0.70f, false, 512, 1, false, 210f, 30),
  MEDIUM("MEDIUM", "Balanced clarity (Galaxy Tab A9 Recommended)", 0.94f, true, 1024, 2, true, 340f, 60),
  HIGH("HIGH", "Soft shadows, HDR bloom & 5x5 streaming", 1.15f, true, 1536, 4, true, 480f, 60),
  ULTRA("ULTRA", "Maximum PBR detail, 2K shadows & post-processing", 1.40f, true, 2048, 8, true, 680f, 60);

  companion object {
    fun fromName(name: String): GraphicsPreset =
      entries.firstOrNull { it.name.equals(name, ignoreCase = true) } ?: MEDIUM
  }
}

enum class SettingsTab(val label: String) {
  GRAPHICS("GRAPHICS"),
  AUDIO_WORLD("AUDIO & SKY"),
  CONTROLS("CONTROLS"),
}

data class GraphicsSettingsState(
  val preset: GraphicsPreset = GraphicsPreset.MEDIUM,
  val resolutionScale: Float = 0.94f,
  val shadowsEnabled: Boolean = true,
  val shadowMapSize: Int = 1024,
  val textureAnisotropy: Int = 2,
  val antiAliasing: Boolean = true,
  val drawDistance: Float = 340f,
  val targetFps: Int = 60,
  val audioEnabled: Boolean = true,
  val audioVolume: Float = 0.85f,
  val cameraSensitivity: Float = 1.0f,
  val invertCameraY: Boolean = false,
  val controllerProfile: String = "Hybrid Touch + Gamepad",
)

data class AssetManifestEntry(
  val id: String,
  val title: String,
  val localPath: String,
  val status: String,
  val detail: String,
)

data class VizagDistrict(
  val id: String,
  val name: String,
  val subtitle: String,
  val latitude: Double,
  val longitude: Double,
  val worldX: Float,
  val worldZ: Float,
  val elevationMeters: Float,
  val category: String,
)

data class VizagMission(
  val index: Int,
  val id: String,
  val chapter: String,
  val title: String,
  val briefing: String,
  val targetDistrict: String,
  val targetX: Float,
  val targetZ: Float,
  val rewardRupees: Int,
  val requiresVehicle: Boolean = false,
)

data class GarageVehicleSpec(
  val id: String,
  val name: String,
  val category: String,
  val topSpeedKmh: Int,
  val description: String,
)

data class NavPoint(val x: Float, val z: Float)

data class GisLayerState(
  val id: String,
  val name: String,
  val visible: Boolean,
  val sourceType: String,
  val sourceName: String,
  val featureCount: Int,
)

data class GisDatasetStatus(
  val id: String,
  val title: String,
  val expectedFormat: String,
  val status: String,
  val detail: String,
)

data class GisPoiItem(
  val name: String,
  val x: Float,
  val z: Float,
  val category: String,
)

data class GameTelemetry(
  val engineReady: Boolean = false,
  val playerX: Float = 0f,
  val playerY: Float = 1.85f,
  val playerZ: Float = 1.77f,
  val playerYaw: Float = 2.28f,
  val playerHealth: Int = 100,
  val playerStamina: Int = 100,
  val latitude: Double = 17.7140,
  val longitude: Double = 83.3236,
  val districtName: String = "RK Beach",
  val speedKmh: Int = 0,
  val inVehicle: Boolean = false,
  val vehicleName: String = "",
  val vehicleType: String = "",
  val vehicleCondition: Int = 100,
  val nearbyVehicleName: String = "Vizag GT Coupe",
  val nearbyVehicleDistance: Float = 8.5f,
  val interactHint: String = "",
  val interiorName: String = "",
  val floorLabel: String = "",
  val isSeated: Boolean = false,
  val navRoute: List<NavPoint> = emptyList(),
  val riggedGlbLoaded: Boolean = false,
  val isSprinting: Boolean = false,
  val isGrounded: Boolean = true,
  val timeOfDay: Float = 16.4f,
  val weather: WeatherType = WeatherType.SUNNY,
  val activeChunks: Int = 9,
  val fps: Int = 60,
  val activeMissionIndex: Int = 0,
  val waypointX: Float = 25.4f,
  val waypointZ: Float = -24.8f,
  val waypointLabel: String = "1. Kursura Recon",
  val waypointDistanceMeters: Int = 37,
)

enum class ActiveOverlay {
  MAIN_MENU,
  LOAD_GAME,
  LOADING,
  NONE,
  PAUSE_MENU,
  STORY_MODE,
  VEHICLES_GARAGE,
  CITY_MAP,
  GIS_LAYERS,
  SETTINGS,
  ABOUT_ASSETS,
}
