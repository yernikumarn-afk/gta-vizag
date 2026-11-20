package com.example.data

import com.example.model.AssetManifestEntry
import com.example.model.GarageVehicleSpec
import com.example.model.GisDatasetStatus
import com.example.model.GisLayerState
import com.example.model.GisPoiItem
import com.example.model.VizagDistrict
import com.example.model.VizagMission
import kotlin.math.cos
import kotlinx.coroutines.flow.Flow

object GeoMath {
  const val ORIGIN_LAT = 17.7142
  const val ORIGIN_LNG = 83.3236
  const val WORLD_SCALE = 0.080
  const val METERS_PER_DEG_LAT = 110676.0
  val METERS_PER_DEG_LNG = 111319.5 * cos(Math.toRadians(ORIGIN_LAT))

  const val MIN_WORLD_X = -1580f
  const val MAX_WORLD_X = 1320f
  const val MIN_WORLD_Z = -1760f
  const val MAX_WORLD_Z = 920f

  fun latLngToWorld(lat: Double, lng: Double): Pair<Float, Float> {
    val x = ((lng - ORIGIN_LNG) * METERS_PER_DEG_LNG * WORLD_SCALE).toFloat()
    val z = (-(lat - ORIGIN_LAT) * METERS_PER_DEG_LAT * WORLD_SCALE).toFloat()
    return x to z
  }
}

class VizagGameRepository(private val saveDao: VizagSaveDao) {

  val primarySaveFlow: Flow<PlayerSaveEntity?> = saveDao.observePrimarySave()

  suspend fun getPrimarySave(): PlayerSaveEntity? = saveDao.getPrimarySaveOnce()

  suspend fun saveProgress(save: PlayerSaveEntity) {
    saveDao.upsertSave(save.copy(updatedAt = System.currentTimeMillis()))
  }

  suspend fun resetProgress() {
    saveDao.clearPrimarySave()
  }

