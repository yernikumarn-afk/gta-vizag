// On-Demand Enterable Building & Interior Streaming Manager
// Builds 6 distinct enterable Visakhapatnam buildings (Luxury 2-Storey Villa, Cafe/Shop, Apartment/Office Tower w/ Elevator,
// Independent House, Resort Hotel & Port Warehouse) with real doorway openings, hinged doors, sliding/roll-up gates,
// walkable 3D staircases, balconies, furniture, sit-able chairs, lights & multi-floor colliders.
import { getTerrainHeight, latLngToWorld } from '../data/VizagGeoData.js';

const RAW_ENTERABLE_BUILDINGS = [
  {
    id: 'rk_beach_cafe',
    name: 'Sea-Breeze Cafe & Store',
    type: 'SHOP_CAFE',
    lat: 17.7123,
    lng: 83.3169,
    w: 14,
    d: 12,
    h1: 4.1,
    floors: 1,
    wallColor: 0xf4e3ce,
    trimColor: 0x0f766e,
    signText: 'RK SEA-BREEZE CAFE & STORE'
  },
  {
    id: 'rk_coastal_villa',
    name: 'Bayfront Luxury Villa',
    type: 'LUXURY_VILLA',
    lat: 17.7180,
    lng: 83.3222,
    w: 16,
    d: 16,
    h1: 3.9,
    h2: 3.7,
    floors: 2,
    wallColor: 0xfaf3e8,
    trimColor: 0x9a3412,
    signText: 'BAYFRONT VILLA • NO. 14'
  },
  {
    id: 'siripuram_tower',
    name: 'Siripuram Bayview Tower',
    type: 'APARTMENT_OFFICE',
    lat: 17.7252,
    lng: 83.3168,
    w: 15,
    d: 15,
    h1: 4.2,
    h2: 4.0,
    floors: 2,
    wallColor: 0xd9e4ee,
    trimColor: 0x1e3a8a,
    signText: 'SIRIPURAM RESIDENCY & SUITES'
  },
  {
    id: 'mvp_independent_house',
    name: 'MVP Colony Home',
    type: 'INDEPENDENT_HOUSE',
    lat: 17.7392,
    lng: 83.3302,
    w: 14,
    d: 12,
    h1: 3.8,
    floors: 1,
    wallColor: 0xf1dec8,
    trimColor: 0x0369a1,
    signText: 'MVP SECTOR 4 • HOUSE 22'
  },
  {
    id: 'rushikonda_resort',
    name: 'Rushikonda Surfside Hotel',
    type: 'HOTEL_RESORT',
    lat: 17.7810,
    lng: 83.3822,
    w: 16,
    d: 14,
    h1: 4.0,
    h2: 3.8,
    floors: 2,
    wallColor: 0xf8efe2,
    trimColor: 0x0d9488,
    signText: 'SURFSIDE HOTEL & GRILL'
  },
  {
    id: 'port_warehouse',
    name: 'Port Cargo Warehouse',
    type: 'WAREHOUSE',
    lat: 17.6962,
    lng: 83.2902,
    w: 16,
    d: 14,
    h1: 5.4,
    floors: 1,
    wallColor: 0x94a3b8,
    trimColor: 0xd97706,
    signText: 'VPT LOGISTICS BAY 04'
  }
];

export const ENTERABLE_BUILDING_DEFS = RAW_ENTERABLE_BUILDINGS.map((b) => {
  const p = latLngToWorld(b.lat, b.lng);
  return { ...b, x: p.x, z: p.z };
});

export function isNearEnterableBuilding(x, z, pad = 16) {
  for (let i = 0; i < ENTERABLE_BUILDING_DEFS.length; i++) {
    const b = ENTERABLE_BUILDING_DEFS[i];
    if (
      Math.abs(x - b.x) < b.w * 0.5 + pad &&
      Math.abs(z - b.z) < b.d * 0.5 + pad
    ) {
      return true;
    }
  }
  return false;
}

export class InteriorManager {
  constructor(THREE, scene, textureMgr, materialMgr, collisionMgr) {
    this.THREE = THREE;
    this.scene = scene;
    this.tex = textureMgr;
    this.materials = materialMgr;
    this.collisionMgr = collisionMgr;

    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    this.instances = [];
    this._initSharedMaterials();
    this._spawnBuildingShells();
  }

