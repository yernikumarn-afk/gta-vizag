// 10-Layer GIS World Reconstruction Manager for Visakhapatnam
// Manages Geographic Coordinates, DEM Elevation Grid, Coastline Distance Map Texture,
// Footprint Polygons, Boundary Polylines, Land-Use Zones, POIs, Ortho Rasters & GLB Imports.
import {
  COASTLINE_WORLD,
  CURATED_FOOTPRINTS,
  CURATED_LANDUSE_ZONES,
  CURATED_POIS,
  DISTRICTS,
  PORT_CHANNEL_WORLD,
  ROAD_SEGMENTS,
  WORLD_BOUNDS,
  getBaseDemElevationAnalytic,
  getCoastSignedDistanceAnalytic,
  latLngToWorld,
  setActiveGisManager
} from '../data/VizagGeoData.js';
import { parseGeoJsonText, parseKmlText } from './GisParsers.js';
import { parseGeoTiff } from './GeoTiffParser.js';

export class GisWorldManager {
  constructor(THREE, scene, gltfLoader = null, onStateChanged = null) {
    this.THREE = THREE;
    this.scene = scene;
    this.gltfLoader = gltfLoader;
    this.onStateChanged = onStateChanged;

    this.revision = 1;
    this.importedRoads = [];
    this.importedBuildings = [];
    this.importedBoundaries = [];
    this.importedLanduse = [];
    this.importedWater = [];
    this.importedCoastlines = [];
    this.importedPois = [];
    this.importedDem = null; // { width, height, minX, maxX, minZ, maxZ, elevation, minElev, maxElev }
    this.orthoRasterMesh = null;
    this.importedGlbGroup = new THREE.Group();
    this.scene.add(this.importedGlbGroup);
    this.importedGlbModels = [];

    // 10-Layer GIS Visibility & Source Registry
    this.layers = {
      boundaries: { id: 'boundaries', name: '1. Geographic Boundaries', visible: true, sourceType: 'CURATED_REF', sourceName: '16 Regional Boundary Rings', count: 16 },
      satellite: { id: 'satellite', name: '2. Satellite / Orthographic Overlay', visible: true, sourceType: 'MISSING_FILE', sourceName: 'Not imported (.png/.jpg/.tif)', count: 0 },
      roads: { id: 'roads', name: '3. Road Network', visible: true, sourceType: 'CURATED_REF', sourceName: 'WGS84 Vizag Arterials & Streets', count: ROAD_SEGMENTS.length },
      buildings: { id: 'buildings', name: '4. Building Footprints', visible: true, sourceType: 'CURATED_REF', sourceName: '5 Footprint Parcels + Zoning Fallback', count: CURATED_FOOTPRINTS.length },
      elevation: { id: 'elevation', name: '5. Terrain Elevation (DEM)', visible: true, sourceType: 'CURATED_REF', sourceName: 'Multi-Ridge Vizag Analytic DEM', count: 8 },
      coastline: { id: 'coastline', name: '6. Coastline', visible: true, sourceType: 'CURATED_REF', sourceName: 'Bay of Bengal & Dolphin Nose Polyline', count: COASTLINE_WORLD.length },
      water: { id: 'water', name: '7. Ocean & Water Bodies', visible: true, sourceType: 'CURATED_REF', sourceName: 'Bay of Bengal + Port Inner Channel', count: 2 },
      vegetation: { id: 'vegetation', name: '8. Vegetation', visible: true, sourceType: 'CURATED_REF', sourceName: 'Coastal Palms & Ghats Hill Canopy', count: 16 },
      landuse: { id: 'landuse', name: '9. Land Use (VMRDA)', visible: false, sourceType: 'CURATED_REF', sourceName: '7 Master Plan Zones', count: CURATED_LANDUSE_ZONES.length },
      pois: { id: 'pois', name: '10. Points of Interest', visible: true, sourceType: 'CURATED_REF', sourceName: '8 WGS84 Landmarks', count: CURATED_POIS.length }
    };

    // Honest External Dataset Manifest (explicitly reports MISSING until actually imported)
    this.externalDatasets = [
      { id: 'ortho_ref_image', title: 'Orthographic Reconstruction Image', expectedFormat: 'PNG / JPG (Top/Front/Side/Iso Ref)', status: 'MISSING_NOT_UPLOADED', detail: 'No orthographic reference image found in upload/assets. Tap Import to drape onto map.' },
      { id: 'gvmc_ward_kml', title: 'GVMC Ward Boundary KML', expectedFormat: 'KML / GeoJSON', status: 'MISSING_EXTERNAL_FILE', detail: 'Not downloaded in assets. Using 16 curated district boundary circles until imported.' },
      { id: 'osm_roads_geojson', title: 'OpenStreetMap Road Network', expectedFormat: 'GeoJSON / KML', status: 'MISSING_EXTERNAL_FILE', detail: 'Not downloaded in assets. Using curated WGS84 road centerlines & bridges.' },
      { id: 'osm_buildings_geojson', title: 'OpenStreetMap Building Footprints', expectedFormat: 'GeoJSON (Polygons)', status: 'MISSING_EXTERNAL_FILE', detail: 'Not downloaded in assets. Procedural VMRDA infill active outside curated footprints.' },
      { id: 'vmrda_master_plan', title: 'VMRDA Master Plan Zones', expectedFormat: 'GeoJSON / KML', status: 'MISSING_EXTERNAL_FILE', detail: 'Not downloaded in assets. Using 7 curated land-use zone polygons.' },
      { id: 'copernicus_dem_geotiff', title: 'Copernicus GLO-30 / SRTM DEM', expectedFormat: 'GeoTIFF (.tif)', status: 'MISSING_EXTERNAL_FILE', detail: 'Not downloaded in assets. Using Kailasagiri/Yarada/Dolphin Nose analytic ridges.' },
      { id: 'natmo_satellite_raster', title: 'NATMO Map / Satellite Imagery', expectedFormat: 'GeoTIFF / PNG / JPG', status: 'MISSING_EXTERNAL_FILE', detail: 'Not downloaded in assets. Procedural PBR coastal & terrain textures active.' }
    ];

    this.coastTexSize = 256;
    this.coastGridData = new Float32Array(this.coastTexSize * this.coastTexSize);
    this.coastDataTexture = this._createCoastDataTexture();
    this.rebuildCoastDistanceGrid();

    setActiveGisManager(this);
    this.notifyHost();
  }

