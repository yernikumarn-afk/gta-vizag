// WorldStreamer: Zero-Hitch Spatial Streaming driven by 10-Layer GIS Data
// Renders DEM terrain, signed-coastline coloring, geographic roads, harbor bridges, flyovers,
// extruded GeoJSON footprints, GK/VMRDA boundary & land-use overlays, vegetation & POI markers.
import {
  FLYOVER_SEGMENTS,
  JUNCTION_NODES,
  distanceToNearestRoad,
  getActiveRoadSegments,
  getCoastSignedDistance,
  getDistrictAt,
  getFlyoverSurfaceY,
  getTerrainHeight,
  latLngToWorld
} from '../data/VizagGeoData.js';
import { isNearEnterableBuilding } from '../systems/InteriorManager.js';
import { TextureManager } from '../managers/TextureManager.js';
import { MaterialManager } from '../managers/MaterialManager.js';
import { DetailedBuildingBuilder } from './DetailedBuildingBuilder.js';

export const CHUNK_SIZE = 140;

const LANDMARK_COORDS = {
  kursura: latLngToWorld(17.7172, 83.3275),
  victory: latLngToWorld(17.7124, 83.3220),
  kailasagiri: latLngToWorld(17.7492, 83.3422),
  port: latLngToWorld(17.6945, 83.2915),
  lighthouse: latLngToWorld(17.6775, 83.2948),
  petrol: latLngToWorld(17.7195, 83.3266)
};

export class ChunkStreamManager {
  constructor(THREE, scene, textureManager = null, materialManager = null, gisManager = null) {
    this.THREE = THREE;
    this.scene = scene;
    this.gis = gisManager;
    this.chunks = new Map();
    this.activeRadius = 1; // 1 = 3x3, 2 = 5x5
    this.lastCenterKey = '';
    this.pendingKeysQueue = [];

    this.tex = textureManager || new TextureManager(THREE);
    this.materials = materialManager || new MaterialManager(THREE, this.tex);
    this.builder = new DetailedBuildingBuilder(THREE, this.tex, this.materials);
  }

  setGisManager(mgr) {
    this.gis = mgr;
  }

  invalidateAllChunks() {
    for (const chunk of this.chunks.values()) {
      this._disposeChunk(chunk);
    }
    this.chunks.clear();
    this.pendingKeysQueue = [];
    this.lastCenterKey = '';
  }

  syncLayerVisibilityOnly() {
    this.invalidateAllChunks();
  }

  setActiveRadius(radius) {
    const clamped = Math.max(1, Math.min(2, Math.round(radius)));
    if (clamped !== this.activeRadius) {
      this.activeRadius = clamped;
      this.lastCenterKey = '';
    }
  }

  setAnisotropy(level) {
    this.tex.setAnisotropy(level);
  }

  setAtmosphereFlags(isNight, isRainOrFog, wetness = 0.0) {
    this.materials.updateAtmosphereState(isNight, isRainOrFog, wetness);
  }

  update(playerX, playerZ, camera = null, instant = false) {
    if (camera) {
      for (const chunk of this.chunks.values()) {
        for (const lod of chunk.lods) {
          lod.update(camera);
        }
      }
    }

    const centerCx = Math.floor(playerX / CHUNK_SIZE);
    const centerCz = Math.floor(playerZ / CHUNK_SIZE);
    const centerKey = `${centerCx},${centerCz},${this.activeRadius}`;

    if (centerKey !== this.lastCenterKey) {
      this.lastCenterKey = centerKey;
      const neededKeys = new Set();
      const missing = [];

      for (let dx = -this.activeRadius; dx <= this.activeRadius; dx++) {
        for (let dz = -this.activeRadius; dz <= this.activeRadius; dz++) {
          const cx = centerCx + dx;
          const cz = centerCz + dz;
          const key = `${cx},${cz}`;
          neededKeys.add(key);
          if (!this.chunks.has(key)) {
            missing.push({ cx, cz, key, dist: dx * dx + dz * dz });
          }
        }
      }

      missing.sort((a, b) => a.dist - b.dist);
      this.pendingKeysQueue = missing;

      for (const [key, chunk] of this.chunks.entries()) {
        if (!neededKeys.has(key)) {
          this._disposeChunk(chunk);
          this.chunks.delete(key);
        }
      }
    }

    const budget = instant ? this.pendingKeysQueue.length : 2;
    let built = 0;
    while (this.pendingKeysQueue.length > 0 && built < budget) {
      const next = this.pendingKeysQueue.shift();
      if (!this.chunks.has(next.key)) {
        this.chunks.set(next.key, this._generateChunk(next.cx, next.cz));
        built++;
      }
    }
  }