  _initSharedMaterials() {
    const THREE = this.THREE;
    const concreteMaps = this.tex.getConcreteMaps();
    const woodMaps = this.tex.getWoodMaps();
    const metalMaps = this.tex.getMetalMaps();

    this.tileFloorMat = new THREE.MeshStandardMaterial({
      color: 0xe6dfd3,
      normalMap: concreteMaps.normalMap,
      roughness: 0.34,
      metalness: 0.08,
      envMapIntensity: 1.15
    });
    this.woodFloorMat = new THREE.MeshStandardMaterial({
      color: 0xa47148,
      map: woodMaps.map,
      normalMap: woodMaps.normalMap,
      roughnessMap: woodMaps.roughnessMap,
      roughness: 0.52,
      metalness: 0.04,
      envMapIntensity: 1.0
    });
    this.stairTreadMat = new THREE.MeshStandardMaterial({
      color: 0x6b4f3a,
      map: woodMaps.map,
      normalMap: woodMaps.normalMap,
      roughness: 0.58
    });
    this.interiorWallMat = new THREE.MeshStandardMaterial({
      color: 0xf7f1e7,
      normalMap: concreteMaps.normalMap,
      roughness: 0.82
    });
    this.woodDoorMat = new THREE.MeshStandardMaterial({
      color: 0x7c3f1d,
      map: woodMaps.map,
      normalMap: woodMaps.normalMap,
      roughness: 0.45,
      metalness: 0.08
    });
    this.glassDoorMat = new THREE.MeshPhysicalMaterial({
      color: 0x99d6ea,
      roughness: 0.06,
      metalness: 0.1,
      transparent: true,
      opacity: 0.48,
      clearcoat: 1.0
    });
    this.shutterMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      map: metalMaps.map,
      normalMap: metalMaps.normalMap,
      metalness: 0.72,
      roughness: 0.36
    });
    this.furnitureWoodMat = new THREE.MeshStandardMaterial({
      color: 0x5c3a21,
      roughness: 0.55
    });
    this.fabricSofaMat = new THREE.MeshStandardMaterial({
      color: 0x1e40af,
      roughness: 0.88
    });
    this.bedLinenMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.85
    });
    this.kitchenCounterMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.28,
      metalness: 0.25
    });
    this.ceramicMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.22,
      metalness: 0.08
    });
    this.brassHandleMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.9,
      roughness: 0.2
    });
    this.elevatorCabMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      map: metalMaps.map,
      metalness: 0.65,
      roughness: 0.32
    });
  }

  _makeSignMesh(text, bgColor = '#0f172a', accent = '#22d3ee') {
    const THREE = this.THREE;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 512, 96);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 504, 88);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 48);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({
      map: tex,
      emissive: accent,
      emissiveIntensity: 0.22,
      roughness: 0.3
    });
  }

  _spawnBuildingShells() {
    for (const def of ENTERABLE_BUILDING_DEFS) {
      const groundY = getTerrainHeight(def.x, def.z);
      const inst = {
        def,
        groundY,
        shellGroup: new THREE.Group(),
        interiorGroup: null,
        interiorLoaded: false,
        interiorLightsOn: true,
        interiorLight: null,
        boxes: [],
        surfaces: [],
        dynamicDoors: [],
        doorsAnim: [], // { pivot, type:'hinge'|'slideY'|'slideZ', closedVal, openVal, cur, target, collider, boundsClosed, boundsOpen }
        elevators: [], // { mesh, surface, minY, maxY, curY, targetFloor, speed, cooldown }
        interactables: []
      };
      inst.shellGroup.position.set(def.x, groundY, def.z);
      this.rootGroup.add(inst.shellGroup);
      this._buildPersistentShell(inst);
      this.instances.push(inst);
    }
    this._syncCollisionManager();
  }

  // Helper to construct exterior/interior wall with a centered doorway gap (splits wall into Left + Right + Lintel!)
  _addWallWithDoorway(group, boxes, cx, baseY, cz, axis, length, height, thickness, doorW, doorH, mat, isExterior = true, originX, originZ) {
    const THREE = this.THREE;
    const sideLen = (length - doorW) * 0.5;
    const wallPieces = [];

    if (sideLen > 0.1) {
      const halfSpan = doorW * 0.5 + sideLen * 0.5;
      wallPieces.push({ offset: -halfSpan, len: sideLen, h: height, yOff: height * 0.5 });
      wallPieces.push({ offset: halfSpan, len: sideLen, h: height, yOff: height * 0.5 });
    }
    const lintelH = height - doorH;
    if (lintelH > 0.1) {
      wallPieces.push({ offset: 0, len: doorW, h: lintelH, yOff: doorH + lintelH * 0.5 });
    }

    for (const p of wallPieces) {
      const sx = axis === 'X' ? p.len : thickness;
      const sz = axis === 'X' ? thickness : p.len;
      const lx = axis === 'X' ? cx + p.offset : cx;
      const lz = axis === 'X' ? cz : cz + p.offset;
      const ly = baseY + p.yOff;

      const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, p.h, sz), mat);
      mesh.position.set(lx, ly, lz);
      mesh.castShadow = isExterior;
      mesh.receiveShadow = true;
      group.add(mesh);

      boxes.push({
        minX: originX + lx - sx * 0.5,
        maxX: originX + lx + sx * 0.5,
        minZ: originZ + lz - sz * 0.5,
        maxZ: originZ + lz + sz * 0.5,
        minY: ly - p.h * 0.5,
        maxY: ly + p.h * 0.5,
        blocksVehicle: isExterior
      });
    }
  }

  _addSolidWall(group, boxes, lx, baseY, lz, sx, h, sz, mat, isExterior, originX, originZ) {
    const THREE = this.THREE;
    const ly = baseY + h * 0.5;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, h, sz), mat);
    mesh.position.set(lx, ly, lz);
    mesh.castShadow = isExterior;
    mesh.receiveShadow = true;
    group.add(mesh);

    boxes.push({
      minX: originX + lx - sx * 0.5,
      maxX: originX + lx + sx * 0.5,
      minZ: originZ + lz - sz * 0.5,
      maxZ: originZ + lz + sz * 0.5,
      minY: baseY,
      maxY: baseY + h,
      blocksVehicle: isExterior
    });
  }

  // Creates a wall with an elevated glass window band so you can see inside & outside naturally
  _addWindowWall(group, boxes, lx, baseY, lz, axis, length, h, thick, wallMat, glassMat, originX, originZ) {
    const THREE = this.THREE;
    const sx = axis === 'X' ? length : thick;
    const sz = axis === 'X' ? thick : length;

    // Lower sill (1.0m) + Upper lintel (0.8m) + Center architectural mullions
    const sillH = 1.05;
    const winH = Math.max(1.2, h - sillH - 0.75);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(sx, sillH, sz), wallMat);
    sill.position.set(lx, baseY + sillH * 0.5, lz);
    sill.castShadow = true;
    sill.receiveShadow = true;

    const top = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.75, sz), wallMat);
    top.position.set(lx, baseY + h - 0.375, lz);
    top.castShadow = true;

    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(axis === 'X' ? length - 0.4 : 0.08, winH, axis === 'X' ? 0.08 : length - 0.4),
      glassMat
    );
    glass.position.set(lx, baseY + sillH + winH * 0.5, lz);
    group.add(sill, top, glass);

    boxes.push({
      minX: originX + lx - sx * 0.5,
      maxX: originX + lx + sx * 0.5,
      minZ: originZ + lz - sz * 0.5,
      maxZ: originZ + lz + sz * 0.5,
      minY: baseY,
      maxY: baseY + h,
      blocksVehicle: true
    });
  }

  _addHingedDoor(inst, parentGroup, lx, baseY, lz, axis, doorW, doorH, isGlass, label) {
    const THREE = this.THREE;
    const ox = inst.def.x;
    const oz = inst.def.z;

    const pivot = new THREE.Group();
    // Place hinge pivot at edge of doorway
    if (axis === 'Z') {
      // Door spans along Z when closed (facing East/West)
      pivot.position.set(lx, baseY, lz - doorW * 0.5);
    } else {
      // Door spans along X when closed (facing North/South)
      pivot.position.set(lx - doorW * 0.5, baseY, lz);
    }

    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(axis === 'Z' ? 0.09 : doorW - 0.06, doorH - 0.06, axis === 'Z' ? doorW - 0.06 : 0.09),
      isGlass ? this.glassDoorMat : this.woodDoorMat
    );
    if (axis === 'Z') panel.position.set(0, doorH * 0.5, doorW * 0.5);
    else panel.position.set(doorW * 0.5, doorH * 0.5, 0);
    panel.castShadow = true;
    pivot.add(panel);

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.14), this.brassHandleMat);
    if (axis === 'Z') handle.position.set(0, 1.05, doorW * 0.84);
    else handle.position.set(doorW * 0.84, 1.05, 0);
    pivot.add(handle);
    parentGroup.add(pivot);

    // Dynamic collider disables when door swings open so player walks right inside smoothly
    const collider = {
      minX: ox + lx - (axis === 'Z' ? 0.25 : doorW * 0.5),
      maxX: ox + lx + (axis === 'Z' ? 0.25 : doorW * 0.5),
      minZ: oz + lz - (axis === 'Z' ? doorW * 0.5 : 0.25),
      maxZ: oz + lz + (axis === 'Z' ? doorW * 0.5 : 0.25),
      minY: inst.groundY + baseY,
      maxY: inst.groundY + baseY + doorH,
      enabled: true,
      blocksVehicle: true
    };
    inst.dynamicDoors.push(collider);

    const doorState = {
      type: 'hinge',
      pivot,
      cur: 0,
      target: 0,
      openAngle: Math.PI * 0.52,
      isOpen: false,
      collider
    };
    inst.doorsAnim.push(doorState);

    inst.interactables.push({
      x: ox + lx,
      y: inst.groundY + baseY,
      z: oz + lz,
      range: 3.1,
      type: 'DOOR',
      priorityBoost: 1.0,
      getPrompt: () => (doorState.isOpen ? `Close ${label}` : `Open ${label}`),
      onInteract: () => {
        doorState.isOpen = !doorState.isOpen;
        doorState.target = doorState.isOpen ? doorState.openAngle : 0;
        collider.enabled = !doorState.isOpen;
        return { message: `${doorState.isOpen ? 'Opened' : 'Closed'} ${label}`, gesture: true };
      }
    });
  }

  _addSlidingOrRollupGate(inst, parentGroup, lx, baseY, lz, axis, width, height, isRollup, label) {
    const THREE = this.THREE;
    const ox = inst.def.x;
    const oz = inst.def.z;

    const sx = axis === 'Z' ? 0.14 : width;
    const sz = axis === 'Z' ? width : 0.14;
    const gateMesh = new THREE.Mesh(new THREE.BoxGeometry(sx, height, sz), this.shutterMat);
    gateMesh.position.set(lx, baseY + height * 0.5, lz);
    gateMesh.castShadow = true;
    parentGroup.add(gateMesh);

    const collider = {
      minX: ox + lx - (sx * 0.5 + 0.12),
      maxX: ox + lx + (sx * 0.5 + 0.12),
      minZ: oz + lz - (sz * 0.5 + 0.12),
      maxZ: oz + lz + (sz * 0.5 + 0.12),
      minY: inst.groundY + baseY,
      maxY: inst.groundY + baseY + height,
      enabled: true,
      blocksVehicle: true
    };
    inst.dynamicDoors.push(collider);

    const anim = {
      type: isRollup ? 'rollup' : (axis === 'Z' ? 'slideZ' : 'slideX'),
      mesh: gateMesh,
      baseY: baseY + height * 0.5,
      baseX: lx,
      baseZ: lz,
      slideSpan: isRollup ? height * 0.88 : width * 0.92,
      cur: 0,
      target: 0,
      isOpen: false,
      collider
    };
    inst.doorsAnim.push(anim);

    inst.interactables.push({
      x: ox + lx,
      y: inst.groundY + baseY,
      z: oz + lz,
      range: 4.0,
      type: 'GATE',
      priorityBoost: 0.9,
      getPrompt: () => (anim.isOpen ? `Close ${label}` : `Open ${label}`),
      onInteract: () => {
        anim.isOpen = !anim.isOpen;
        anim.target = anim.isOpen ? 1 : 0;
        collider.enabled = !anim.isOpen;
        return { message: `${anim.isOpen ? 'Opened' : 'Closed'} ${label}`, gesture: true };
      }
    });
  }

  _addWalkableSlab(inst, lx, localY, lz, sx, sz, floorLabel, isRoofOrUpperFloor = false) {
    const ox = inst.def.x;
    const oz = inst.def.z;
    const wy = inst.groundY + localY;
    inst.surfaces.push({
      minX: ox + lx - sx * 0.5,
      maxX: ox + lx + sx * 0.5,
      minZ: oz + lz - sz * 0.5,
      maxZ: oz + lz + sz * 0.5,
      y: wy,
      isIndoor: !isRoofOrUpperFloor || floorLabel.includes('Balcony') || floorLabel.includes('2F'),
      isRoofOrUpperFloor,
      interiorName: inst.def.name,
      floorLabel
    });
  }

  // Builds a walkable 3D staircase along Z (+1 ascending South or -1 ascending North) with visible treads + handrail
  _buildStaircase(inst, parentGroup, lx, baseY, zStart, zEnd, stairW, heightGain, floorLabel) {
    const THREE = this.THREE;
    const ox = inst.def.x;
    const oz = inst.def.z;
    const steps = 12;
    const dzTotal = zEnd - zStart;
    const stepD = Math.abs(dzTotal) / steps;
    const stepH = heightGain / steps;

    for (let s = 0; s < steps; s++) {
      const sz = zStart + (dzTotal * (s + 0.5)) / steps;
      const sy = baseY + stepH * (s + 0.5);
      const tread = new THREE.Mesh(
        new THREE.BoxGeometry(stairW, 0.14, stepD + 0.08),
        this.stairTreadMat
      );
      tread.position.set(lx, sy, sz);
      tread.castShadow = true;
      tread.receiveShadow = true;
      parentGroup.add(tread);
    }

    // Sloped stair handrail
    const slopeAngle = Math.atan2(heightGain, Math.abs(dzTotal));
    const railLen = Math.hypot(heightGain, Math.abs(dzTotal));
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, railLen),
      this.materials.railingMat
    );
    rail.position.set(lx + stairW * 0.48, baseY + heightGain * 0.5 + 0.9, (zStart + zEnd) * 0.5);
    rail.rotation.x = dzTotal > 0 ? -slopeAngle : slopeAngle;
    parentGroup.add(rail);

    // Register continuous sloped walkable ramp surface matching steps cleanly
    const minZ = oz + Math.min(zStart, zEnd) - 0.3;
    const maxZ = oz + Math.max(zStart, zEnd) + 0.3;
    const worldStartY = inst.groundY + baseY;
    inst.surfaces.push({
      minX: ox + lx - stairW * 0.5,
      maxX: ox + lx + stairW * 0.5,
      minZ,
      maxZ,
      getY: (_wx, wz) => {
        const localZ = wz - oz;
        const t = Math.max(0, Math.min(1, (localZ - zStart) / dzTotal));
        return worldStartY + t * heightGain;
      },
      isIndoor: true,
      interiorName: inst.def.name,
      floorLabel
    });
  }

  _buildPersistentShell(inst) {
    const THREE = this.THREE;
    const { def, shellGroup, boxes } = inst;
    const wallMat = new THREE.MeshStandardMaterial({
      color: def.wallColor,
      normalMap: this.concreteMatNorm(),
      roughness: 0.72
    });
    const trimMat = this.materials.getPaintedTintMaterial(def.trimColor);
    const totalH = def.floors === 2 ? def.h1 + def.h2 : def.h1;
    const ox = def.x;
    const oz = def.z;

    // Ground Floor Foundation Slab & Visual Tile Floor
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(def.w + 1.2, 0.34, def.d + 1.2),
      this.materials.concreteMat
    );
    plinth.position.y = 0.05;
    plinth.receiveShadow = true;
    shellGroup.add(plinth);
    this._addWalkableSlab(inst, 0, 0.22, 0, def.w + 0.8, def.d + 0.8, 'Ground Floor');

    const floorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(def.w - 0.2, 0.06, def.d - 0.2),
      def.type === 'LUXURY_VILLA' || def.type === 'INDEPENDENT_HOUSE' ? this.woodFloorMat : this.tileFloorMat
    );
    floorMesh.position.y = 0.22;
    floorMesh.receiveShadow = true;
    shellGroup.add(floorMesh);

    // Signboard on street-facing facade
    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.75, Math.min(def.d * 0.78, 8.6)),
      this._makeSignMesh(def.signText)
    );
    if (def.type === 'INDEPENDENT_HOUSE') {
      signBoard.rotation.y = Math.PI / 2;
      signBoard.position.set(0, def.h1 + 0.15, -def.d * 0.5 - 0.25);
    } else {
      signBoard.position.set(def.w * 0.5 + 0.24, def.h1 + 0.15, 0);
    }
    shellGroup.add(signBoard);

    const doorW = 1.9;
    const doorH = 2.65;
    const thick = 0.32;

    if (def.type === 'WAREHOUSE') {
      // North/South/West walls solid, East facade has large 4.4m Cargo Shutter bay + office side door
      this._addSolidWall(shellGroup, boxes, -def.w * 0.5, 0.2, 0, thick, def.h1, def.d, wallMat, true, ox, oz);
      this._addSolidWall(shellGroup, boxes, 0, 0.2, -def.d * 0.5, def.w, def.h1, thick, wallMat, true, ox, oz);
      this._addSolidWall(shellGroup, boxes, 0, 0.2, def.d * 0.5, def.w, def.h1, thick, wallMat, true, ox, oz);
      this._addWallWithDoorway(shellGroup, boxes, def.w * 0.5, 0.2, 0, 'Z', def.d, def.h1, thick, 4.6, 4.0, wallMat, true, ox, oz);
      this._addSlidingOrRollupGate(inst, shellGroup, def.w * 0.5, 0.2, 0, 'Z', 4.6, 4.0, true, 'Warehouse Shutter');
      // Pitched Industrial Roof
      const roof = new THREE.Mesh(new THREE.BoxGeometry(def.w + 0.8, 0.35, def.d + 0.8), trimMat);
      roof.position.y = 0.2 + def.h1 + 0.16;
      roof.castShadow = true;
      shellGroup.add(roof);
      return;
    }

    // Perimeter Walls with Real Doorways & Window Glazing
    if (def.type === 'INDEPENDENT_HOUSE') {
      // Door faces -Z (toward MVP Double Rd)
      this._addWallWithDoorway(shellGroup, boxes, 0, 0.2, -def.d * 0.5, 'X', def.w, def.h1, thick, doorW, doorH, wallMat, true, ox, oz);
      this._addHingedDoor(inst, shellGroup, 0, 0.2, -def.d * 0.5, 'X', doorW, doorH, false, 'Main Door');
      this._addWindowWall(shellGroup, boxes, 0, 0.2, def.d * 0.5, 'X', def.w, def.h1, thick, wallMat, this.glassDoorMat, ox, oz);
      this._addWindowWall(shellGroup, boxes, def.w * 0.5, 0.2, 0, 'Z', def.d, def.h1, thick, wallMat, this.glassDoorMat, ox, oz);
      this._addWindowWall(shellGroup, boxes, -def.w * 0.5, 0.2, 0, 'Z', def.d, def.h1, thick, wallMat, this.glassDoorMat, ox, oz);
      // Porch overhang + columns
      const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.24, 2.8), trimMat);
      porchRoof.position.set(0, 3.2, -def.d * 0.5 - 1.3);
      shellGroup.add(porchRoof);
    } else {
      // Door faces +X (Beach Road / Street side)
      const isGlassDoor = def.type === 'SHOP_CAFE' || def.type === 'APARTMENT_OFFICE' || def.type === 'HOTEL_RESORT';
      const doorZ = def.type === 'LUXURY_VILLA' ? 3.2 : 0;

      if (def.type === 'LUXURY_VILLA') {
        // Villa has BOTH a Front Door (z = +3.2) and a Garage Roll-Up Bay (z = -3.8)
        // Build East wall pieces: [-8..-5.8] wall | [-5.8..-1.8] 4m Garage Bay | [-1.8..+2.25] wall | [+2.25..+4.15] Door | [+4.15..+8] wall
        this._addSolidWall(shellGroup, boxes, def.w * 0.5, 0.2, -6.9, thick, def.h1, 2.2, wallMat, true, ox, oz);
        this._addSolidWall(shellGroup, boxes, def.w * 0.5, 0.2, 0.22, thick, def.h1, 4.05, wallMat, true, ox, oz);
        this._addSolidWall(shellGroup, boxes, def.w * 0.5, 0.2, 6.08, thick, def.h1, 3.85, wallMat, true, ox, oz);
        // Lintels above garage & door
        this._addSolidWall(shellGroup, boxes, def.w * 0.5, 0.2 + 2.9, -3.8, thick, def.h1 - 2.9, 4.0, wallMat, true, ox, oz);
        this._addSolidWall(shellGroup, boxes, def.w * 0.5, 0.2 + doorH, 3.2, thick, def.h1 - doorH, 1.9, wallMat, true, ox, oz);

        this._addHingedDoor(inst, shellGroup, def.w * 0.5, 0.2, doorZ, 'Z', doorW, doorH, false, 'Villa Front Door');
        this._addSlidingOrRollupGate(inst, shellGroup, def.w * 0.5, 0.2, -3.8, 'Z', 4.0, 2.9, true, 'Garage Shutter');

        // Driveway sliding compound gate out front (+X + 4.2m)
        const gateCol1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.2, 0.6), trimMat);
        gateCol1.position.set(def.w * 0.5 + 4.2, 1.1, -6.2);
        const gateCol2 = gateCol1.clone();
        gateCol2.position.z = -1.2;
        shellGroup.add(gateCol1, gateCol2);
        this._addSlidingOrRollupGate(inst, shellGroup, def.w * 0.5 + 4.2, 0.2, -3.7, 'Z', 4.4, 1.9, false, 'Driveway Gate');
      } else {
        this._addWallWithDoorway(shellGroup, boxes, def.w * 0.5, 0.2, 0, 'Z', def.d, def.h1, thick, doorW, doorH, wallMat, true, ox, oz);
        this._addHingedDoor(inst, shellGroup, def.w * 0.5, 0.2, 0, 'Z', doorW, doorH, isGlassDoor, `${def.name} Door`);
      }

      // Remaining ground-floor perimeter window walls
      this._addWindowWall(shellGroup, boxes, -def.w * 0.5, 0.2, 0, 'Z', def.d, def.h1, thick, wallMat, this.glassDoorMat, ox, oz);
      this._addWindowWall(shellGroup, boxes, 0, 0.2, -def.d * 0.5, 'X', def.w, def.h1, thick, wallMat, this.glassDoorMat, ox, oz);
      this._addWindowWall(shellGroup, boxes, 0, 0.2, def.d * 0.5, 'X', def.w, def.h1, thick, wallMat, this.glassDoorMat, ox, oz);
    }

    // Second Storey + Balcony + Roof (or single-storey Roof)
    if (def.floors === 2) {
      const f2Base = 0.2 + def.h1;
      // Leave stairwell cutout opening in 2nd-floor slab along West side (-def.w*0.5 + 0.5 .. -def.w*0.5 + 3.6) if staircase
      if (def.type === 'APARTMENT_OFFICE') {
        // Elevator shaft cutout along South-West corner (-def.w*0.5 + 0.6 .. -def.w*0.5 + 3.4, z: 2.5..5.3)
        // Use main slab leaving elevator pocket clear: North strip + East wide slab
        const slabMain = new THREE.Mesh(new THREE.BoxGeometry(def.w - 3.6, 0.24, def.d + 0.4), this.tileFloorMat);
        slabMain.position.set(1.8, f2Base, 0);
        slabMain.castShadow = true;
        slabMain.receiveShadow = true;
        const slabWestNorth = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.24, def.d - 3.6), this.tileFloorMat);
        slabWestNorth.position.set(-def.w * 0.5 + 1.8, f2Base, -1.8);
        shellGroup.add(slabMain, slabWestNorth);

        this._addWalkableSlab(inst, 1.8, f2Base + 0.14, 0, def.w - 3.6, def.d, '2F Suite', true);
        this._addWalkableSlab(inst, -def.w * 0.5 + 1.8, f2Base + 0.14, -1.8, 3.6, def.d - 3.6, '2F Suite', true);
      } else {
        // Staircase cutout along West wall (X: -def.w*0.5 .. -def.w*0.5 + 3.4, Z: -def.d*0.5 .. +2.0)
        const stairCutW = 3.5;
        const eastW = def.w - stairCutW;
        const eastCenterX = stairCutW * 0.5;
        const eastSlab = new THREE.Mesh(new THREE.BoxGeometry(eastW, 0.24, def.d + 0.2), this.woodFloorMat);
        eastSlab.position.set(eastCenterX, f2Base, 0);
        eastSlab.castShadow = true;
        eastSlab.receiveShadow = true;

        const southLandingD = 3.8;
        const westLanding = new THREE.Mesh(new THREE.BoxGeometry(stairCutW, 0.24, southLandingD), this.woodFloorMat);
        westLanding.position.set(-def.w * 0.5 + stairCutW * 0.5, f2Base, def.d * 0.5 - southLandingD * 0.5);
        westLanding.receiveShadow = true;
        shellGroup.add(eastSlab, westLanding);

        this._addWalkableSlab(inst, eastCenterX, f2Base + 0.14, 0, eastW, def.d, '2F Living', true);
        this._addWalkableSlab(inst, -def.w * 0.5 + stairCutW * 0.5, f2Base + 0.14, def.d * 0.5 - southLandingD * 0.5, stairCutW, southLandingD, '2F Landing', true);
      }

      // Upper floor perimeter walls + East Balcony Doorway onto Sea-View Balcony!
      this._addWallWithDoorway(shellGroup, boxes, def.w * 0.5, f2Base + 0.12, 0, 'Z', def.d, def.h2, thick, 2.2, 2.5, wallMat, true, ox, oz);
      this._addHingedDoor(inst, shellGroup, def.w * 0.5, f2Base + 0.12, 0, 'Z', 2.2, 2.5, true, '2F Balcony Door');
      this._addWindowWall(shellGroup, boxes, -def.w * 0.5, f2Base + 0.12, 0, 'Z', def.d, def.h2, thick, wallMat, this.glassDoorMat, ox, oz);
      this._addWindowWall(shellGroup, boxes, 0, f2Base + 0.12, -def.d * 0.5, 'X', def.w, def.h2, thick, wallMat, this.glassDoorMat, ox, oz);
      this._addWindowWall(shellGroup, boxes, 0, f2Base + 0.12, def.d * 0.5, 'X', def.w, def.h2, thick, wallMat, this.glassDoorMat, ox, oz);

      // Cantilevered Walkable 2nd-Floor Sea-View Balcony (East side)
      const balW = 3.2;
      const balD = def.d * 0.76;
      const balX = def.w * 0.5 + balW * 0.5;
      const balSlab = new THREE.Mesh(new THREE.BoxGeometry(balW, 0.22, balD), this.tileFloorMat);
      balSlab.position.set(balX, f2Base, 0);
      balSlab.castShadow = true;
      balSlab.receiveShadow = true;
      const railFront = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, balD), this.glassDoorMat);
      railFront.position.set(def.w * 0.5 + balW - 0.08, f2Base + 0.55, 0);
      const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, balD), this.materials.railingMat);
      topBar.position.set(def.w * 0.5 + balW - 0.08, f2Base + 1.08, 0);
      shellGroup.add(balSlab, railFront, topBar);

      this._addWalkableSlab(inst, balX, f2Base + 0.14, 0, balW, balD, '2F Sea Balcony', false);
      // Balcony outer railing collision box
      this._addSolidWall(shellGroup, boxes, def.w * 0.5 + balW - 0.1, f2Base + 0.12, 0, 0.18, 1.15, balD, trimMat, true, ox, oz);
    }

    // Exterior Canopy & Rooftop Slab + Parapet + Water Tank
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.22, 5.2), trimMat);
    canopy.position.set(def.w * 0.5 + 1.4, 3.2, def.type === 'LUXURY_VILLA' ? 3.2 : 0);
    shellGroup.add(canopy);

    const roofY = 0.2 + totalH;
    const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(def.w + 0.8, 0.34, def.d + 0.8), trimMat);
    roofSlab.position.y = roofY + 0.12;
    roofSlab.castShadow = true;
    shellGroup.add(roofSlab);
    this._addWalkableSlab(inst, 0, roofY + 0.3, 0, def.w, def.d, 'Roof', true);

    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.4, 10), this.materials.waterTankMat);
    tank.position.set(-def.w * 0.25, roofY + 0.95, -def.d * 0.22);
    shellGroup.add(tank);
  }

  concreteMatNorm() {
    return this.materials.concreteMat.normalMap;
  }

  _addSitChair(inst, group, lx, localY, lz, rotY, label = 'Chair') {
    const THREE = this.THREE;
    const ox = inst.def.x;
    const oz = inst.def.z;

    const chair = new THREE.Group();
    chair.position.set(lx, localY, lz);
    chair.rotation.y = rotY;

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.10, 0.54), this.furnitureWoodMat);
    seat.position.y = 0.48;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.54, 0.09), this.furnitureWoodMat);
    back.position.set(0, 0.78, -0.24);
    for (const [cx, cz] of [[-0.22, -0.20], [0.22, -0.20], [-0.22, 0.20], [0.22, 0.20]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.46, 0.06), this.furnitureWoodMat);
      leg.position.set(cx, 0.23, cz);
      chair.add(leg);
    }
    chair.add(seat, back);
    group.add(chair);

    inst.interactables.push({
      x: ox + lx,
      y: inst.groundY + localY,
      z: oz + lz,
      range: 2.3,
      type: 'CHAIR',
      priorityBoost: 0.7,
      getPrompt: () => `Sit on ${label}`,
      onInteract: (player) => {
        player.sitOnSeat(ox + lx, inst.groundY + localY + 0.44, oz + lz, rotY);
        return { message: `Seated on ${label} (Press USE to stand up)` };
      }
    });
  }

  _loadInterior(inst) {
    if (inst.interiorLoaded) return;
    const THREE = this.THREE;
    const { def } = inst;
    const ox = def.x;
    const oz = def.z;
    const grp = new THREE.Group();
    grp.position.set(ox, inst.groundY, oz);
    inst.interiorGroup = grp;
    inst.interiorLoaded = true;
    inst.interiorBoxes = [];

    // Warm Interior Ceiling Light
    const ptLight = new THREE.PointLight(0xffe1b0, 1.35, 22, 1.5);
    ptLight.position.set(0, 3.3, 0);
    grp.add(ptLight);
    inst.interiorLight = ptLight;

    // Wall Light Switch near Entrance
    const switchX = def.w * 0.5 - 0.5;
    const switchZ = def.type === 'LUXURY_VILLA' ? 4.4 : 1.3;
    const switchPlate = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.14), this.ceramicMat);
    switchPlate.position.set(switchX, 1.4, switchZ);
    grp.add(switchPlate);
    inst.interactables.push({
      x: ox + switchX,
      y: inst.groundY + 0.22,
      z: oz + switchZ,
      range: 2.2,
      type: 'SWITCH',
      priorityBoost: 0.4,
      getPrompt: () => (inst.interiorLightsOn ? 'Turn Off Lights' : 'Turn On Lights'),
      onInteract: () => {
        inst.interiorLightsOn = !inst.interiorLightsOn;
        if (inst.interiorLight) inst.interiorLight.intensity = inst.interiorLightsOn ? 1.35 : 0.0;
        if (inst.upperLight) inst.upperLight.intensity = inst.interiorLightsOn ? 1.25 : 0.0;
        return { message: `${def.name} lights ${inst.interiorLightsOn ? 'ON' : 'OFF'}`, gesture: true };
      }
    });

    if (def.type === 'SHOP_CAFE') {
      // Service Counter & Espresso Bar along North interior
      const counter = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.05, 1.0), this.kitchenCounterMat);
      counter.position.set(-1.5, 0.72, -3.2);
      const espresso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.65, 0.65), this.shutterMat);
      espresso.position.set(-2.2, 1.55, -3.2);
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.2, 0.6), this.furnitureWoodMat);
      shelf.position.set(-5.6, 1.32, 0);
      shelf.rotation.y = Math.PI / 2;
      grp.add(counter, espresso, shelf);

      inst.interiorBoxes.push(
        { minX: ox - 4.3, maxX: ox + 1.3, minZ: oz - 3.7, maxZ: oz - 2.7, minY: inst.groundY, maxY: inst.groundY + 1.5, blocksVehicle: true },
        { minX: ox - 6.0, maxX: ox - 5.2, minZ: oz - 2.4, maxZ: oz + 2.4, minY: inst.groundY, maxY: inst.groundY + 2.5, blocksVehicle: true }
      );

      inst.interactables.push({
        x: ox - 1.5,
        y: inst.groundY + 0.22,
        z: oz - 2.4,
        range: 2.8,
        type: 'SHOP',
        priorityBoost: 0.9,
        getPrompt: () => 'Browse Sea-Breeze Cafe Store',
        onInteract: () => ({ message: 'Cafe Special: Vizag Filter Coffee & Coastal Snacks Ready!', gesture: true })
      });

      // Dining tables + sit-able chairs
      for (const tz of [-0.5, 2.8]) {
        const tbl = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.76, 12), this.furnitureWoodMat);
        tbl.position.set(1.2, 0.6, tz);
        grp.add(tbl);
        this._addSitChair(inst, grp, -0.1, 0.22, tz, Math.PI / 2, 'Cafe Chair');
        this._addSitChair(inst, grp, 2.5, 0.22, tz, -Math.PI / 2, 'Cafe Chair');
      }
    } else if (def.type === 'LUXURY_VILLA' || def.type === 'HOTEL_RESORT') {
      // Interior partition dividing Garage (z < -1.2) & Living/Kitchen (z > -1.2) with doorway gap
      this._addWallWithDoorway(
        grp,
        inst.interiorBoxes,
        1.5,
        0.22,
        -1.2,
        'X',
        def.w - 4.0,
        def.h1 - 0.1,
        0.24,
        1.7,
        2.5,
        this.interiorWallMat,
        false,
        ox,
        oz
      );
      // Ground Living Room Sofa, Coffee Table & TV Console
      const sofa = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.78, 1.1), this.fabricSofaMat);
      sofa.position.set(1.6, 0.61, 4.8);
      const cTable = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.42, 0.9), this.furnitureWoodMat);
      cTable.position.set(1.6, 0.43, 3.1);
      const kitchenCounter = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.95, 0.95), this.kitchenCounterMat);
      kitchenCounter.position.set(-1.5, 0.68, 6.8);
      // Bathroom Corner Enclosure (South-West ground)
      const vanity = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.85, 0.7), this.ceramicMat);
      vanity.position.set(-5.8, 0.64, 6.8);
      grp.add(sofa, cTable, kitchenCounter, vanity);

      this._addSitChair(inst, grp, 1.6, 0.22, 4.6, Math.PI, 'Living Room Sofa');
      this._addSitChair(inst, grp, 4.0, 0.22, 1.2, -Math.PI * 0.4, 'Lounge Armchair');

      // Walkable 3D Staircase along West Wall climbing Ground -> 2nd Floor!
      this._buildStaircase(
        inst,
        grp,
        -def.w * 0.5 + 1.85,
        0.22,
        def.d * 0.5 - 4.1,
        -def.d * 0.5 + 1.2,
        2.6,
        def.h1,
        'Staircase to 2F'
      );

      // Floor 2 Master Bedroom & Balcony Furniture
      const f2Y = 0.22 + def.h1 + 0.12;
      const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.48, 2.8), this.furnitureWoodMat);
      bedFrame.position.set(1.8, f2Y + 0.24, -4.4);
      const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.22, 2.6), this.bedLinenMat);
      mattress.position.set(1.8, f2Y + 0.56, -4.4);
      const wardrobe = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.4, 2.8), this.furnitureWoodMat);
      wardrobe.position.set(-1.2, f2Y + 1.2, -4.4);
      const desk = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.78, 0.85), this.furnitureWoodMat);
      desk.position.set(2.4, f2Y + 0.39, 4.8);
      grp.add(bedFrame, mattress, wardrobe, desk);

      this._addSitChair(inst, grp, 2.4, f2Y, 3.8, 0, '2F Study Chair');
      this._addSitChair(inst, grp, def.w * 0.5 + 1.6, f2Y, 2.2, -Math.PI / 2, 'Sea-View Balcony Chair');

      const upperPt = new THREE.PointLight(0xffebc8, 1.25, 22, 1.5);
      upperPt.position.set(1.5, f2Y + 2.9, 0);
      grp.add(upperPt);
      inst.upperLight = upperPt;
    } else if (def.type === 'APARTMENT_OFFICE') {
      // Reception Desk in Lobby
      const desk = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.02, 0.9), this.kitchenCounterMat);
      desk.position.set(0.8, 0.71, -3.5);
      grp.add(desk);
      this._addSitChair(inst, grp, 0.8, 0.22, -4.6, 0, 'Reception Chair');
      this._addSitChair(inst, grp, 3.6, 0.22, 3.2, -Math.PI / 2, 'Lobby Lounge Sofa');

      // Working Interactive 3D Elevator Cab in South-West Pocket!
      const elevX = -def.w * 0.5 + 2.0;
      const elevZ = def.d * 0.5 - 2.0;
      const minElevY = 0.24;
      const maxElevY = 0.22 + def.h1 + 0.14;
      const cab = new THREE.Group();
      cab.position.set(elevX, minElevY, elevZ);
      const cabFloor = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 2.6), this.elevatorCabMat);
      const cabRail = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.05, 0.1), this.glassDoorMat);
      cabRail.position.set(0, 0.55, -1.25);
      const panelBox = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.48, 0.12), this.brassHandleMat);
      panelBox.position.set(1.18, 1.15, 0);
      cab.add(cabFloor, cabRail, panelBox);
      grp.add(cab);

      const elevSurface = {
        minX: ox + elevX - 1.35,
        maxX: ox + elevX + 1.35,
        minZ: oz + elevZ - 1.35,
        maxZ: oz + elevZ + 1.35,
        y: inst.groundY + minElevY,
        isIndoor: true,
        interiorName: def.name,
        floorLabel: 'Elevator'
      };
      inst.surfaces.push(elevSurface);

      const elevState = {
        mesh: cab,
        surface: elevSurface,
        minY: minElevY,
        maxY: maxElevY,
        curY: minElevY,
        targetFloor: 0, // 0 = Ground Lobby, 1 = 2nd Floor
        worldBaseY: inst.groundY
      };
      inst.elevators.push(elevState);

      inst.interactables.push({
        x: ox + elevX,
        y: inst.groundY + minElevY,
        z: oz + elevZ,
        range: 2.8,
        maxDy: 6.0,
        type: 'ELEVATOR',
        priorityBoost: 1.1,
        getPrompt: () => (elevState.targetFloor === 0 ? 'Ride Elevator ↑ to 2F Suite' : 'Ride Elevator ↓ to Lobby'),
        onInteract: (player) => {
          elevState.targetFloor = elevState.targetFloor === 0 ? 1 : 0;
          // Ensure player is placed cleanly on cab pad when riding
          player.position.x = ox + elevX;
          player.position.z = oz + elevZ;
          return {
            message: `Elevator moving to ${elevState.targetFloor === 1 ? '2nd Floor Office & Suite' : 'Ground Lobby'}`,
            gesture: true
          };
        }
      });

      // Floor 2 Executive Office & Lounge
      const f2Y = maxElevY;
      const confTable = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.78, 1.5), this.furnitureWoodMat);
      confTable.position.set(1.5, f2Y + 0.39, -2.5);
      const execDesk = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.78, 0.9), this.kitchenCounterMat);
      execDesk.position.set(2.2, f2Y + 0.39, 3.6);
      grp.add(confTable, execDesk);
      this._addSitChair(inst, grp, 2.2, f2Y, 2.6, 0, 'Executive Chair');
      this._addSitChair(inst, grp, def.w * 0.5 + 1.6, f2Y, 2.0, -Math.PI / 2, '2F Terrace Chair');

      const upperPt = new THREE.PointLight(0xe0f2fe, 1.25, 22, 1.5);
      upperPt.position.set(1.5, f2Y + 3.0, 0);
      grp.add(upperPt);
      inst.upperLight = upperPt;
    } else if (def.type === 'INDEPENDENT_HOUSE') {
      // Single-storey Home Rooms: Sofa, Dining Table, Bed, Kitchen Counter
      const sofa = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.76, 1.0), this.fabricSofaMat);
      sofa.position.set(2.4, 0.6, 1.5);
      const bed = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.56, 2.4), this.bedLinenMat);
      bed.position.set(-4.2, 0.5, 3.2);
      const kitchen = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.92, 0.8), this.kitchenCounterMat);
      kitchen.position.set(-4.0, 0.68, -2.5);
      grp.add(sofa, bed, kitchen);
      this._addSitChair(inst, grp, 2.4, 0.22, 1.3, Math.PI, 'Home Sofa');
      this._addSitChair(inst, grp, 0.2, 0.22, 3.4, Math.PI * 0.5, 'Dining Chair');
    } else if (def.type === 'WAREHOUSE') {
      // Stacked Cargo Racks & Foreman Office Desk
      for (const rz of [-4.2, 4.2]) {
        const rack = new THREE.Mesh(new THREE.BoxGeometry(8.2, 2.6, 1.4), this.furnitureWoodMat);
        rack.position.set(-2.5, 1.5, rz);
        grp.add(rack);
        inst.interiorBoxes.push({
          minX: ox - 6.6,
          maxX: ox + 1.6,
          minZ: oz + rz - 0.7,
          maxZ: oz + rz + 0.7,
          minY: inst.groundY,
          maxY: inst.groundY + 2.8,
          blocksVehicle: true
        });
      }
      const foremanDesk = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 0.9), this.kitchenCounterMat);
      foremanDesk.position.set(-5.2, 0.62, 0);
      grp.add(foremanDesk);
      this._addSitChair(inst, grp, -4.1, 0.22, 0, Math.PI / 2, 'Foreman Chair');
    }

    this.rootGroup.add(grp);
  }

  _unloadInterior(inst) {
    if (!inst.interiorLoaded || !inst.interiorGroup) return;
    this.rootGroup.remove(inst.interiorGroup);
    inst.interiorGroup.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    inst.interiorGroup = null;
    inst.interiorBoxes = [];
    inst.interiorLoaded = false;
    inst.interiorLight = null;
    inst.upperLight = null;
    // Strip interior-only interactables while keeping shell Doors/Gates
    inst.interactables = inst.interactables.filter(
      (item) => item.type === 'DOOR' || item.type === 'GATE'
    );
  }

  _syncCollisionManager() {
    if (!this.collisionMgr) return;
    const boxes = [];
    const surfaces = [];
    const doors = [];
    for (let i = 0; i < this.instances.length; i++) {
      const inst = this.instances[i];
      for (const b of inst.boxes) boxes.push(b);
      if (inst.interiorLoaded && inst.interiorBoxes) {
        for (const b of inst.interiorBoxes) boxes.push(b);
      }
      for (const s of inst.surfaces) surfaces.push(s);
      for (const d of inst.dynamicDoors) doors.push(d);
    }
    this.collisionMgr.setInteriorCollisions(boxes, surfaces, doors);
  }

  update(dt, playerX, playerZ) {
    let topologyChanged = false;

    for (let i = 0; i < this.instances.length; i++) {
      const inst = this.instances[i];
      const dist = Math.hypot(playerX - inst.def.x, playerZ - inst.def.z);

      // Stream Interiors On-Demand (< 38m Load, > 54m Unload)
      if (!inst.interiorLoaded && dist < 38) {
        this._loadInterior(inst);
        topologyChanged = true;
      } else if (inst.interiorLoaded && dist > 54) {
        this._unloadInterior(inst);
        topologyChanged = true;
      }

      // Animate hinged doors & sliding/roll-up gates smoothly
      for (let k = 0; k < inst.doorsAnim.length; k++) {
        const d = inst.doorsAnim[k];
        if (Math.abs(d.cur - d.target) > 0.002) {
          d.cur += (d.target - d.cur) * Math.min(1, dt * 8.5);
          if (d.type === 'hinge') {
            d.pivot.rotation.y = d.cur;
          } else if (d.type === 'rollup') {
            d.mesh.position.y = d.baseY + d.cur * d.slideSpan;
          } else if (d.type === 'slideZ') {
            d.mesh.position.z = d.baseZ + d.cur * d.slideSpan;
          } else {
            d.mesh.position.x = d.baseX + d.cur * d.slideSpan;
          }
        }
      }

      // Animate working 3D elevator cabs & update their walkable floor deck height
      for (let e = 0; e < inst.elevators.length; e++) {
        const elev = inst.elevators[e];
        const goalY = elev.targetFloor === 1 ? elev.maxY : elev.minY;
        if (Math.abs(elev.curY - goalY) > 0.01) {
          const step = Math.sign(goalY - elev.curY) * Math.min(Math.abs(goalY - elev.curY), dt * 2.4);
          elev.curY += step;
          elev.mesh.position.y = elev.curY;
          elev.surface.y = elev.worldBaseY + elev.curY + 0.07;
        }
      }
    }

    if (topologyChanged) {
      this._syncCollisionManager();
    }
  }

  getNearbyInteractables(px, py, pz) {
    const out = [];
    for (let i = 0; i < this.instances.length; i++) {
      const inst = this.instances[i];
      if (Math.hypot(px - inst.def.x, pz - inst.def.z) > 26) continue;
      for (let j = 0; j < inst.interactables.length; j++) {
        out.push(inst.interactables[j]);
      }
    }
    return out;
  }
}