  _createCoastDataTexture() {
    const THREE = this.THREE;
    const size = this.coastTexSize;
    const rgba = new Uint8Array(size * size * 4);
    const tex = new THREE.DataTexture(rgba, size, size, THREE.RGBAFormat);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  }

  rebuildCoastDistanceGrid() {
    const size = this.coastTexSize;
    const { minX, maxX, minZ, maxZ } = WORLD_BOUNDS;
    const spanX = maxX - minX;
    const spanZ = maxZ - minZ;
    const texBytes = this.coastDataTexture.image.data;

    for (let row = 0; row < size; row++) {
      const z = minZ + (row / (size - 1)) * spanZ;
      for (let col = 0; col < size; col++) {
        const x = minX + (col / (size - 1)) * spanX;
        const sd = this._computeSignedCoastDistanceRaw(x, z);
        this.coastGridData[row * size + col] = sd;

        // Encode signed distance (-128m .. +128m) into R channel around 128 midpoint
        const encoded = Math.max(0, Math.min(255, Math.round(128 + sd * 1.4)));
        const idx = (row * size + col) * 4;
        texBytes[idx] = encoded;
        texBytes[idx + 1] = sd < 0 ? 255 : 0;
        texBytes[idx + 2] = 0;
        texBytes[idx + 3] = 255;
      }
    }
    this.coastDataTexture.needsUpdate = true;
  }

  _computeSignedCoastDistanceRaw(x, z) {
    let sd = getCoastSignedDistanceAnalytic(x, z);
    if (this.importedCoastlines.length > 0) {
      let bestAbs = Infinity;
      let sign = sd >= 0 ? 1 : -1;
      for (const line of this.importedCoastlines) {
        for (let i = 0; i < line.pts.length - 1; i++) {
          const a = line.pts[i];
          const b = line.pts[i + 1];
          const vx = b.x - a.x;
          const vz = b.z - a.z;
          const lenSq = vx * vx + vz * vz;
          let t = lenSq > 0.001 ? ((x - a.x) * vx + (z - a.z) * vz) / lenSq : 0;
          t = Math.max(0, Math.min(1, t));
          const d = Math.hypot(x - (a.x + t * vx), z - (a.z + t * vz));
          if (d < bestAbs) bestAbs = d;
        }
      }
      if (bestAbs < 160) {
        sd = sign * bestAbs;
      }
    }
    return sd;
  }