  getActiveChunkCount() {
    return this.chunks.size;
  }

  getActiveColliders() {
    const all = [];
    for (const chunk of this.chunks.values()) {
      for (let i = 0; i < chunk.colliders.length; i++) {
        all.push(chunk.colliders[i]);
      }
    }
    return all;
  }

  getAllLampPositions() {
    const list = [];
    for (const chunk of this.chunks.values()) {
      for (let i = 0; i < chunk.lampPositions.length; i++) {
        list.push(chunk.lampPositions[i]);
      }
    }
    return list;
  }

  getActiveFlyoverSurfaces() {
    const list = [];
    for (const chunk of this.chunks.values()) {
      if (chunk.flyoverSurfaces) {
        for (let i = 0; i < chunk.flyoverSurfaces.length; i++) {
          list.push(chunk.flyoverSurfaces[i]);
        }
      }
    }
    return list;
  }

  getStreetInteractables() {
    const list = [];
    for (const chunk of this.chunks.values()) {
      if (chunk.interactables) {
        for (let i = 0; i < chunk.interactables.length; i++) {
          list.push(chunk.interactables[i]);
        }
      }
    }
    return list;
  }

  _seededRand(seed) {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  _isLayerVisible(layerId) {
    if (!this.gis || !this.gis.layers[layerId]) return layerId !== 'landuse';
    return this.gis.layers[layerId].visible;
  }

  _generateChunk(cx, cz) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    const colliders = [];
    const lods = [];
    const lampPositions = [];
    const flyoverSurfaces = [];
    const interactables = [];

    const minX = cx * CHUNK_SIZE;
    const minZ = cz * CHUNK_SIZE;
    const maxX = minX + CHUNK_SIZE;
    const maxZ = minZ + CHUNK_SIZE;

    // 1. High-density Topographic DEM Terrain Mesh with Signed Coastline Surface Classification
    const segs = 26;
    const terrainGeo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, segs, segs);
    terrainGeo.rotateX(-Math.PI / 2);
    const pos = terrainGeo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    const cDrySand = new THREE.Color(0xe6cc9e);
    const cWetSand = new THREE.Color(0xb59564);
    const cCoastalGrass = new THREE.Color(0x475a47);
    const cGhatForest = new THREE.Color(0x286435);