  companion object {
    private fun district(
      id: String,
      name: String,
      subtitle: String,
      lat: Double,
      lng: Double,
      elevationMeters: Float,
      category: String,
    ): VizagDistrict {
      val (wx, wz) = GeoMath.latLngToWorld(lat, lng)
      return VizagDistrict(
        id = id,
        name = name,
        subtitle = subtitle,
        latitude = lat,
        longitude = lng,
        worldX = wx,
        worldZ = wz,
        elevationMeters = elevationMeters,
        category = category,
      )
    }

    private fun mission(
      index: Int,
      id: String,
      chapter: String,
      title: String,
      briefing: String,
      targetDistrict: String,
      lat: Double,
      lng: Double,
      rewardRupees: Int,
      requiresVehicle: Boolean,
    ): VizagMission {
      val (wx, wz) = GeoMath.latLngToWorld(lat, lng)
      return VizagMission(
        index = index,
        id = id,
        chapter = chapter,
        title = title,
        briefing = briefing,
        targetDistrict = targetDistrict,
        targetX = wx,
        targetZ = wz,
        rewardRupees = rewardRupees,
        requiresVehicle = requiresVehicle,
      )
    }

    // All 16 Authentic Visakhapatnam Geographic Regions (WGS84 -> Local Tangent Plane)
    val VIZAG_DISTRICTS: List<VizagDistrict> = listOf(
      district(
        id = "rk_beach",
        name = "RK Beach",
        subtitle = "INS Kursura Submarine Museum, Terracotta Promenade & Victory Memorial",
        lat = 17.7142,
        lng = 83.3236,
        elevationMeters = 1.8f,
        category = "Coastal Core (Stage 1)",
      ),
      district(
        id = "beach_road",
        name = "Beach Road",
        subtitle = "Palm-lined NTR Marg dual carriageway with yellow-black Indian kerbs",
        lat = 17.7235,
        lng = 83.3322,
        elevationMeters = 2.0f,
        category = "Coastal Core (Stage 1)",
      ),
      district(
        id = "mvp_colony",
        name = "MVP Colony",
        subtitle = "MVP Double Road residential sectors, shopping avenues & parks",
        lat = 17.7415,
        lng = 83.3315,
        elevationMeters = 5.0f,
        category = "Residential Grid",
      ),
      district(
        id = "siripuram",
        name = "Siripuram",
        subtitle = "VIP Road commercial skyline & Siripuram Junction roundabout",
        lat = 17.7224,
        lng = 83.3150,
        elevationMeters = 6.0f,
        category = "Commercial Hub",
      ),
      district(
        id = "dwaraka_nagar",
        name = "Dwaraka Nagar",
        subtitle = "APSRTC Complex transit hub, shopping plazas & Asilmetta link",
        lat = 17.7285,
        lng = 83.3015,
        elevationMeters = 7.0f,
        category = "Central Transit",
      ),
      district(
        id = "jagadamba",
        name = "Jagadamba Junction",
        subtitle = "Historic southern shopping rotary connecting RK Beach to Town Kotharoad",
        lat = 17.7122,
        lng = 83.3025,
        elevationMeters = 5.5f,
        category = "Retail Rotary",
      ),
      district(
        id = "nad_junction",
        name = "NAD Junction",
        subtitle = "Multi-corridor rotary interchange on NH-16 Airport road",
        lat = 17.7445,
        lng = 83.2320,
        elevationMeters = 8.0f,
        category = "NH-16 Interchange",
      ),
      district(
        id = "gajuwaka",
        name = "Gajuwaka",
        subtitle = "Bustling southern industrial-commercial township & highway market",
        lat = 17.6868,
        lng = 83.2185,
        elevationMeters = 6.5f,
        category = "Southern Township",
      ),
      district(
        id = "kailasagiri",
        name = "Kailasagiri",
        subtitle = "Eastern Ghats coastal hill park, ropeway & panoramic Bay viewpoint",
        lat = 17.7492,
        lng = 83.3422,
        elevationMeters = 32.0f,
        category = "Coastal Hilltop",
      ),
      district(
        id = "simhachalam",
        name = "Simhachalam",
        subtitle = "Forested northern hill range & hilltop temple complex via BRTS road",
        lat = 17.7765,
        lng = 83.2495,
        elevationMeters = 38.0f,
        category = "Northern Hills",
      ),
      district(
        id = "steel_plant",
        name = "Steel Plant",
        subtitle = "Vizag Steel industrial sector, blast furnaces & southern expressway",
        lat = 17.6380,
        lng = 83.1680,
        elevationMeters = 4.0f,
        category = "Industrial Zone",
      ),
      district(
        id = "vizag_port",
        name = "Visakhapatnam Port",
        subtitle = "Harbor gantry cranes, container berths & Port Channel Harbor Bridge",
        lat = 17.6945,
        lng = 83.2915,
        elevationMeters = 2.5f,
        category = "Maritime Harbor",
      ),
      district(
        id = "yarada_beach",
        name = "Yarada Beach",
        subtitle = "Secluded cove framed by Dolphin's Nose headland & golden sands",
        lat = 17.6548,
        lng = 83.2712,
        elevationMeters = 2.0f,
        category = "Southern Cove",
      ),
      district(
        id = "rushikonda",
        name = "Rushikonda",
        subtitle = "Golden northern surfing bay & coastal highway overlooking IT hills",
        lat = 17.7825,
        lng = 83.3852,
        elevationMeters = 2.5f,
        category = "Northern Coast",
      ),
      district(
        id = "bheemili",
        name = "Bheemili",
        subtitle = "Historic Dutch-era northern beach town at the terminus of Beach Road",
        lat = 17.8902,
        lng = 83.4520,
        elevationMeters = 2.2f,
        category = "Heritage Coast",
      ),
      district(
        id = "madhurawada",
        name = "Madhurawada",
        subtitle = "IT SEZ panorama hills & northern NH-16 high-rise corridor",
        lat = 17.8055,
        lng = 83.3560,
        elevationMeters = 16.5f,
        category = "IT Corridor",
      ),
    )

    // Bay of Bengal Coastline & Dolphin's Nose Peninsula Polyline (South -> North)
    val COASTLINE_WORLD: List<Pair<Float, Float>> = listOf(
      17.6100 to 83.2220,
      17.6310 to 83.2450,
      17.6470 to 83.2610,
      17.6552 to 83.2738,
      17.6650 to 83.2865,
      17.6742 to 83.2975,
      17.6782 to 83.3002,
      17.6845 to 83.2968,
      17.6895 to 83.2980,
      17.6980 to 83.3068,
      17.7072 to 83.3168,
      17.7142 to 83.3250,
      17.7176 to 83.3289,
      17.7248 to 83.3360,
      17.7458 to 83.3508,
      17.7625 to 83.3672,
      17.7822 to 83.3878,
      17.8150 to 83.4045,
      17.8485 to 83.4285,
      17.8915 to 83.4545,
      17.9260 to 83.4760,
    ).map { (lat, lng) -> GeoMath.latLngToWorld(lat, lng) }

    // Visakhapatnam Port Inner Entrance Channel Polygon
    val PORT_CHANNEL_WORLD: List<Pair<Float, Float>> = listOf(
      17.6846 to 83.2978,
      17.6852 to 83.2860,
      17.6885 to 83.2792,
      17.6915 to 83.2835,
      17.6892 to 83.2982,
    ).map { (lat, lng) -> GeoMath.latLngToWorld(lat, lng) }

    // Projected Road Centerlines for 2D City Map & Minimap parity with 3D world
    val MAP_ROAD_PAIRS_WORLD: List<Triple<Pair<Float, Float>, Pair<Float, Float>, Float>> = listOf(
      Triple(GeoMath.latLngToWorld(17.7070, 83.3145), GeoMath.latLngToWorld(17.7142, 83.3226), 3.0f),
      Triple(GeoMath.latLngToWorld(17.7142, 83.3226), GeoMath.latLngToWorld(17.7176, 83.3266), 3.0f),
      Triple(GeoMath.latLngToWorld(17.7176, 83.3266), GeoMath.latLngToWorld(17.7235, 83.3322), 3.0f),
      Triple(GeoMath.latLngToWorld(17.7235, 83.3322), GeoMath.latLngToWorld(17.7452, 83.3474), 2.8f),
      Triple(GeoMath.latLngToWorld(17.7452, 83.3474), GeoMath.latLngToWorld(17.7492, 83.3422), 2.2f),
      Triple(GeoMath.latLngToWorld(17.7452, 83.3474), GeoMath.latLngToWorld(17.7825, 83.3852), 2.5f),
      Triple(GeoMath.latLngToWorld(17.7825, 83.3852), GeoMath.latLngToWorld(17.8902, 83.4520), 2.5f),
      Triple(GeoMath.latLngToWorld(17.7825, 83.3852), GeoMath.latLngToWorld(17.8055, 83.3560), 2.0f),
      Triple(GeoMath.latLngToWorld(17.8055, 83.3560), GeoMath.latLngToWorld(17.7765, 83.2495), 2.2f),
      Triple(GeoMath.latLngToWorld(17.7070, 83.3145), GeoMath.latLngToWorld(17.7122, 83.3025), 2.4f),
      Triple(GeoMath.latLngToWorld(17.7142, 83.3226), GeoMath.latLngToWorld(17.7224, 83.3150), 2.4f),
      Triple(GeoMath.latLngToWorld(17.7122, 83.3025), GeoMath.latLngToWorld(17.7224, 83.3150), 2.2f),
      Triple(GeoMath.latLngToWorld(17.7122, 83.3025), GeoMath.latLngToWorld(17.7285, 83.3015), 2.4f),
      Triple(GeoMath.latLngToWorld(17.7224, 83.3150), GeoMath.latLngToWorld(17.7285, 83.3015), 2.4f),
      Triple(GeoMath.latLngToWorld(17.7235, 83.3322), GeoMath.latLngToWorld(17.7415, 83.3315), 2.4f),
      Triple(GeoMath.latLngToWorld(17.7224, 83.3150), GeoMath.latLngToWorld(17.7415, 83.3315), 2.0f),
      Triple(GeoMath.latLngToWorld(17.7415, 83.3315), GeoMath.latLngToWorld(17.7285, 83.3015), 2.4f),
      Triple(GeoMath.latLngToWorld(17.7415, 83.3315), GeoMath.latLngToWorld(17.8055, 83.3560), 2.4f),
      Triple(GeoMath.latLngToWorld(17.7285, 83.3015), GeoMath.latLngToWorld(17.7445, 83.2320), 2.8f),
      Triple(GeoMath.latLngToWorld(17.7445, 83.2320), GeoMath.latLngToWorld(17.7765, 83.2495), 2.2f),
      Triple(GeoMath.latLngToWorld(17.7122, 83.3025), GeoMath.latLngToWorld(17.6945, 83.2915), 2.4f),
      Triple(GeoMath.latLngToWorld(17.7070, 83.3145), GeoMath.latLngToWorld(17.6945, 83.2915), 2.0f),
      Triple(GeoMath.latLngToWorld(17.6945, 83.2915), GeoMath.latLngToWorld(17.6840, 83.2855), 2.4f),
      Triple(GeoMath.latLngToWorld(17.6840, 83.2855), GeoMath.latLngToWorld(17.6775, 83.2948), 1.8f),
      Triple(GeoMath.latLngToWorld(17.6840, 83.2855), GeoMath.latLngToWorld(17.6690, 83.2790), 2.0f),
      Triple(GeoMath.latLngToWorld(17.6690, 83.2790), GeoMath.latLngToWorld(17.6548, 83.2712), 2.0f),
      Triple(GeoMath.latLngToWorld(17.6548, 83.2712), GeoMath.latLngToWorld(17.6868, 83.2185), 2.0f),
      Triple(GeoMath.latLngToWorld(17.6945, 83.2915), GeoMath.latLngToWorld(17.6868, 83.2185), 2.8f),
      Triple(GeoMath.latLngToWorld(17.7445, 83.2320), GeoMath.latLngToWorld(17.6868, 83.2185), 2.8f),
      Triple(GeoMath.latLngToWorld(17.6868, 83.2185), GeoMath.latLngToWorld(17.6380, 83.1680), 3.0f),
    )

    // 6 Enterable Building World Coordinates matching InteriorManager.js
    val ENTERABLE_COORDS_WORLD: List<Pair<Float, Float>> = listOf(
      GeoMath.latLngToWorld(17.7123, 83.3169),
      GeoMath.latLngToWorld(17.7180, 83.3222),
      GeoMath.latLngToWorld(17.7252, 83.3168),
      GeoMath.latLngToWorld(17.7392, 83.3302),
      GeoMath.latLngToWorld(17.7810, 83.3822),
      GeoMath.latLngToWorld(17.6962, 83.2902),
    )

    // Original Fictional Vizag Story Prologue ("Arjun Rao: Coastal Arrival") & Open-World Missions
    val PROTOTYPE_MISSIONS: List<VizagMission> = listOf(
      mission(
        index = 0,
        id = "m1_kursura",
        chapter = "Prologue • Arrival in Vizag",
        title = "1. Kursura Recon",
        briefing = "Arjun arrives at RK Beach. Walk or jog north along the terracotta promenade to inspect the INS Kursura S20 Submarine Museum.",
        targetDistrict = "RK Beach",
        lat = 17.7170,
        lng = 83.3266,
        rewardRupees = 1500,
        requiresVehicle = false,
      ),
      mission(
        index = 1,
        id = "m2_beach_cruise",
        chapter = "Chapter 1 • Coastal Asphalt",
        title = "2. Beach Road Ignition",
        briefing = "Take a coastal vehicle along palm-lined NTR Beach Road past VUDA Park toward Lawson's Bay.",
        targetDistrict = "Beach Road",
        lat = 17.7235,
        lng = 83.3322,
        rewardRupees = 2500,
        requiresVehicle = true,
      ),
      mission(
        index = 2,
        id = "m3_siripuram_vip",
        chapter = "Chapter 1 • VIP Uplands",
        title = "3. Siripuram VIP Sprint",
        briefing = "Meet Raghav's contact at the Siripuram Junction roundabout via VIP Road.",
        targetDistrict = "Siripuram",
        lat = 17.7224,
        lng = 83.3150,
        rewardRupees = 3500,
        requiresVehicle = false,
      ),
      mission(
        index = 3,
        id = "m4_kailasagiri_climb",
        chapter = "Chapter 2 • Eastern Ghats",
        title = "4. Kailasagiri Summit",
        briefing = "Ascend the scenic ghat road to the Kailasagiri Hilltop Viewpoint overlooking the Bay of Bengal.",
        targetDistrict = "Kailasagiri",
        lat = 17.7492,
        lng = 83.3422,
        rewardRupees = 5000,
        requiresVehicle = false,
      ),
      mission(
        index = 4,
        id = "m5_port_run",
        chapter = "Chapter 2 • Maritime Logistics",
        title = "5. Harbor Container Run",
        briefing = "Deliver coastal clearance documents to the gantry terminal at Visakhapatnam Port.",
        targetDistrict = "Visakhapatnam Port",
        lat = 17.6945,
        lng = 83.2915,
        rewardRupees = 7500,
        requiresVehicle = true,
      ),
    )

    val GARAGE_VEHICLES: List<GarageVehicleSpec> = listOf(
      GarageVehicleSpec(
        id = "gt_coupe",
        name = "Vizag GT Coupe",
        category = "Sports Car",
        topSpeedKmh = 108,
        description = "Balanced coastal grand tourer with responsive steering and firm suspension.",
      ),
      GarageVehicleSpec(
        id = "coastal_bike",
        name = "Coastal 350 Bike",
        category = "Street Motorcycle",
        topSpeedKmh = 96,
        description = "Nimble Indian 350cc street roadster with dynamic cornering lean.",
      ),
      GarageVehicleSpec(
        id = "vizag_auto",
        name = "Vizag City Auto",
        category = "Indian Auto-Rickshaw",
        topSpeedKmh = 66,
        description = "Iconic yellow-and-black three-wheeler built for tight Jagadamba & Beach Road turns.",
      ),
    )

    val DEFAULT_GIS_LAYERS: List<GisLayerState> = listOf(
      GisLayerState("boundaries", "1. Geographic Boundaries", true, "CURATED_REF", "16 Regional Boundary Rings", 16),
      GisLayerState("satellite", "2. Satellite / Orthographic Overlay", true, "MISSING_FILE", "Not imported (.png/.jpg/.tif)", 0),
      GisLayerState("roads", "3. Road Network", true, "CURATED_REF", "WGS84 Vizag Arterials & Streets", 34),
      GisLayerState("buildings", "4. Building Footprints", true, "CURATED_REF", "5 Footprint Parcels + Zoning Fallback", 5),
      GisLayerState("elevation", "5. Terrain Elevation (DEM)", true, "CURATED_REF", "Multi-Ridge Vizag Analytic DEM", 8),
      GisLayerState("coastline", "6. Coastline", true, "CURATED_REF", "Bay of Bengal & Dolphin Nose Polyline", 21),
      GisLayerState("water", "7. Ocean & Water Bodies", true, "CURATED_REF", "Bay of Bengal + Port Inner Channel", 2),
      GisLayerState("vegetation", "8. Vegetation", true, "CURATED_REF", "Coastal Palms & Ghats Hill Canopy", 16),
      GisLayerState("landuse", "9. Land Use (VMRDA)", false, "CURATED_REF", "7 Master Plan Zones", 7),
      GisLayerState("pois", "10. Points of Interest", true, "CURATED_REF", "8 WGS84 Landmarks", 8),
    )

    val DEFAULT_GIS_DATASETS: List<GisDatasetStatus> = listOf(
      GisDatasetStatus(
        id = "ortho_ref_image",
        title = "Orthographic Reconstruction Image",
        expectedFormat = "PNG / JPG (Top/Front/Side/Iso Ref)",
        status = "MISSING_NOT_UPLOADED",
        detail = "No orthographic reference image found in upload/assets. Tap Import to drape onto map.",
      ),
      GisDatasetStatus(
        id = "gvmc_ward_kml",
        title = "GVMC Ward Boundary KML",
        expectedFormat = "KML / GeoJSON",
        status = "MISSING_EXTERNAL_FILE",
        detail = "Not downloaded in assets. Using 16 curated district boundary circles until imported.",
      ),
      GisDatasetStatus(
        id = "osm_roads_geojson",
        title = "OpenStreetMap Road Network",
        expectedFormat = "GeoJSON / KML",
        status = "MISSING_EXTERNAL_FILE",
        detail = "Not downloaded in assets. Using curated WGS84 road centerlines & bridges.",
      ),
      GisDatasetStatus(
        id = "osm_buildings_geojson",
        title = "OpenStreetMap Building Footprints",
        expectedFormat = "GeoJSON (Polygons)",
        status = "MISSING_EXTERNAL_FILE",
        detail = "Not downloaded in assets. Procedural VMRDA infill active outside curated footprints.",
      ),
      GisDatasetStatus(
        id = "vmrda_master_plan",
        title = "VMRDA Master Plan Zones",
        expectedFormat = "GeoJSON / KML",
        status = "MISSING_EXTERNAL_FILE",
        detail = "Not downloaded in assets. Using 7 curated land-use zone polygons.",
      ),
      GisDatasetStatus(
        id = "copernicus_dem_geotiff",
        title = "Copernicus GLO-30 / SRTM DEM",
        expectedFormat = "GeoTIFF (.tif)",
        status = "MISSING_EXTERNAL_FILE",
        detail = "Not downloaded in assets. Using Kailasagiri/Yarada/Dolphin Nose analytic ridges.",
      ),
      GisDatasetStatus(
        id = "natmo_satellite_raster",
        title = "NATMO Map / Satellite Imagery",
        expectedFormat = "GeoTIFF / PNG / JPG",
        status = "MISSING_EXTERNAL_FILE",
        detail = "Not downloaded in assets. Procedural PBR coastal & terrain textures active.",
      ),
    )

    val DEFAULT_GIS_POIS: List<GisPoiItem> = listOf(
      17.7172 to 83.3275 to ("INS Kursura (S20) Submarine Museum" to "Landmark"),
      17.7124 to 83.3220 to ("Victory at Sea War Memorial" to "Landmark"),
      17.6775 to 83.2948 to ("Dolphin's Nose Lighthouse" to "Headland"),
      17.7492 to 83.3422 to ("Kailasagiri Peak & Viewpoint" to "Hilltop"),
      17.6548 to 83.2712 to ("Yarada Beach Scenic Cove" to "Beach"),
      17.6945 to 83.2915 to ("Visakhapatnam Port Terminal" to "Harbor"),
      17.7825 to 83.3852 to ("Rushikonda Surfing Bay" to "Beach"),
      17.7765 to 83.2495 to ("Simhachalam Temple Hill" to "Heritage"),
    ).map { (latLng, meta) ->
      val (x, z) = GeoMath.latLngToWorld(latLng.first, latLng.second)
      GisPoiItem(name = meta.first, x = x, z = z, category = meta.second)
    }

    val DEFAULT_ASSET_MANIFEST: List<AssetManifestEntry> = listOf(
      AssetManifestEntry(
        id = "player_rigged_human",
        title = "Rigged Human Character (Idle / Walk / Run)",
        localPath = "assets/game/models/player_arjun.glb",
        status = "INITIALIZING",
        detail = "Streaming SkinnedMesh GLB & skeletal AnimationClips via GLTFLoader",
      ),
      AssetManifestEntry(
        id = "ins_kursura_submarine",
        title = "INS Kursura S20 Submarine Museum",
        localPath = "assets/game/models/ins_kursura_s20.glb",
        status = "MISSING_CUSTOM_GLB",
        detail = "Custom GLB not bundled; rendering multi-part PBR naval hull assembly",
      ),
      AssetManifestEntry(
        id = "vizag_coastal_buildings",
        title = "Visakhapatnam Indian Apartments & Shops Pack",
        localPath = "assets/game/models/vizag_buildings_pack.glb",
        status = "MISSING_CUSTOM_GLB",
        detail = "Custom GLB not bundled; rendering multi-story architectural PBR LOD facades",
      ),
      AssetManifestEntry(
        id = "indian_vehicles_pack",
        title = "Indian Cars, Bikes, Autos & APSRTC Bus GLBs",
        localPath = "assets/game/models/vizag_vehicles_pack.glb",
        status = "MISSING_CUSTOM_GLB",
        detail = "Stage 2 GLB pack pending; rendering multi-part PBR coupe, bike & auto",
      ),
      AssetManifestEntry(
        id = "coastal_palm_vegetation",
        title = "Indian Coconut Palm & Eastern Ghats Foliage",
        localPath = "assets/game/models/coconut_palm.glb",
        status = "MISSING_CUSTOM_GLB",
        detail = "Custom GLB not bundled; rendering curved segmented trunk & pinnate frond mesh",
      ),
    )
  }
}