  sampleCoastSignedDistance(x, z) {
    if (this.importedCoastlines.length === 0) {
      return getCoastSignedDistanceAnalytic(x, z);
    }
    const { minX, maxX, minZ, maxZ } = WORLD_BOUNDS;
    const u = ((x - minX) / (maxX - minX)) * (this.coastTexSize - 1);
    const v = ((z - minZ) / (maxZ - minZ)) * (this.coastTexSize - 1);
    const c0 = Math.max(0, Math.min(this.coastTexSize - 2, Math.floor(u)));
    const r0 = Math.max(0, Math.min(this.coastTexSize - 2, Math.floor(v)));
    const fx = Math.max(0, Math.min(1, u - c0));
    const fz = Math.max(0, Math.min(1, v - r0));
    const g = this.coastGridData;
    const s = this.coastTexSize;
    const d00 = g[r0 * s + c0];
    const d10 = g[r0 * s + c0 + 1];
    const d01 = g[(r0 + 1) * s + c0];
    const d11 = g[(r0 + 1) * s + c0 + 1];
    return (d00 * (1 - fx) + d10 * fx) * (1 - fz) + (d01 * (1 - fx) + d11 * fx) * fz;
  }

  getElevationAt(x, z) {
    const base = getBaseDemElevationAnalytic(x, z);
    if (!this.importedDem || !this.layers.elevation.visible) {
      return base;
    }
    const dem = this.importedDem;
    if (x < dem.minX || x > dem.maxX || z < dem.minZ || z > dem.maxZ) {
      return base;
    }
    const u = ((x - dem.minX) / Math.max(1, dem.maxX - dem.minX)) * (dem.width - 1);
    const v = ((z - dem.minZ) / Math.max(1, dem.maxZ - dem.minZ)) * (dem.height - 1);
    const col = Math.max(0, Math.min(dem.width - 2, Math.floor(u)));
    const row = Math.max(0, Math.min(dem.height - 2, Math.floor(v)));
    const fx = u - col;
    const fz = v - row;
    const e00 = dem.elevation[row * dem.width + col];
    const e10 = dem.elevation[row * dem.width + col + 1];
    const e01 = dem.elevation[(row + 1) * dem.width + col];
    const e11 = dem.elevation[(row + 1) * dem.width + col + 1];
    const rawMeters = (e00 * (1 - fx) + e10 * fx) * (1 - fz) + (e01 * (1 - fx) + e11 * fx) * fz;

    // Scale real Visakhapatnam topographic relief cleanly (~1:5 vertical exaggeration for playable slopes, 0m = Bay shoreline)
    const demWorldY = rawMeters <= 0.2 ? Math.max(-5.5, rawMeters * 0.4) : Math.min(58, rawMeters * 0.21 + 1.4);

    // Smooth edge blend (45m collar) into surrounding curated Vizag terrain
    const edgeDist = Math.min(x - dem.minX, dem.maxX - x, z - dem.minZ, dem.maxZ - z);
    const blend = Math.max(0, Math.min(1, edgeDist / 45));
    return base * (1 - blend) + demWorldY * blend;
  }

  hasImportedFootprintsInChunk(minX, maxX, minZ, maxZ) {
    if (this.importedBuildings.length === 0) return false;
    for (let i = 0; i < this.importedBuildings.length; i++) {
      const b = this.importedBuildings[i];
      if (b.maxX >= minX && b.minX <= maxX && b.maxZ >= minZ && b.minZ <= maxZ) {
        return true;
      }
    }
    return false;
  }

  getBuildingsInChunk(minX, maxX, minZ, maxZ) {
    const cx = (minX + maxX) * 0.5;
    const cz = (minZ + maxZ) * 0.5;
    const out = [];
    const source = this.importedBuildings.length > 0 ? this.importedBuildings : CURATED_FOOTPRINTS;
    for (const b of source) {
      const p0 = b.pts[0];
      if (!p0) continue;
      if (p0.x >= minX && p0.x < maxX && p0.z >= minZ && p0.z < maxZ) {
        out.push(b);
      } else if (b.minX !== undefined && b.maxX >= minX && b.minX <= maxX && b.maxZ >= minZ && b.minZ <= maxZ && Math.abs(b.cx - cx) < 70 && Math.abs(b.cz - cz) < 70) {
        out.push(b);
      }
    }
    return out;
  }