    const useElevationLayer = this._isLayerVisible('elevation');
    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i) + minX + CHUNK_SIZE * 0.5;
      const wz = pos.getZ(i) + minZ + CHUNK_SIZE * 0.5;
      const distInland = getCoastSignedDistance(wx, wz);
      const wy = useElevationLayer ? getTerrainHeight(wx, wz) : (distInland <= 0 ? -1.5 : 1.6);
      pos.setY(i, wy);

      let vertCol = cCoastalGrass;
      if (distInland < 6.0) {
        vertCol = cWetSand;
      } else if (distInland < 28.0) {
        vertCol = cDrySand;
      } else if (wy > 6.5) {
        vertCol = cGhatForest;
      }
      colors[i * 3] = vertCol.r;
      colors[i * 3 + 1] = vertCol.g;
      colors[i * 3 + 2] = vertCol.b;
    }
    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();

    const terrainMesh = new THREE.Mesh(terrainGeo, this.materials.terrainMat);
    terrainMesh.position.set(minX + CHUNK_SIZE * 0.5, 0, minZ + CHUNK_SIZE * 0.5);
    terrainMesh.receiveShadow = true;
    group.add(terrainMesh);

    // 2. Geographic Road Centerlines + Bridges (Port Channel Harbor Bridge) + Flyovers
    if (this._isLayerVisible('roads')) {
      this._buildChunkRoadsAndJunctions(group, minX, maxX, minZ, maxZ, colliders, flyoverSurfaces);
    }

    // 3.RK Beach Terracotta Promenade projected along RK Beach -> INS Kursura coastline
    this._buildProjectedRkPromenade(group, minX, maxX, minZ, maxZ, lampPositions, interactables);

    // 4. Geographic GIS Layers (Boundaries Ribbon, VMRDA Land-Use Zones, GIS POI Beacons)
    this._buildChunkGisOverlays(group, minX, maxX, minZ, maxZ);

    // 5. Extruded Building Footprints from GeoJSON / Curated Parcels
    const extrudedBoxes = [];
    const showBuildings = this._isLayerVisible('buildings');
    if (showBuildings && this.gis) {
      const footprints = this.gis.getBuildingsInChunk(minX, maxX, minZ, maxZ);
      for (const fp of footprints) {
        if (!fp.pts || fp.pts.length < 3) continue;
        let sx = 0, sz = 0;
        for (const p of fp.pts) {
          sx += p.x;
          sz += p.z;
        }
        const cxFp = sx / fp.pts.length;
        const czFp = sz / fp.pts.length;
        if (cxFp < minX || cxFp >= maxX || czFp < minZ || czFp >= maxZ) continue;

        const district = getDistrictAt(cxFp, czFp);
        const tintHex = (fp.props && fp.props.tint) || district.palette[0];
        const height = (fp.props && Number(fp.props.height)) || (district.density === 'highrise' ? 24 : 14);
        const groundY = getTerrainHeight(cxFp, czFp);
        const bldg = this.builder.createFootprintExtrudedBuilding(
          fp.pts,
          height,
          this.materials.getFacadeMaterial(tintHex),
          groundY,
          colliders
        );
        if (bldg) {
          group.add(bldg);
          extrudedBoxes.push({ x: cxFp, z: czFp, r: 18 });
        }
      }
    }

    // 6. VMRDA Zoned Architectural Buildings & Vegetation Scatter
    // STRICT RULE: Suppress procedural building lots wherever imported OSM GeoJSON footprints exist!
    const hasImportedFootprints = this.gis && this.gis.hasImportedFootprintsInChunk(minX, maxX, minZ, maxZ);
    const showVegetation = this._isLayerVisible('vegetation');
    const step = 36;
    let shopCounter = 0;

    for (let gx = minX + 18; gx < maxX; gx += step) {
      for (let gz = minZ + 18; gz < maxZ; gz += step) {
        const distInland = getCoastSignedDistance(gx, gz);
        if (distInland < 26.0) continue;

        if (isNearEnterableBuilding(gx, gz, 18)) continue;

        const { clearance } = distanceToNearestRoad(gx, gz);
        if (clearance < 13.0) continue;

        if (Math.hypot(gx - LANDMARK_COORDS.kursura.x, gz - LANDMARK_COORDS.kursura.z) < 34) continue;
        if (Math.hypot(gx - LANDMARK_COORDS.kailasagiri.x, gz - LANDMARK_COORDS.kailasagiri.z) < 32) continue;
        if (Math.hypot(gx - LANDMARK_COORDS.petrol.x, gz - LANDMARK_COORDS.petrol.z) < 22) continue;
        if (Math.hypot(gx - LANDMARK_COORDS.lighthouse.x, gz - LANDMARK_COORDS.lighthouse.z) < 24) continue;
        if (Math.hypot(gx - LANDMARK_COORDS.port.x, gz - LANDMARK_COORDS.port.z) < 28) continue;

        let overlapsFootprint = false;
        for (const eb of extrudedBoxes) {
          if (Math.hypot(gx - eb.x, gz - eb.z) < eb.r + 8) {
            overlapsFootprint = true;
            break;
          }
        }
        if (overlapsFootprint) continue;

        const seed = Math.abs(Math.floor(gx * 31.7 + gz * 17.3));
        const r1 = this._seededRand(seed);

        if (r1 < 0.30 || hasImportedFootprints || !showBuildings) {
          if (showVegetation && r1 < 0.34) {
            if (r1 < 0.16 && getTerrainHeight(gx, gz) < 10.0) {
              group.add(this.builder.createCoconutPalm(gx, gz, 0.92 + r1 * 0.6, seed));
            } else {
              group.add(this.builder.createTropicalTree(gx, gz, 0.85 + r1 * 0.6, seed));
            }
            group.add(this.builder.createCoastalShrub(gx + 3.2, gz - 2.4, 0.9, seed));
          }
          continue;
        }

        const district = getDistrictAt(gx, gz);
        const w = 13 + this._seededRand(seed + 1) * 9;
        const d = 13 + this._seededRand(seed + 2) * 9;
        let h = 11 + this._seededRand(seed + 3) * 15;
        if (district.density === 'highrise') h += 16;
        if (district.density === 'hilltop' || district.density === 'temple_hill') h = 7.5 + r1 * 4;

        const tintHex = district.palette[seed % district.palette.length];
        const facadeMat = this.materials.getFacadeMaterial(tintHex);

        const lodBuilding = this.builder.createDetailedBuildingLOD(
          gx,
          gz,
          w,
          h,
          d,
          tintHex,
          facadeMat,
          shopCounter++
        );
        group.add(lodBuilding);
        lods.push(lodBuilding);

        if (showVegetation && seed % 3 === 0) {
          group.add(this.builder.createCoastalShrub(gx + w * 0.5 + 1.8, gz + d * 0.35, 0.85, seed + 2));
        }

        const groundY = getTerrainHeight(gx, gz);
        colliders.push({
          minX: gx - (w * 0.5 + 0.5),
          maxX: gx + (w * 0.5 + 0.5),
          minZ: gz - (d * 0.5 + 0.5),
          maxZ: gz + (d * 0.5 + 0.5),
          minY: groundY - 1.0,
          maxY: groundY + h
        });
      }
    }

    // 7. Authentic WGS84-Positioned Landmarks
    const inChunk = (pt) => pt.x >= minX && pt.x < maxX && pt.z >= minZ && pt.z < maxZ;
    if (inChunk(LANDMARK_COORDS.petrol)) {
      group.add(this.builder.createPetrolStation(LANDMARK_COORDS.petrol.x - 16, LANDMARK_COORDS.petrol.z, colliders));
    }
    if (inChunk(LANDMARK_COORDS.kursura)) {
      group.add(this.builder.buildKursuraSubmarine(colliders));
    }
    if (inChunk(LANDMARK_COORDS.victory)) {
      group.add(this.builder.buildVictoryMemorial(colliders));
    }
    if (inChunk(LANDMARK_COORDS.kailasagiri)) {
      group.add(this.builder.buildKailasagiriSummit(colliders));
    }
    if (inChunk(LANDMARK_COORDS.port)) {
      group.add(this.builder.buildPortTerminal(colliders));
    }
    if (inChunk(LANDMARK_COORDS.lighthouse)) {
      group.add(this.builder.buildDolphinsNoseLighthouse(colliders));
    }

    this.scene.add(group);
    return { group, colliders, lods, lampPositions, flyoverSurfaces, interactables };
  }

  _buildChunkGisOverlays(group, minX, maxX, minZ, maxZ) {
    const THREE = this.THREE;

    // Layer 1: Boundaries ribbon
    if (this._isLayerVisible('boundaries') && this.gis) {
      const boundaries = this.gis.getBoundaryFeatures();
      const boundaryMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.42 });
      for (const bf of boundaries) {
        if (!bf.pts || bf.pts.length < 2) continue;
        let anyIn = false;
        for (const p of bf.pts) {
          if (p.x >= minX && p.x <= maxX && p.z >= minZ && p.z <= maxZ) {
            anyIn = true;
            break;
          }
        }
        if (!anyIn) continue;
        const verts = [];
        for (const p of bf.pts) {
          verts.push(p.x, Math.max(0.5, getTerrainHeight(p.x, p.z)) + 0.35, p.z);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        group.add(new THREE.Line(geo, boundaryMat));
      }
    }

    // Layer 9: VMRDA Master Plan Land-Use translucent patches
    if (this._isLayerVisible('landuse') && this.gis) {
      const zones = this.gis.getLanduseFeatures();
      for (const zItem of zones) {
        const pts = zItem.pts;
        if (!pts || pts.length < 3) continue;
        let zMinX = Infinity, zMaxX = -Infinity, zMinZ = Infinity, zMaxZ = -Infinity;
        let sumX = 0, sumZ = 0;
        for (const p of pts) {
          if (p.x < zMinX) zMinX = p.x;
          if (p.x > zMaxX) zMaxX = p.x;
          if (p.z < zMinZ) zMinZ = p.z;
          if (p.z > zMaxZ) zMaxZ = p.z;
          sumX += p.x;
          sumZ += p.z;
        }
        const cxZ = sumX / pts.length;
        const czZ = sumZ / pts.length;
        if (cxZ < minX || cxZ >= maxX || czZ < minZ || czZ >= maxZ) continue;
        const shape = new THREE.Shape();
        shape.moveTo(pts[0].x - cxZ, -(pts[0].z - czZ));
        for (let i = 1; i < pts.length; i++) {
          shape.lineTo(pts[i].x - cxZ, -(pts[i].z - czZ));
        }
        shape.closePath();
        const geo = new THREE.ShapeGeometry(shape);
        geo.rotateX(-Math.PI / 2);
        const col = new THREE.Color(zItem.colorHex || '#ff2e93');
        const mat = new THREE.MeshBasicMaterial({
          color: col,
          transparent: true,
          opacity: 0.24,
          depthWrite: false
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(cxZ, getTerrainHeight(cxZ, czZ) + 0.25, czZ);
        group.add(mesh);
      }
    }

    // Layer 10: Points of Interest 3D Neon Beacons
    if (this._isLayerVisible('pois') && this.gis) {
      const pois = this.gis.getPoiFeatures();
      for (const poi of pois) {
        if (poi.x < minX || poi.x >= maxX || poi.z < minZ || poi.z >= maxZ) continue;
        const py = Math.max(0.4, getTerrainHeight(poi.x, poi.z));
        const pinMat = new THREE.MeshBasicMaterial({ color: 0xff2e93, transparent: true, opacity: 0.85 });
        const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.95, 0), pinMat);
        beacon.position.set(poi.x, py + 24, poi.z);
        const beam = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.14, 22, 6),
          new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.28 })
        );
        beam.position.set(poi.x, py + 12, poi.z);
        group.add(beacon, beam);
      }
    }
  }

  _buildChunkRoadsAndJunctions(group, minX, maxX, minZ, maxZ, colliders, flyoverSurfaces) {
    const THREE = this.THREE;
    const pad = 26;
    const roadSlabs = [];
    const sidewalkMeshes = [];
    const curbMeshes = [];
    const drainMeshes = [];
    const unitBox = this.builder.unitBoxGeo;

    const roadSegments = getActiveRoadSegments();
    for (const seg of roadSegments) {
      const sMinX = Math.min(seg.x1, seg.x2) - pad;
      const sMaxX = Math.max(seg.x1, seg.x2) + pad;
      const sMinZ = Math.min(seg.z1, seg.z2) - pad;
      const sMaxZ = Math.max(seg.z1, seg.z2) + pad;
      if (sMaxX < minX || sMinX > maxX || sMaxZ < minZ || sMinZ > maxZ) continue;

      const dx = seg.x2 - seg.x1;
      const dz = seg.z2 - seg.z1;
      const totalLen = Math.hypot(dx, dz);
      if (totalLen < 0.5) continue;

      // Harbor / Water-Crossing Bridge Deck Geometry
      if (seg.isBridge) {
        this._buildBridgeSegment(group, seg, minX, maxX, minZ, maxZ, colliders, flyoverSurfaces);
        continue;
      }

      const pieces = Math.max(1, Math.ceil(totalLen / 22));
      const yaw = Math.atan2(dx, dz);
      const rightX = Math.cos(yaw);
      const rightZ = -Math.sin(yaw);

      for (let i = 0; i < pieces; i++) {
        const tMid = (i + 0.5) / pieces;
        const mx = seg.x1 + dx * tMid;
        const mz = seg.z1 + dz * tMid;
        if (mx < minX || mx >= maxX || mz < minZ || mz >= maxZ) continue;

        const t0 = i / pieces;
        const t1 = (i + 1) / pieces;
        const y0 = getTerrainHeight(seg.x1 + dx * t0, seg.z1 + dz * t0);
        const y1 = getTerrainHeight(seg.x1 + dx * t1, seg.z1 + dz * t1);
        const pieceLen = totalLen / pieces + 0.65;
        const slopePitch = -Math.atan2(y1 - y0, totalLen / pieces);
        const midY = (y0 + y1) * 0.5;

        const slab = new THREE.Mesh(new THREE.PlaneGeometry(seg.width, pieceLen));
        slab.rotation.order = 'YXZ';
        slab.rotation.y = yaw;
        slab.rotation.x = -Math.PI / 2 + slopePitch;
        slab.position.set(mx, midY + 0.08, mz);
        roadSlabs.push(slab);

        const curbOffset = seg.width * 0.5 + 0.22;
        const walkOffset = seg.width * 0.5 + 1.85;
        for (const sideSign of [-1, 1]) {
          const curb = new THREE.Mesh(unitBox);
          curb.scale.set(0.45, 0.24, pieceLen);
          curb.rotation.order = 'YXZ';
          curb.rotation.y = yaw;
          curb.rotation.x = slopePitch;
          curb.position.set(mx + rightX * curbOffset * sideSign, midY + 0.14, mz + rightZ * curbOffset * sideSign);
          curbMeshes.push(curb);

          const sidewalk = new THREE.Mesh(unitBox);
          sidewalk.scale.set(2.8, 0.22, pieceLen);
          sidewalk.rotation.order = 'YXZ';
          sidewalk.rotation.y = yaw;
          sidewalk.rotation.x = slopePitch;
          sidewalk.position.set(mx + rightX * walkOffset * sideSign, midY + 0.13, mz + rightZ * walkOffset * sideSign);
          sidewalkMeshes.push(sidewalk);
        }

        if (i % 2 === 0) {
          const drainSide = i % 4 === 0 ? 1 : -1;
          const drainOffset = seg.width * 0.5 - 0.55;
          const grate = new THREE.Mesh(unitBox);
          grate.scale.set(0.75, 0.05, 1.35);
          grate.rotation.order = 'YXZ';
          grate.rotation.y = yaw;
          grate.rotation.x = slopePitch;
          grate.position.set(mx + rightX * drainOffset * drainSide, midY + 0.095, mz + rightZ * drainOffset * drainSide);
          drainMeshes.push(grate);
        }
      }
    }

    // Elevated Concrete Flyover Overpasses with Ramps & Support Piers
    for (const fly of FLYOVER_SEGMENTS) {
      this._buildElevatedDeck(group, fly, fly.deckElevation, minX, maxX, minZ, maxZ, colliders, flyoverSurfaces);
    }

    if (roadSlabs.length > 0) {
      const mergedRoads = new THREE.Mesh(this.builder._mergeBakedMeshes(roadSlabs), this.materials.roadMaterial);
      mergedRoads.receiveShadow = true;
      group.add(mergedRoads);
      for (const s of roadSlabs) s.geometry.dispose();
    }
    if (sidewalkMeshes.length > 0) {
      const mergedWalks = new THREE.Mesh(this.builder._mergeBakedMeshes(sidewalkMeshes), this.materials.sidewalkMat);
      mergedWalks.receiveShadow = true;
      group.add(mergedWalks);
    }
    if (curbMeshes.length > 0) {
      const mergedCurbs = new THREE.Mesh(this.builder._mergeBakedMeshes(curbMeshes), this.materials.curbMat);
      mergedCurbs.receiveShadow = true;
      mergedCurbs.castShadow = true;
      group.add(mergedCurbs);
    }
    if (drainMeshes.length > 0) {
      const mergedDrains = new THREE.Mesh(this.builder._mergeBakedMeshes(drainMeshes), this.materials.drainGrateMat);
      mergedDrains.receiveShadow = true;
      group.add(mergedDrains);
    }

    for (const jn of JUNCTION_NODES) {
      if (jn.x < minX || jn.x >= maxX || jn.z < minZ || jn.z >= maxZ) continue;
      const jy = getTerrainHeight(jn.x, jn.z);
      if (jn.isRoundabout) {
        const island = new THREE.Mesh(
          new THREE.CylinderGeometry(4.2, 4.6, 0.85, 22),
          this.materials.concreteMat
        );
        island.position.set(jn.x, jy + 0.4, jn.z);
        island.receiveShadow = true;
        group.add(island);
        group.add(this.builder.createCoconutPalm(jn.x, jn.z, 0.95, 11));
        group.add(this.builder.createCoastalShrub(jn.x + 2.2, jn.z + 1.5, 0.85, 7));
        colliders.push({
          minX: jn.x - 4.2,
          maxX: jn.x + 4.2,
          minZ: jn.z - 4.2,
          maxZ: jn.z + 4.2,
          minY: jy,
          maxY: jy + 5.0
        });
      } else if (jn.hasSignal) {
        group.add(this.builder.createTrafficSignal(jn.x + 9.8, jn.z + 6));
      }
      if (jn.hasCrosswalk) {
        group.add(this.builder.createZebraCrosswalk(jn.x, jn.z + 9.0, 0, 17.5));
        group.add(this.builder.createZebraCrosswalk(jn.x, jn.z - 9.0, 0, 17.5));
      }
    }
  }

  _buildBridgeSegment(group, seg, minX, maxX, minZ, maxZ, colliders, flyoverSurfaces) {
    this._buildElevatedDeck(group, { ...seg, deckElevation: 7.2 }, 7.2, minX, maxX, minZ, maxZ, colliders, flyoverSurfaces, true);
  }

  _buildElevatedDeck(group, fly, deckLift, minX, maxX, minZ, maxZ, colliders, flyoverSurfaces, isWaterBridge = false) {
    const THREE = this.THREE;
    const fMinX = Math.min(fly.x1, fly.x2) - 18;
    const fMaxX = Math.max(fly.x1, fly.x2) + 18;
    const fMinZ = Math.min(fly.z1, fly.z2) - 18;
    const fMaxZ = Math.max(fly.z1, fly.z2) + 18;
    if (fMaxX < minX || fMinX > maxX || fMaxZ < minZ || fMinZ > maxZ) return;

    const dx = fly.x2 - fly.x1;
    const dz = fly.z2 - fly.z1;
    const totalLen = Math.hypot(dx, dz);
    const yaw = Math.atan2(dx, dz);
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);
    const steps = 12;
    const stepLen = totalLen / steps;
    const flyCfg = { ...fly, deckElevation: deckLift };

    const getBridgeY = (t) => {
      if (isWaterBridge) {
        const y0 = Math.max(1.8, getTerrainHeight(fly.x1, fly.z1));
        const y1 = Math.max(1.8, getTerrainHeight(fly.x2, fly.z2));
        const base = y0 + (y1 - y0) * t;
        const arch = Math.sin(t * Math.PI) * 7.8;
        return base + arch + 0.12;
      }
      return getFlyoverSurfaceY(flyCfg, t);
    };

    for (let i = 0; i < steps; i++) {
      const tMid = (i + 0.5) / steps;
      const mx = fly.x1 + dx * tMid;
      const mz = fly.z1 + dz * tMid;
      if (mx < minX || mx >= maxX || mz < minZ || mz >= maxZ) continue;

      const y0 = getBridgeY(i / steps);
      const y1 = getBridgeY((i + 1) / steps);
      const midY = (y0 + y1) * 0.5;
      const pitch = -Math.atan2(y1 - y0, stepLen);

      const deck = new THREE.Mesh(
        new THREE.BoxGeometry(fly.width, 0.55, stepLen + 0.6),
        this.materials.concreteMat
      );
      deck.rotation.order = 'YXZ';
      deck.rotation.y = yaw;
      deck.rotation.x = pitch;
      deck.position.set(mx, midY - 0.28, mz);
      deck.castShadow = true;
      deck.receiveShadow = true;
      group.add(deck);

      const topRoad = new THREE.Mesh(
        new THREE.PlaneGeometry(fly.width - 0.8, stepLen + 0.6),
        this.materials.roadMaterial
      );
      topRoad.rotation.order = 'YXZ';
      topRoad.rotation.y = yaw;
      topRoad.rotation.x = -Math.PI / 2 + pitch;
      topRoad.position.set(mx, midY + 0.02, mz);
      group.add(topRoad);

      // Guardrail parapets
      for (const sSign of [-1, 1]) {
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(0.32, 0.85, stepLen + 0.5),
          this.materials.railingMat
        );
        rail.rotation.order = 'YXZ';
        rail.rotation.y = yaw;
        rail.rotation.x = pitch;
        rail.position.set(mx + rightX * (fly.width * 0.48) * sSign, midY + 0.42, mz + rightZ * (fly.width * 0.48) * sSign);
        group.add(rail);
      }

      if (i >= 2 && i <= steps - 3 && i % 2 === 0) {
        const groundY = Math.min(-4.0, getTerrainHeight(mx, mz));
        const pierH = Math.max(1.5, midY - groundY);
        const pier = new THREE.Mesh(
          new THREE.CylinderGeometry(0.68, 0.92, pierH, 10),
          this.materials.concreteMat
        );
        pier.position.set(mx, groundY + pierH * 0.5, mz);
        pier.castShadow = true;
        group.add(pier);
        colliders.push({
          minX: mx - 0.9,
          maxX: mx + 0.9,
          minZ: mz - 0.9,
          maxZ: mz + 0.9,
          minY: groundY,
          maxY: midY - 0.5
        });
      }

      const lenSq = dx * dx + dz * dz;
      flyoverSurfaces.push({
        minX: Math.min(fly.x1, fly.x2) - fly.width * 0.55,
        maxX: Math.max(fly.x1, fly.x2) + fly.width * 0.55,
        minZ: Math.min(fly.z1, fly.z2) - fly.width * 0.55,
        maxZ: Math.max(fly.z1, fly.z2) + fly.width * 0.55,
        getY: (wx, wz) => {
          const t = Math.max(0, Math.min(1, ((wx - fly.x1) * dx + (wz - fly.z1) * dz) / lenSq));
          const px = fly.x1 + dx * t;
          const pz = fly.z1 + dz * t;
          if (Math.hypot(wx - px, wz - pz) > fly.width * 0.52) return -999;
          return getBridgeY(t);
        },
        isIndoor: false
      });
    }
  }

  _buildProjectedRkPromenade(group, minX, maxX, minZ, maxZ, lampPositions, interactables) {
    const THREE = this.THREE;
    // Projected Promenade Vector running parallel to Beach Road from Victory Memorial to VUDA Park
    const pStart = latLngToWorld(17.7105, 83.3204);
    const pEnd = latLngToWorld(17.7215, 83.3324);
    const pMinX = Math.min(pStart.x, pEnd.x) - 24;
    const pMaxX = Math.max(pStart.x, pEnd.x) + 24;
    const pMinZ = Math.min(pStart.z, pEnd.z) - 24;
    const pMaxZ = Math.max(pStart.z, pEnd.z) + 24;
    if (pMaxX < minX || pMinX > maxX || pMaxZ < minZ || pMinZ > maxZ) return;

    const dx = pEnd.x - pStart.x;
    const dz = pEnd.z - pStart.z;
    const totalLen = Math.hypot(dx, dz);
    const yaw = Math.atan2(dx, dz);
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);

    const steps = 6;
    const stepLen = totalLen / steps;
    const parkGrassMat = new THREE.MeshStandardMaterial({ color: 0x3b6e3c, roughness: 0.88 });

    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps;
      const mx = pStart.x + dx * t;
      const mz = pStart.z + dz * t;
      if (mx < minX || mx >= maxX || mz < minZ || mz >= maxZ) continue;

      const wy = getTerrainHeight(mx, mz) + 0.14;
      const walkway = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.28, stepLen + 0.4), this.materials.promenadeMat);
      walkway.rotation.y = yaw;
      walkway.position.set(mx, wy, mz);
      walkway.receiveShadow = true;
      group.add(walkway);

      const lawn = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.16, stepLen + 0.4), parkGrassMat);
      lawn.rotation.y = yaw;
      lawn.position.set(mx + rightX * 5.8, wy - 0.04, mz + rightZ * 5.8);
      lawn.receiveShadow = true;
      group.add(lawn);

      // Promenade Seawall & Bench
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.68, stepLen * 0.72), this.materials.concreteMat);
      wall.rotation.y = yaw;
      wall.position.set(mx + rightX * 3.8, wy + 0.34, mz + rightZ * 3.8);
      wall.castShadow = true;
      group.add(wall);

      const bench = this.builder.createPromenadeBench(mx + rightX * 2.8, mz + rightZ * 2.8);
      bench.rotation.y = yaw;
      group.add(bench);
      const bx = mx + rightX * 2.8;
      const bz = mz + rightZ * 2.8;
      const by = getTerrainHeight(bx, bz);
      interactables.push({
        x: bx,
        y: by,
        z: bz,
        range: 2.8,
        type: 'CHAIR',
        prompt: 'Sit on RK Beach Bench',
        onInteract: (player) => {
          player.sitOnSeat(bx, by + 0.50, bz, yaw - Math.PI * 0.5);
          return { message: 'Sitting by Bay of Bengal breeze (Press USE to stand)' };
        }
      });

      const lamp = this.builder.createDoubleArmStreetLamp(mx - rightX * 5.5, mz - rightZ * 5.5);
      lamp.group.rotation.y = yaw;
      group.add(lamp.group);
      lampPositions.push(lamp.worldPos);

      group.add(this.builder.createCoconutPalm(mx + rightX * 5.2, mz + rightZ * 5.2, 1.06, i + cx));
    }

    if (LANDMARK_COORDS.kursura.x >= minX && LANDMARK_COORDS.kursura.x < maxX && LANDMARK_COORDS.kursura.z >= minZ && LANDMARK_COORDS.kursura.z < maxZ) {
      group.add(this.builder.createBusShelter(pStart.x + dx * 0.42 - rightX * 7.5, pStart.z + dz * 0.42 - rightZ * 7.5));
      group.add(this.builder.createHighwayDirectionGantry(pStart.x + dx * 0.55 - rightX * 6.5, pStart.z + dz * 0.55 - rightZ * 6.5));
    }
  }

  _disposeChunk(chunk) {
    this.scene.remove(chunk.group);
    chunk.group.traverse((obj) => {
      if (obj.geometry && obj.geometry !== this.builder.unitBoxGeo && !obj.userData.sharedGeo) {
        let isShared = false;
        for (const pv of this.builder.palmVariants) {
          if (obj.geometry === pv.trunkGeo || obj.geometry === pv.frondGeo) {
            isShared = true;
            break;
          }
        }
        if (!isShared) {
          for (const tv of this.builder.treeVariants) {
            if (obj.geometry === tv.trunkGeo || obj.geometry === tv.canopyGeo) {
              isShared = true;
              break;
            }
          }
        }
        if (!isShared) {
          for (const sv of this.builder.shrubVariants) {
            if (obj.geometry === sv.leafGeo || obj.geometry === sv.flowerGeo) {
              isShared = true;
              break;
            }
          }
        }
        if (!isShared) {
          obj.geometry.dispose();
        }
      }
    });
  }
}
