package com.example

import android.content.Context
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.example.data.GeoMath
import com.example.data.PlayerSaveEntity
import com.example.data.VizagDatabase
import com.example.data.VizagGameRepository
import com.example.model.GraphicsPreset
import com.example.model.WeatherType
import com.example.ui.VizagOpenWorldScreen
import com.example.ui.theme.VizagCityTheme
import com.example.viewmodel.GameViewModel
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36], qualifiers = "w1280dp-h800dp-land-xhdpi")
class ExampleRobolectricTest {

  @get:Rule val composeTestRule = createComposeRule()

  private lateinit var db: VizagDatabase
  private lateinit var repository: VizagGameRepository

  @Before
  fun setUp() {
    val context = ApplicationProvider.getApplicationContext<Context>()
    db =
      Room.inMemoryDatabaseBuilder(context, VizagDatabase::class.java)
        .allowMainThreadQueries()
        .build()
    repository = VizagGameRepository(db.saveDao())
  }

  @After
  fun tearDown() {
    db.close()
  }

  @Test
  fun `verify app name, all 16 Visakhapatnam regions, and modular ThreeJS world systems assets`() {
    val context = ApplicationProvider.getApplicationContext<Context>()
    assertEquals("Vizag City", context.getString(R.string.app_name))

    val districtNames = VizagGameRepository.VIZAG_DISTRICTS.map { it.name }.toSet()
    val expected =
      setOf(
        "RK Beach",
        "Beach Road",
        "MVP Colony",
        "Siripuram",
        "Dwaraka Nagar",
        "Jagadamba Junction",
        "NAD Junction",
        "Gajuwaka",
        "Kailasagiri",
        "Simhachalam",
        "Steel Plant",
        "Visakhapatnam Port",
        "Yarada Beach",
        "Rushikonda",
        "Bheemili",
        "Madhurawada",
      )
    assertEquals(expected, districtNames)

    val gameAssets = context.assets.list("game")?.toSet().orEmpty()
    assertTrue(gameAssets.contains("index.html"))
    assertTrue(gameAssets.contains("main.js"))
    assertTrue(gameAssets.contains("ThreeLoader.js"))

    val coreAssets = context.assets.list("game/core")?.toSet().orEmpty()
    assertTrue(coreAssets.contains("AssetIntegrationManager.js"))
    assertTrue(coreAssets.contains("GraphicsSettingsManager.js"))

    val worldAssets = context.assets.list("game/world")?.toSet().orEmpty()
    assertTrue(worldAssets.contains("PBRTextureGenerator.js"))
    assertTrue(worldAssets.contains("DetailedBuildingBuilder.js"))
    assertTrue(worldAssets.contains("ChunkStreamManager.js"))

    val systemsAssets = context.assets.list("game/systems")?.toSet().orEmpty()
    assertTrue(systemsAssets.contains("CollisionManager.js"))
    assertTrue(systemsAssets.contains("InteractionManager.js"))
    assertTrue(systemsAssets.contains("InteriorManager.js"))
    assertTrue(systemsAssets.contains("NavigationManager.js"))

    val managerAssets = context.assets.list("game/managers")?.toSet().orEmpty()
    assertTrue(managerAssets.contains("TextureManager.js"))
    assertTrue(managerAssets.contains("MaterialManager.js"))
    assertTrue(managerAssets.contains("LightingManager.js"))
    assertTrue(managerAssets.contains("EnvironmentManager.js"))
    assertTrue(managerAssets.contains("WeatherVisualManager.js"))
    assertTrue(managerAssets.contains("PostProcessingManager.js"))

    val entityAssets = context.assets.list("game/entities")?.toSet().orEmpty()
    assertTrue(entityAssets.contains("HumanMeshBuilder.js"))
    assertTrue(entityAssets.contains("PlayerController.js"))
    assertTrue(entityAssets.contains("PedestrianManager.js"))
    assertTrue(entityAssets.contains("VehicleManager.js"))

    val gisAssets = context.assets.list("game/gis")?.toSet().orEmpty()
    assertTrue(gisAssets.contains("GeoProjection.js"))
    assertTrue(gisAssets.contains("GeoTiffParser.js"))
    assertTrue(gisAssets.contains("GisParsers.js"))
    assertTrue(gisAssets.contains("GisWorldManager.js"))

    // Verify Conformal WGS84 -> Local Tangent Plane projection parity
    val (rkX, rkZ) = GeoMath.latLngToWorld(GeoMath.ORIGIN_LAT, GeoMath.ORIGIN_LNG)
    assertEquals(0f, rkX, 0.01f)
    assertEquals(0f, rkZ, 0.01f)
    val (kailX, kailZ) = GeoMath.latLngToWorld(17.7492, 83.3422)
    assertTrue("Kailasagiri must be east (+X) & north (-Z) of RK Beach", kailX > 100f && kailZ < -250f)

    // Verify 10 GIS layers & honest missing external datasets manifest
    assertEquals(10, VizagGameRepository.DEFAULT_GIS_LAYERS.size)
    assertEquals(7, VizagGameRepository.DEFAULT_GIS_DATASETS.size)
    assertTrue(
      VizagGameRepository.DEFAULT_GIS_DATASETS.all {
        it.status == "MISSING_NOT_UPLOADED" || it.status == "MISSING_EXTERNAL_FILE"
      }
    )
  }