  getBoundaryFeatures() {
    if (this.importedBoundaries.length > 0) return this.importedBoundaries;
    return DISTRICTS.map((d) => {
      const pts = [];
      const steps = 20;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        pts.push({ x: d.x + Math.cos(a) * d.radius, z: d.z + Math.sin(a) * d.radius });
      }
      return { kind: 'LINE', name: d.name, pts };
    });
  }

  getLanduseFeatures() {
    return this.importedLanduse.length > 0 ? this.importedLanduse : CURATED_LANDUSE_ZONES;
  }

  getPoiFeatures() {
    return [...CURATED_POIS, ...this.importedPois];
  }

  setLayerVisible(layerId, visible) {
    const entry = this.layers[layerId];
    if (!entry) return;
    entry.visible = Boolean(visible);
    if (layerId === 'satellite' && this.orthoRasterMesh) {
      this.orthoRasterMesh.visible = entry.visible;
    }
    this.revision++;
    this.notifyHost();
  }

  _markDatasetImported(id, detail) {
    const ds = this.externalDatasets.find((d) => d.id === id);
    if (ds) {
      ds.status = 'IMPORTED_LIVE';
      ds.detail = detail;
    }
  }

  async importFromUrl(url, fileName, layerHint = 'auto') {
    const lower = String(fileName || url).toLowerCase();
    try {
      if (lower.endsWith('.geojson') || lower.endsWith('.json')) {
        const text = await (await fetch(url)).text();
        const parsed = parseGeoJsonText(text, layerHint);
        this._ingestParsedVectorBuckets(parsed.buckets, fileName, layerHint);
        this.revision++;
        this.notifyHost();
        return { ok: true, message: `Imported ${parsed.totalFeatures} GIS features from ${fileName}` };
      }

      if (lower.endsWith('.kml')) {
        const text = await (await fetch(url)).text();
        const parsed = parseKmlText(text, layerHint);
        this._ingestParsedVectorBuckets(parsed.buckets, fileName, layerHint);
        this.revision++;
        this.notifyHost();
        return { ok: true, message: `Imported ${parsed.totalFeatures} KML geometries from ${fileName}` };
      }

      if (lower.endsWith('.tif') || lower.endsWith('.tiff')) {
        const buf = await (await fetch(url)).arrayBuffer();
        const tiff = await parseGeoTiff(buf);
        const tl = latLngToWorld(tiff.bounds.maxLat, tiff.bounds.minLng);
        const br = latLngToWorld(tiff.bounds.minLat, tiff.bounds.maxLng);
        const minX = Math.min(tl.x, br.x);
        const maxX = Math.max(tl.x, br.x);
        const minZ = Math.min(tl.z, br.z);
        const maxZ = Math.max(tl.z, br.z);

        if (tiff.kind === 'DEM_ELEVATION') {
          this.importedDem = {
            width: tiff.width,
            height: tiff.height,
            minX,
            maxX,
            minZ,
            maxZ,
            elevation: tiff.elevation
          };
          this.layers.elevation.sourceType = 'IMPORTED_FILE';
          this.layers.elevation.sourceName = fileName;
          this.layers.elevation.count = tiff.width * tiff.height;
          this._markDatasetImported('copernicus_dem_geotiff', `Active DEM (${tiff.width}x${tiff.height}) from ${fileName}`);
          this.revision++;
          this.notifyHost();
          return { ok: true, message: `Loaded GeoTIFF DEM (${tiff.width}x${tiff.height}) from ${fileName}` };
        } else {
          this._mountOrthoRgbaRaster(tiff.width, tiff.height, tiff.rgba, minX, maxX, minZ, maxZ, fileName);
          return { ok: true, message: `Loaded GeoTIFF Raster (${tiff.width}x${tiff.height}) from ${fileName}` };
        }
      }

      if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
        await this._mountImageOrthoUrl(url, fileName, layerHint);
        return { ok: true, message: `Draped reference raster ${fileName} over Vizag metro bounds` };
      }

      if (lower.endsWith('.glb') || lower.endsWith('.gltf')) {
        if (!this.gltfLoader) {
          return { ok: false, message: 'GLTFLoader unavailable offline for GLB import' };
        }
        const gltf = await new Promise((resolve, reject) => {
          this.gltfLoader.load(url, resolve, undefined, reject);
        });
        if (gltf && gltf.scene) {
          const box = new this.THREE.Box3().setFromObject(gltf.scene);
          const minY = box.min.y;
          gltf.scene.position.y -= minY;
          gltf.scene.traverse((o) => {
            if (o.isMesh) {
              o.castShadow = true;
              o.receiveShadow = true;
            }
          });
          this.importedGlbGroup.add(gltf.scene);
          this.importedGlbModels.push({ fileName, scene: gltf.scene });
          this.layers.pois.sourceType = 'IMPORTED_FILE';
          this.layers.pois.count += 1;
          this.revision++;
          this.notifyHost();
          return { ok: true, message: `Placed 3D GLB model ${fileName} into Vizag scene`, gltfScene: gltf.scene };
        }
      }

      return { ok: false, message: `Unsupported GIS/3D extension for ${fileName}` };
    } catch (err) {
      return { ok: false, message: `Import failed (${fileName}): ${err.message}` };
    }
  }

  _ingestParsedVectorBuckets(buckets, fileName, layerHint) {
    if (buckets.boundaries.length > 0) {
      this.importedBoundaries.push(...buckets.boundaries);
      this.layers.boundaries.sourceType = 'IMPORTED_FILE';
      this.layers.boundaries.sourceName = fileName;
      this.layers.boundaries.count = this.importedBoundaries.length;
      this._markDatasetImported('gvmc_ward_kml', `Loaded ${this.importedBoundaries.length} boundary features (${fileName})`);
    }

    if (buckets.roads.length > 0) {
      for (const r of buckets.roads) {
        const hw = String((r.props && r.props.highway) || '').toLowerCase();
        const width = hw.includes('trunk') || hw.includes('primary') ? 15 : (hw.includes('secondary') ? 13 : 9.5);
        for (let i = 0; i < r.pts.length - 1; i++) {
          this.importedRoads.push({
            x1: r.pts[i].x,
            z1: r.pts[i].z,
            x2: r.pts[i + 1].x,
            z2: r.pts[i + 1].z,
            width,
            name: r.name || 'OSM Road',
            hasMedian: width >= 14,
            hasKerb: true,
            isBridge: String((r.props && r.props.bridge) || '') === 'yes'
          });
        }
      }
      this.layers.roads.sourceType = 'IMPORTED_FILE';
      this.layers.roads.sourceName = fileName;
      this.layers.roads.count = this.importedRoads.length;
      this._markDatasetImported('osm_roads_geojson', `Loaded ${this.importedRoads.length} OSM road segments (${fileName})`);
    }

    if (buckets.buildings.length > 0) {
      for (const b of buckets.buildings) {
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        for (const p of b.pts) {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.z < minZ) minZ = p.z;
          if (p.z > maxZ) maxZ = p.z;
        }
        b.minX = minX;
        b.maxX = maxX;
        b.minZ = minZ;
        b.maxZ = maxZ;
        b.cx = (minX + maxX) * 0.5;
        b.cz = (minZ + maxZ) * 0.5;
        this.importedBuildings.push(b);
      }
      this.layers.buildings.sourceType = 'IMPORTED_FILE';
      this.layers.buildings.sourceName = fileName;
      this.layers.buildings.count = this.importedBuildings.length;
      this._markDatasetImported('osm_buildings_geojson', `Extruding ${this.importedBuildings.length} GeoJSON building footprints (${fileName})`);
    }

    if (buckets.landuse.length > 0) {
      this.importedLanduse.push(...buckets.landuse);
      this.layers.landuse.sourceType = 'IMPORTED_FILE';
      this.layers.landuse.sourceName = fileName;
      this.layers.landuse.count = this.importedLanduse.length;
      this.layers.landuse.visible = true;
      this._markDatasetImported('vmrda_master_plan', `Loaded ${this.importedLanduse.length} land-use polygons (${fileName})`);
    }

    if (buckets.coastline.length > 0) {
      this.importedCoastlines.push(...buckets.coastline);
      this.layers.coastline.sourceType = 'IMPORTED_FILE';
      this.layers.coastline.sourceName = fileName;
      this.layers.coastline.count = this.importedCoastlines.length;
      this.rebuildCoastDistanceGrid();
    }

    if (buckets.water.length > 0) {
      this.importedWater.push(...buckets.water);
      this.layers.water.sourceType = 'IMPORTED_FILE';
      this.layers.water.sourceName = fileName;
      this.layers.water.count = this.importedWater.length;
    }

    if (buckets.pois.length > 0) {
      this.importedPois.push(...buckets.pois.map((p) => ({
        id: `poi_${this.importedPois.length}_${Math.random()}`,
        name: p.name,
        x: p.pt.x,
        z: p.pt.z,
        lat: p.pt.lat,
        lng: p.pt.lng,
        category: 'Imported POI'
      })));
      this.layers.pois.sourceType = 'IMPORTED_FILE';
      this.layers.pois.count = CURATED_POIS.length + this.importedPois.length;
    }

    if (layerHint === 'vmrda_master_plan' && buckets.boundaries.length > 0 && buckets.landuse.length === 0) {
      this.importedLanduse.push(...buckets.boundaries);
      this.layers.landuse.sourceType = 'IMPORTED_FILE';
      this.layers.landuse.sourceName = fileName;
      this.layers.landuse.count = this.importedLanduse.length;
      this.layers.landuse.visible = true;
      this._markDatasetImported('vmrda_master_plan', `Loaded ${this.importedLanduse.length} polygons (${fileName})`);
    }
  }

  _mountOrthoRgbaRaster(width, height, rgba, minX, maxX, minZ, maxZ, fileName) {
    const THREE = this.THREE;
    const tex = new THREE.DataTexture(rgba, width, height, THREE.RGBAFormat);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = true;
    tex.needsUpdate = true;
    this._applyOrthoTexturePlane(tex, minX, maxX, minZ, maxZ, fileName, 'natmo_satellite_raster');
  }

  _mountImageOrthoUrl(url, fileName, layerHint) {
    const THREE = this.THREE;
    return new Promise((resolve, reject) => {
      new THREE.TextureLoader().load(
        url,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          const sw = latLngToWorld(17.630, 83.160);
          const ne = latLngToWorld(17.895, 83.465);
          const dsId = layerHint === 'ortho_ref_image' ? 'ortho_ref_image' : 'natmo_satellite_raster';
          this._applyOrthoTexturePlane(tex, sw.x, ne.x, ne.z, sw.z, fileName, dsId);
          resolve();
        },
        undefined,
        reject
      );
    });
  }

  _applyOrthoTexturePlane(tex, minX, maxX, minZ, maxZ, fileName, datasetId) {
    const THREE = this.THREE;
    if (this.orthoRasterMesh) {
      this.scene.remove(this.orthoRasterMesh);
      this.orthoRasterMesh.geometry.dispose();
      this.orthoRasterMesh.material.dispose();
    }
    const w = Math.max(20, Math.abs(maxX - minX));
    const d = Math.max(20, Math.abs(maxZ - minZ));
    const geo = new THREE.PlaneGeometry(w, d);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.72,
      depthWrite: false
    });
    this.orthoRasterMesh = new THREE.Mesh(geo, mat);
    this.orthoRasterMesh.position.set((minX + maxX) * 0.5, 2.35, (minZ + maxZ) * 0.5);
    this.orthoRasterMesh.visible = this.layers.satellite.visible;
    this.scene.add(this.orthoRasterMesh);

    this.layers.satellite.sourceType = 'IMPORTED_FILE';
    this.layers.satellite.sourceName = fileName;
    this.layers.satellite.count = 1;
    this._markDatasetImported(datasetId, `Ortho imagery active (${fileName})`);
    this.revision++;
    this.notifyHost();
  }

  notifyHost() {
    if (this.onStateChanged) {
      const payload = {
        layers: Object.values(this.layers),
        datasets: this.externalDatasets,
        pois: this.getPoiFeatures().map((p) => ({ name: p.name, x: p.x, z: p.z, category: p.category })),
        revision: this.revision
      };
      this.onStateChanged(JSON.stringify(payload));
    }
  }
}