  @Test
  fun `verify local Room v2 save and graphics preset persistence round trip`() = runBlocking {
    val entity =
      PlayerSaveEntity(
        slotId = 1,
        posX = -185f,
        posY = 6f,
        posZ = -135f,
        yaw = 1.5f,
        districtName = "Siripuram",
        timeOfDay = 18.2f,
        autoCycle = false,
        weatherKey = "RAIN",
        activeMissionIndex = 2,
        completedMissionsCsv = "0,1",
        cashRupees = 5000,
        totalDistanceMeters = 1420f,
        graphicsPreset = "HIGH",
        resolutionScale = 1.15f,
        shadowsEnabled = true,
        drawDistance = 480f,
        targetFps = 60,
        audioEnabled = true,
      )
    repository.saveProgress(entity)
    val loaded = repository.getPrimarySave()
    assertNotNull(loaded)
    assertEquals("Siripuram", loaded?.districtName)
    assertEquals(5000, loaded?.cashRupees)
    assertEquals("HIGH", loaded?.graphicsPreset)
    assertEquals(setOf(0, 1), loaded?.completedSet())
  }

  @Test
  @Config(sdk = [36], qualifiers = "w400dp-h800dp-port")
  fun `verify Rotate Device guard appears when viewport is portrait`() {
    val viewModel = GameViewModel(repository)
    composeTestRule.setContent {
      VizagCityTheme {
        VizagOpenWorldScreen(viewModel = viewModel)
      }
    }
    composeTestRule.waitForIdle()
    composeTestRule.onNodeWithTag("rotate_device_screen").assertIsDisplayed()
  }

  @Test
  fun `verify Galaxy Tab A9 Landscape Main Menu, HUD, Driving controls, Settings presets, and City Map zoom`() {
    val viewModel = GameViewModel(repository)
    composeTestRule.setContent {
      VizagCityTheme {
        VizagOpenWorldScreen(viewModel = viewModel)
      }
    }
    composeTestRule.waitForIdle()

    // Verify all 8 Vice City-styled Landscape Main Menu buttons + quick launch pills are displayed
    composeTestRule.onNodeWithTag("landscape_main_menu").assertIsDisplayed()
    composeTestRule.onNodeWithTag("menu_new_game").assertIsDisplayed()
    composeTestRule.onNodeWithTag("menu_continue").assertIsDisplayed()
    composeTestRule.onNodeWithTag("menu_load_game").assertIsDisplayed()
    composeTestRule.onNodeWithTag("menu_settings").assertIsDisplayed()
    composeTestRule.onNodeWithTag("menu_graphics").assertIsDisplayed()
    composeTestRule.onNodeWithTag("menu_controls").assertIsDisplayed()
    composeTestRule.onNodeWithTag("menu_credits").assertIsDisplayed()
    composeTestRule.onNodeWithTag("menu_exit_game").assertIsDisplayed()

    // Open & close Load Game overlay
    composeTestRule.onNodeWithTag("menu_load_game").performClick()
    composeTestRule.waitForIdle()
    composeTestRule.onNodeWithTag("load_game_overlay").assertIsDisplayed()
    composeTestRule.onNodeWithTag("close_load_game_button").performClick()
    composeTestRule.waitForIdle()

    // Launch NEW GAME into RK Beach gameplay
    composeTestRule.onNodeWithTag("menu_new_game").performClick()
    composeTestRule.waitForIdle()

    // Verify Landscape HUD & On-Foot Third-Person controls (including Health & Stamina indicators)
    composeTestRule.onNodeWithTag("left_joystick").assertIsDisplayed()
    composeTestRule.onNodeWithTag("right_camera_pad").assertIsDisplayed()
    composeTestRule.onNodeWithTag("jump_button").assertIsDisplayed()
    composeTestRule.onNodeWithTag("run_button").assertIsDisplayed()
    composeTestRule.onNodeWithTag("interact_button").assertIsDisplayed()
    composeTestRule.onNodeWithTag("enter_vehicle_button").assertIsDisplayed()
    composeTestRule.onNodeWithTag("minimap_button").assertIsDisplayed()
    composeTestRule.onNodeWithTag("hud_location_badge").assertIsDisplayed()
    composeTestRule.onNodeWithTag("hud_health_bar").assertIsDisplayed()
    composeTestRule.onNodeWithTag("hud_stamina_bar").assertIsDisplayed()
    composeTestRule.onNodeWithTag("hud_cash_badge").assertIsDisplayed()
    composeTestRule.onNodeWithTag("mission_banner").assertIsDisplayed()
    composeTestRule.onNodeWithTag("pause_button").assertIsDisplayed()

    // Simulate entering Bayfront Luxury Villa on foot -> verify interior/floor/route telemetry & interaction button
    viewModel.bridge.onTelemetry(
      """{"x":-35.0,"y":5.8,"z":-24.0,"yaw":1.2,"health":100,"stamina":92,"lat":17.714,"lng":83.323,"district":"RK Beach","speedKmh":0,"inVehicle":false,"interactHint":"Open 2F Balcony Door","interiorName":"Bayfront Luxury Villa","floorLabel":"2F Living","isSeated":false,"navRoute":[{"x":-35,"z":-24},{"x":-10,"z":-24},{"x":-10,"z":-450}],"chunks":9,"fps":60}"""
    )
    composeTestRule.waitForIdle()
    assertEquals("Bayfront Luxury Villa", viewModel.telemetry.value.interiorName)
    assertEquals("2F Living", viewModel.telemetry.value.floorLabel)
    assertEquals(3, viewModel.telemetry.value.navRoute.size)

    // Simulate entering Vizag GT Coupe -> verify full Driving Control suite & Vehicle Condition HUD
    viewModel.bridge.onTelemetry(
      """{"x":-3.2,"y":1.8,"z":9.0,"yaw":3.14,"health":98,"stamina":82,"lat":17.714,"lng":83.323,"district":"RK Beach","speedKmh":54,"inVehicle":true,"vehicleName":"Vizag GT Coupe","vehicleType":"CAR","vehicleCondition":94,"chunks":9,"fps":60}"""
    )
    composeTestRule.waitForIdle()
    composeTestRule.onNodeWithTag("accelerate_button").assertIsDisplayed()
    composeTestRule.onNodeWithTag("brake_button").assertIsDisplayed()
    composeTestRule.onNodeWithTag("reverse_button").assertIsDisplayed()
    composeTestRule.onNodeWithTag("handbrake_button").assertIsDisplayed()
    composeTestRule.onNodeWithTag("horn_button").assertIsDisplayed()
    composeTestRule.onNodeWithTag("exit_vehicle_button").assertIsDisplayed()
    composeTestRule.onNodeWithTag("hud_vehicle_condition").assertIsDisplayed()

    // Open Tablet Settings from HUD, switch tabs & verify HIGH preset + Stormy/Clear Night weather
    composeTestRule.onNodeWithTag("hud_quick_settings_button").performClick()
    composeTestRule.waitForIdle()
    composeTestRule.onNodeWithTag("settings_overlay").assertIsDisplayed()
    composeTestRule.onNodeWithTag("settings_tab_graphics").assertIsDisplayed().performClick()
    composeTestRule.waitForIdle()
    composeTestRule.onNodeWithTag("preset_chip_high").performClick()
    composeTestRule.waitForIdle()
    assertEquals(GraphicsPreset.HIGH, viewModel.graphicsSettings.value.preset)

    composeTestRule.onNodeWithTag("settings_tab_audio_world").assertIsDisplayed().performClick()
    composeTestRule.waitForIdle()
    composeTestRule.onNodeWithTag("weather_chip_stormy").assertIsDisplayed().performClick()
    composeTestRule.waitForIdle()
    assertEquals(WeatherType.STORMY, viewModel.telemetry.value.weather)
    composeTestRule.onNodeWithTag("weather_chip_clear_night").assertIsDisplayed().performClick()
    composeTestRule.waitForIdle()
    assertEquals(WeatherType.CLEAR_NIGHT, viewModel.telemetry.value.weather)

    composeTestRule.onNodeWithTag("settings_tab_controls").assertIsDisplayed().performClick()
    composeTestRule.waitForIdle()
    composeTestRule.onNodeWithTag("invert_y_switch").assertIsDisplayed()

    composeTestRule.onNodeWithTag("close_settings_button").performClick()
    composeTestRule.waitForIdle()

    // Open 16-Region Visakhapatnam City Map and verify Zoom controls, GPS Waypoint & 10-Layer GIS overlay
    composeTestRule.onNodeWithTag("minimap_button").performClick()
    composeTestRule.waitForIdle()
    composeTestRule.onNodeWithTag("interactive_city_map").assertIsDisplayed()
    composeTestRule.onNodeWithTag("map_zoom_in").assertIsDisplayed().performClick()
    composeTestRule.onNodeWithTag("set_waypoint_button").assertIsDisplayed()
    composeTestRule.onNodeWithTag("open_gis_layers_from_map").assertIsDisplayed().performClick()
    composeTestRule.waitForIdle()

    // Verify 10-Layer GIS Reconstruction & Live Import overlay + layer toggle switch
    composeTestRule.onNodeWithTag("gis_layers_overlay").assertIsDisplayed()
    composeTestRule.onNodeWithTag("import_gis_general_button").assertIsDisplayed()
    composeTestRule.onNodeWithTag("gis_layer_switch_boundaries").assertIsDisplayed()
    val initialLanduse = viewModel.gisLayers.value.first { it.id == "landuse" }.visible
    composeTestRule.onNodeWithTag("gis_layer_switch_landuse").assertIsDisplayed().performClick()
    composeTestRule.waitForIdle()
    assertEquals(!initialLanduse, viewModel.gisLayers.value.first { it.id == "landuse" }.visible)
    composeTestRule.onNodeWithTag("close_gis_layers_button").performClick()
    composeTestRule.waitForIdle()
  }
}
