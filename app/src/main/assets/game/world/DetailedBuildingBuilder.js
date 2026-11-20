// AAA Detailed Architectural Building LOD, Tropical Foliage, Promenade Props & Visakhapatnam Landmarks Builder
// Uses batched geometry merging per material so rich 3D facades, balconies, recessed glass, pilasters,
// rooftops, and coastal vegetation render smoothly at 60 FPS on Android tablets.
import { getTerrainHeight, latLngToWorld } from '../data/VizagGeoData.js';

export class DetailedBuildingBuilder {
  constructor(THREE, textureManager, materialManager) {
    this.THREE = THREE;
    this.tex = textureManager;
    this.materials = materialManager;

    this.lampEmissiveMat = materialManager.lampEmissiveMat;
    this.lampGlowSpriteMat = materialManager.lampGlowSpriteMat;
    this.lampGroundPoolMat = materialManager.lampGroundPoolMat;

    this.metalPoleMat = materialManager.metalPoleMat;
    this.railingMat = materialManager.railingMat;
    this.concreteMat = materialManager.concreteMat;
    this.waterTankMat = materialManager.waterTankMat;
    this.palmTrunkMat = materialManager.palmTrunkMat;
    this.palmFrondMat = materialManager.palmFrondMat;
    this.foliageCanopyMat = materialManager.foliageCanopyMat;
    this.bougainvilleaMat = materialManager.bougainvilleaMat;
    this.darkGlassMat = materialManager.darkGlassMat;
    this.nightLitGlassMat = materialManager.nightLitGlassMat;
    this.shutterMetalMat = materialManager.shutterMetalMat;
    this.aoShadowMat = materialManager.aoShadowMat;

    this.unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);

    this.beachGantryTex = textureManager.createRoadSignTexture(
      '↑ RUSHIKONDA • KAILASAGIRI',
      '← SIRIPURAM • JAGADAMBA JN'
    );
    this.kursuraSignTex = textureManager.createRoadSignTexture(
      'INS KURSURA (S20) SUBMARINE',
      'RK BEACH NAVAL MUSEUM • AP'
    );

    // Pre-build 4 merged palm variants, 3 coastal tropical trees, and 2 bougainvillea shrubs
    this.palmVariants = [0, 1, 2, 3].map((v) => this._buildMergedPalmVariant(v));
    this.treeVariants = [0, 1, 2].map((v) => this._buildMergedTropicalTreeVariant(v));
    this.shrubVariants = [0, 1].map((v) => this._buildMergedShrubVariant(v));
  }

  _getTintMat(tintHex) {
    return this.materials.getPaintedTintMaterial(tintHex);
  }

  _getShopMat(shopIndex) {
    return this.materials.getShopMaterial(shopIndex);
  }

  _mergeBakedMeshes(meshes) {
    const THREE = this.THREE;
    let totalVerts = 0;
    const prepared = [];

    for (const m of meshes) {
      m.updateMatrix();
      const nonIdx = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      nonIdx.applyMatrix4(m.matrix);
      const count = nonIdx.attributes.position.count;
      totalVerts += count;
      prepared.push(nonIdx);
    }

    const posArr = new Float32Array(totalVerts * 3);
    const normArr = new Float32Array(totalVerts * 3);
    const uvArr = new Float32Array(totalVerts * 2);

    let vOffset = 0;
    for (const g of prepared) {
      const p = g.attributes.position;
      const n = g.attributes.normal;
      const u = g.attributes.uv;
      posArr.set(p.array, vOffset * 3);
      if (n && n.array.length === p.count * 3) {
        normArr.set(n.array, vOffset * 3);
      }
      if (u && u.array.length === p.count * 2) {
        uvArr.set(u.array, vOffset * 2);
      }
      vOffset += p.count;
      g.dispose();
    }

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(normArr, 3));
    merged.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
    merged.computeBoundingSphere();
    return merged;
  }

  _buildMergedPalmVariant(variantIdx) {
    const THREE = this.THREE;
    const trunkParts = [];
    const frondParts = [];

    const leanAngle = ((variantIdx % 4) - 1.5) * 0.065;
    let curX = 0;
    let curY = 0;
    const segH = 1.12;

    for (let s = 0; s < 7; s++) {
      const rBottom = 0.27 - s * 0.022;
      const rTop = 0.245 - s * 0.022;
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, segH + 0.1, 8));
      const tilt = leanAngle * (s + 1) * 0.42;
      seg.position.set(curX + Math.sin(tilt) * segH * 0.5, curY + segH * 0.5, 0);
      seg.rotation.z = -tilt;
      trunkParts.push(seg);
      curX += Math.sin(tilt) * segH;
      curY += Math.cos(tilt) * segH;
    }

    // Coconut crown cluster
    for (let n = 0; n < 5; n++) {
      const nut = new THREE.Mesh(new THREE.SphereGeometry(0.145, 6, 5));
      const na = (n / 5) * Math.PI * 2;
      nut.position.set(curX + Math.cos(na) * 0.22, curY - 0.14, Math.sin(na) * 0.22);
      trunkParts.push(nut);
    }

    const bladeGeo1 = new THREE.PlaneGeometry(0.76, 2.05);
    const bladeGeo2 = new THREE.PlaneGeometry(0.50, 1.75);

    for (let i = 0; i < 12; i++) {
      const yaw = (i / 12) * Math.PI * 2 + variantIdx * 0.25;
      const isUpper = i % 3 === 0;
      const droop = isUpper ? 0.12 : (i % 2 === 0 ? 0.32 : 0.54);

      const b1 = new THREE.Mesh(bladeGeo1);
      b1.rotation.order = 'YXZ';
      b1.rotation.y = yaw;
      b1.rotation.x = -Math.PI * 0.5 + droop;
      b1.position.set(
        curX + Math.sin(yaw) * 0.96,
        curY + (isUpper ? 0.34 : 0.14),
        Math.cos(yaw) * 0.96
      );
      frondParts.push(b1);

      const b2 = new THREE.Mesh(bladeGeo2);
      b2.rotation.order = 'YXZ';
      b2.rotation.y = yaw;
      b2.rotation.x = -Math.PI * 0.5 + droop + 0.36;
      b2.position.set(
        curX + Math.sin(yaw) * 2.55,
        curY + (isUpper ? -0.05 : -0.34),
        Math.cos(yaw) * 2.55
      );
      frondParts.push(b2);
    }

    const trunkGeo = this._mergeBakedMeshes(trunkParts);
    const frondGeo = this._mergeBakedMeshes(frondParts);
    for (const p of trunkParts) p.geometry.dispose();
    bladeGeo1.dispose();
    bladeGeo2.dispose();

    return { trunkGeo, frondGeo };
  }

  _buildMergedTropicalTreeVariant(variantIdx) {
    const THREE = this.THREE;
    const trunkParts = [];
    const canopyParts = [];

    const mainTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, 3.8, 8));
    mainTrunk.position.y = 1.9;
    mainTrunk.rotation.z = (variantIdx - 1) * 0.05;
    trunkParts.push(mainTrunk);

    for (let b = 0; b < 3; b++) {
      const angle = (b / 3) * Math.PI * 2 + variantIdx * 0.7;
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, 2.2, 6));
      branch.position.set(Math.cos(angle) * 0.6, 3.8, Math.sin(angle) * 0.6);
      branch.rotation.z = -Math.cos(angle) * 0.52;
      branch.rotation.x = Math.sin(angle) * 0.52;
      trunkParts.push(branch);

      const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(1.75 + (b % 2) * 0.35, 1));
      puff.scale.set(1.18, 0.84, 1.15);
      puff.position.set(Math.cos(angle) * 1.45, 5.1 + (b % 2) * 0.45, Math.sin(angle) * 1.45);
      canopyParts.push(puff);
    }

    const topCrown = new THREE.Mesh(new THREE.DodecahedronGeometry(2.15, 1));
    topCrown.scale.set(1.22, 0.88, 1.22);
    topCrown.position.set(0, 5.85, 0);
    canopyParts.push(topCrown);

    const trunkGeo = this._mergeBakedMeshes(trunkParts);
    const canopyGeo = this._mergeBakedMeshes(canopyParts);
    for (const p of trunkParts) p.geometry.dispose();
    for (const p of canopyParts) p.geometry.dispose();
    return { trunkGeo, canopyGeo };
  }

  _buildMergedShrubVariant(variantIdx) {
    const THREE = this.THREE;
    const leafParts = [];
    const flowerParts = [];

    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + variantIdx * 0.4;
      const d = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68 + (i % 2) * 0.16, 1));
      d.scale.set(1.2, 0.75, 1.15);
      d.position.set(Math.cos(a) * 0.45, 0.42 + (i % 2) * 0.12, Math.sin(a) * 0.45);
      leafParts.push(d);

      const f = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0));
      f.position.set(Math.cos(a) * 0.75, 0.74 + (i % 2) * 0.12, Math.sin(a) * 0.75);
      flowerParts.push(f);
    }

    const leafGeo = this._mergeBakedMeshes(leafParts);
    const flowerGeo = this._mergeBakedMeshes(flowerParts);
    for (const p of leafParts) p.geometry.dispose();
    for (const p of flowerParts) p.geometry.dispose();
    return { leafGeo, flowerGeo };
  }

  createCoconutPalm(x, z, scale = 1.0, seed = 0) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    const y = getTerrainHeight(x, z);
    group.position.set(x, y, z);

    const variant = this.palmVariants[Math.abs(seed) % this.palmVariants.length];

    const trunkMesh = new THREE.Mesh(variant.trunkGeo, this.palmTrunkMat);
    trunkMesh.scale.setScalar(scale);
    trunkMesh.rotation.y = (seed % 6) * 1.04;
    trunkMesh.castShadow = true;

    const frondMesh = new THREE.Mesh(variant.frondGeo, this.palmFrondMat);
    frondMesh.scale.setScalar(scale);
    frondMesh.rotation.y = trunkMesh.rotation.y;

    const ao = new THREE.Mesh(new THREE.PlaneGeometry(3.8 * scale, 3.8 * scale), this.aoShadowMat);
    ao.rotation.x = -Math.PI / 2;
    ao.position.y = 0.04;

    group.add(trunkMesh, frondMesh, ao);
    return group;
  }

  createTropicalTree(x, z, scale = 1.0, seed = 0) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.position.set(x, getTerrainHeight(x, z), z);

    const variant = this.treeVariants[Math.abs(seed) % this.treeVariants.length];
    const rotY = (seed % 8) * 0.785;

    const trunk = new THREE.Mesh(variant.trunkGeo, this.palmTrunkMat);
    trunk.scale.setScalar(scale);
    trunk.rotation.y = rotY;
    trunk.castShadow = true;

    const canopy = new THREE.Mesh(variant.canopyGeo, this.foliageCanopyMat);
    canopy.scale.setScalar(scale);
    canopy.rotation.y = rotY;
    canopy.castShadow = true;
    canopy.receiveShadow = true;

    const ao = new THREE.Mesh(new THREE.PlaneGeometry(5.2 * scale, 5.2 * scale), this.aoShadowMat);
    ao.rotation.x = -Math.PI / 2;
    ao.position.y = 0.04;

    group.add(trunk, canopy, ao);
    return group;
  }

  createCoastalShrub(x, z, scale = 1.0, seed = 0) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.position.set(x, getTerrainHeight(x, z), z);

    const variant = this.shrubVariants[Math.abs(seed) % this.shrubVariants.length];
    const rotY = (seed % 5) * 1.25;

    const foliage = new THREE.Mesh(variant.leafGeo, this.foliageCanopyMat);
    foliage.scale.setScalar(scale);
    foliage.rotation.y = rotY;
    foliage.receiveShadow = true;
    group.add(foliage);

    if (seed % 2 === 0) {
      const blossoms = new THREE.Mesh(variant.flowerGeo, this.bougainvilleaMat);
      blossoms.scale.setScalar(scale);
      blossoms.rotation.y = rotY;
      group.add(blossoms);
    }
    return group;
  }

  // Overhauled 4-Archetype Indian Coastal Architecture with 3D Pilasters, Recessed Glass Bays,
  // Real Cantilevered Balconies, Colonnade Shopfronts, Sunshade Chajjas & Detailed Rooftops
  createDetailedBuildingLOD(x, z, w, h, d, tintHex, facadeMat, shopIndex = 0) {
    const THREE = this.THREE;
    const lod = new THREE.LOD();
    const groundY = getTerrainHeight(x, z);
    lod.position.set(x, groundY, z);

    const styleIdx = Math.abs(shopIndex + Math.round(x + z)) % 4;
    const accentMat = this._getTintMat(tintHex);
    const highGroup = new THREE.Group();

    const concreteMeshes = [];
    const metalMeshes = [];
    const glassMeshes = [];

    const addPart = (list, sx, sy, sz, px, py, pz) => {
      const m = new THREE.Mesh(this.unitBoxGeo);
      m.scale.set(sx, sy, sz);
      m.position.set(px, py, pz);
      list.push(m);
    };

    // 1. Stepped Masonry Foundation Plinth & Ground-Floor Colonnade Shopfront
    addPart(concreteMeshes, w + 1.1, 0.55, d + 1.1, 0, 0.25, 0);

    const innerPlinth = new THREE.Mesh(this.unitBoxGeo, accentMat);
    innerPlinth.scale.set(w - 0.55, 3.1, d - 0.55);
    innerPlinth.position.y = 1.95;
    innerPlinth.castShadow = true;
    innerPlinth.receiveShadow = true;
    highGroup.add(innerPlinth);

    // Corner & Mid Colonnade Columns around ground floor arcade
    const colPositions = [
      [-w * 0.48, -d * 0.48],
      [w * 0.48, -d * 0.48],
      [-w * 0.48, d * 0.48],
      [w * 0.48, d * 0.48],
      [0, -d * 0.48],
      [0, d * 0.48]
    ];
    for (const [cx, cz] of colPositions) {
      addPart(concreteMeshes, 0.55, 3.3, 0.55, cx, 2.0, cz);
    }

    // Ground-floor Recessed Illuminated Shop Glazing & Rolling Shutter Headers
    for (const dzSign of [-1, 1]) {
      addPart(glassMeshes, w * 0.72, 2.15, 0.08, 0, 1.68, dzSign * (d * 0.5 - 0.22));
      addPart(metalMeshes, w * 0.74, 0.42, 0.14, 0, 2.95, dzSign * (d * 0.5 - 0.18));
    }

    // Cantilevered Commercial Entrance Canopy & Colorful Vizag Sign Fascia
    addPart(concreteMeshes, w + 1.25, 0.24, d + 1.25, 0, 3.62, 0);
    const signboard = new THREE.Mesh(this.unitBoxGeo, this._getShopMat(shopIndex));
    signboard.scale.set(w * 0.78, 0.62, d + 1.32);
    signboard.position.y = 4.02;
    highGroup.add(signboard);

    // 2. Upper Structural Core (Stepped Terraced Penthouse on Style 3!)
    const upperH = Math.max(4.5, h - 3.7);
    const hasStepback = styleIdx === 3 && upperH > 12;
    const mainH = hasStepback ? upperH * 0.72 : upperH;
    const mainCenterY = 3.7 + mainH * 0.5;

    const core = new THREE.Mesh(this.unitBoxGeo, facadeMat);
    core.scale.set(w - 0.22, mainH, d - 0.22);
    core.position.y = mainCenterY;
    core.castShadow = true;
    core.receiveShadow = true;
    highGroup.add(core);

    if (hasStepback) {
      const topH = upperH - mainH;
      const topCore = new THREE.Mesh(this.unitBoxGeo, facadeMat);
      topCore.scale.set(w * 0.72, topH, d * 0.72);
      topCore.position.y = 3.7 + mainH + topH * 0.5;
      topCore.castShadow = true;
      highGroup.add(topCore);
      addPart(concreteMeshes, w * 0.74 + 0.4, 0.45, d * 0.74 + 0.4, 0, 3.7 + upperH, 0);
    }

    // 3. Projecting Vertical Pilasters / Structural Columns across All 4 Facades
    const colCountX = Math.max(3, Math.round(w / 4.2));
    for (let i = 0; i <= colCountX; i++) {
      const px = -w * 0.48 + (i / colCountX) * (w * 0.96);
      addPart(concreteMeshes, 0.44, mainH + 0.2, 0.36, px, mainCenterY, d * 0.5 - 0.04);
      addPart(concreteMeshes, 0.44, mainH + 0.2, 0.36, px, mainCenterY, -d * 0.5 + 0.04);
    }
    const colCountZ = Math.max(3, Math.round(d / 4.2));
    for (let j = 1; j < colCountZ; j++) {
      const pz = -d * 0.48 + (j / colCountZ) * (d * 0.96);
      addPart(concreteMeshes, 0.36, mainH + 0.2, 0.44, w * 0.5 - 0.04, mainCenterY, pz);
      addPart(concreteMeshes, 0.36, mainH + 0.2, 0.44, -w * 0.5 + 0.04, mainCenterY, pz);
    }

    // 4. Floor Belt Slabs, Sunshade Chajjas, 3D Recessed Glass Bays & Cantilevered Balconies
    const floors = Math.max(2, Math.floor(mainH / 3.4));
    for (let f = 1; f <= floors; f++) {
      const fy = 3.7 + f * 3.35;
      if (fy > 3.7 + mainH - 0.3) break;

      // Projecting floor cornice slab
      addPart(concreteMeshes, w + 0.46, 0.24, d + 0.46, 0, fy, 0);

      // Sunshade chajjas + Recessed Reflective Architectural Glass Bays per bay
      const winY = fy - 1.55;
      const bayWidth = (w * 0.88) / colCountX;
      for (let b = 0; b < colCountX; b++) {
        const bx = -w * 0.44 + (b + 0.5) * bayWidth;
        const winW = Math.max(1.2, bayWidth * 0.70);

        for (const zSign of [-1, 1]) {
          // Physical glossy glass pane flush ahead of core stucco + frame sill
          addPart(glassMeshes, winW, 1.48, 0.08, bx, winY, zSign * (d * 0.5 - 0.07));
          addPart(metalMeshes, winW + 0.14, 0.12, 0.18, bx, winY - 0.78, zSign * (d * 0.5 - 0.02));
          // Angled sunshade chajja hood on residential/heritage styles
          if (styleIdx !== 1) {
            addPart(concreteMeshes, winW + 0.3, 0.12, 0.48, bx, winY + 0.86, zSign * (d * 0.5 + 0.16));
          }
        }
      }

      // Real 3D Cantilevered Balconies (slab deck + vertical balusters + top steel handrail)
      if ((styleIdx === 0 || styleIdx === 3 || f % 2 === 1) && f < floors) {
        const balW = w * 0.46;
        const balY = fy - 3.25;
        for (const zSign of [-1, 1]) {
          const bz = zSign * (d * 0.5 + 0.62);
          addPart(concreteMeshes, balW, 0.18, 1.25, 0, balY, bz);
          addPart(metalMeshes, balW, 0.06, 0.08, 0, balY + 0.96, bz + zSign * 0.56);
          for (let p = -2; p <= 2; p++) {
            addPart(metalMeshes, 0.06, 0.92, 0.06, (p / 2) * (balW * 0.44), balY + 0.48, bz + zSign * 0.56);
          }
          if (styleIdx === 3) {
            addPart(glassMeshes, balW * 0.94, 0.76, 0.05, 0, balY + 0.48, bz + zSign * 0.53);
          }
        }
      }
    }

    // 5. Distinct Architectural Roof Typologies: Pitched Terracotta Gable (Houses/Villas), Sawtooth/Ridge (Warehouses), or Parapet + Mumty (Apartments/Hotels/Offices)
    const roofY = 3.7 + upperH;
    const rw = hasStepback ? w * 0.72 : w;
    const rd = hasStepback ? d * 0.72 : d;
    const isLowHouse = h < 13.5 && styleIdx === 0;
    const isWarehouseRoof = styleIdx === 2 && h < 16.0;

    if (isLowHouse) {
      // Stepped Pitched Coastal Villa / Independent House Roof with overhanging eaves
      addPart(concreteMeshes, rw + 1.0, 0.25, rd + 1.0, 0, roofY + 0.12, 0);
      const ridge1 = new THREE.Mesh(this.unitBoxGeo, accentMat);
      ridge1.scale.set(rw * 0.82, 1.15, rd * 0.82);
      ridge1.position.set(0, roofY + 0.72, 0);
      ridge1.castShadow = true;
      const ridge2 = new THREE.Mesh(this.unitBoxGeo, accentMat);
      ridge2.scale.set(rw * 0.48, 0.95, rd * 0.56);
      ridge2.position.set(0, roofY + 1.55, 0);
      highGroup.add(ridge1, ridge2);
    } else if (isWarehouseRoof) {
      // Industrial Sawtooth Clerestory Roof + Loading Bay Awning
      addPart(concreteMeshes, rw + 0.4, 0.45, rd + 0.4, 0, roofY + 0.22, 0);
      for (let s = -1; s <= 1; s += 2) {
        addPart(metalMeshes, rw * 0.36, 1.35, rd * 0.9, s * rw * 0.22, roofY + 0.85, 0);
        addPart(glassMeshes, 0.12, 0.9, rd * 0.86, s * rw * 0.22 + rw * 0.17, roofY + 0.85, 0);
      }
    } else {
      // 4-sided perimeter parapet walls (real hollow roof well, not a solid cap!)
      addPart(concreteMeshes, rw + 0.4, 0.95, 0.36, 0, roofY + 0.45, rd * 0.5);
      addPart(concreteMeshes, rw + 0.4, 0.95, 0.36, 0, roofY + 0.45, -rd * 0.5);
      addPart(concreteMeshes, 0.36, 0.95, rd + 0.4, rw * 0.5, roofY + 0.45, 0);
      addPart(concreteMeshes, 0.36, 0.95, rd + 0.4, -rw * 0.5, roofY + 0.45, 0);

      // Rooftop HVAC outdoor chiller boxes & telecom mast
      addPart(metalMeshes, 1.35, 0.95, 0.95, -rw * 0.24, roofY + 0.48, -rd * 0.22);
      addPart(metalMeshes, 1.35, 0.95, 0.95, -rw * 0.04, roofY + 0.48, -rd * 0.22);
      addPart(metalMeshes, 0.14, 3.6, 0.14, rw * 0.28, roofY + 1.8, -rd * 0.25);

      const mumty = new THREE.Mesh(this.unitBoxGeo, accentMat);
      mumty.scale.set(3.2, 2.5, 3.2);
      mumty.position.set(rw * 0.2, roofY + 1.25, rd * 0.16);
      mumty.castShadow = true;
      highGroup.add(mumty);

      const waterTank = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 1.7, 10), this.waterTankMat);
      waterTank.position.set(-rw * 0.22, roofY + 1.0, rd * 0.2);
      highGroup.add(waterTank);
    }

    const concreteBatched = new THREE.Mesh(this._mergeBakedMeshes(concreteMeshes), this.concreteMat);
    concreteBatched.castShadow = true;
    concreteBatched.receiveShadow = true;
    highGroup.add(concreteBatched);

    if (metalMeshes.length > 0) {
      const metalBatched = new THREE.Mesh(this._mergeBakedMeshes(metalMeshes), this.railingMat);
      highGroup.add(metalBatched);
    }

    if (glassMeshes.length > 0) {
      const glassBatched = new THREE.Mesh(this._mergeBakedMeshes(glassMeshes), this.darkGlassMat);
      highGroup.add(glassBatched);
    }

    const ao = new THREE.Mesh(new THREE.PlaneGeometry(w + 5.2, d + 5.2), this.aoShadowMat);
    ao.rotation.x = -Math.PI / 2;
    ao.position.y = 0.05;
    highGroup.add(ao);

    // FAR LOD (> 195m -> single draw call!)
    const lowGroup = new THREE.Group();
    const lowCore = new THREE.Mesh(this.unitBoxGeo, facadeMat);
    lowCore.scale.set(w, h, d);
    lowCore.position.y = h * 0.5 - 0.5;
    lowGroup.add(lowCore);

    lod.addLevel(highGroup, 0);
    lod.addLevel(lowGroup, 195);
    return lod;
  }

  createDoubleArmStreetLamp(x, z) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    const y = getTerrainHeight(x, z);
    group.position.set(x, y, z);

    const basePedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.6, 8), this.metalPoleMat);
    basePedestal.position.y = 0.3;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 6.8, 8), this.metalPoleMat);
    pole.position.y = 3.4;
    pole.castShadow = true;
    group.add(basePedestal, pole);

    const crossArm = new THREE.Mesh(this.unitBoxGeo, this.metalPoleMat);
    crossArm.scale.set(2.8, 0.09, 0.09);
    crossArm.position.y = 6.75;
    group.add(crossArm);

    for (const side of [-1.25, 1.25]) {
      const cowl = new THREE.Mesh(this.unitBoxGeo, this.metalPoleMat);
      cowl.scale.set(0.54, 0.12, 0.28);
      cowl.position.set(side, 6.76, 0);
      const fixture = new THREE.Mesh(this.unitBoxGeo, this.lampEmissiveMat);
      fixture.scale.set(0.48, 0.08, 0.22);
      fixture.position.set(side, 6.68, 0);
      group.add(cowl, fixture);

      const halo = new THREE.Sprite(this.lampGlowSpriteMat);
      halo.position.set(side, 6.5, 0);
      halo.scale.set(3.8, 3.8, 1);
      group.add(halo);
    }

    const pool = new THREE.Mesh(new THREE.PlaneGeometry(13, 13), this.lampGroundPoolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.11;
    group.add(pool);

    return { group, worldPos: { x, y, z } };
  }

  createPromenadeBench(x, z) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.position.set(x, getTerrainHeight(x, z), z);

    const legMat = this.railingMat;
    const woodMat = this.palmTrunkMat;

    for (const lz of [-0.95, 0.95]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.48, 0.12), legMat);
      leg.position.set(0, 0.24, lz);
      group.add(leg);
    }
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.10, 2.2), woodMat);
    seat.position.set(0, 0.50, 0);
    seat.castShadow = true;
    const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.44, 2.2), woodMat);
    backrest.position.set(0.24, 0.76, 0);
    backrest.rotation.z = -0.15;
    group.add(seat, backrest);
    return group;
  }

  createBusShelter(x, z) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.position.set(x, getTerrainHeight(x, z), z);

    const metalMaps = this.tex.getMetalMaps();
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x0f766e,
      normalMap: metalMaps.normalMap,
      roughnessMap: metalMaps.roughnessMap,
      metalness: 0.58,
      roughness: 0.30,
      envMapIntensity: 1.4
    });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.18, 6.6), canopyMat);
    roof.position.y = 2.75;
    roof.castShadow = true;
    group.add(roof);

    for (const pz of [-2.9, 2.9]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.75, 8), this.metalPoleMat);
      post.position.set(-1.15, 1.38, pz);
      group.add(post);
    }

    const backPanel = new THREE.Mesh(new THREE.BoxGeometry(0.10, 2.35, 5.8), this.darkGlassMat);
    backPanel.position.set(-1.05, 1.38, 0);
    group.add(backPanel);

    const bench = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.12, 4.2), this.concreteMat);
    bench.position.set(-0.58, 0.55, 0);
    group.add(bench);

    return group;
  }

  createHighwayDirectionGantry(x, z) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.position.set(x, getTerrainHeight(x, z), z);

    for (const sx of [-9.5, 9.5]) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 6.6, 10), this.metalPoleMat);
      pillar.position.set(sx, 3.3, 0);
      pillar.castShadow = true;
      group.add(pillar);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(19.6, 0.32, 0.32), this.metalPoleMat);
    beam.position.y = 6.3;
    group.add(beam);

    const signMat = new THREE.MeshStandardMaterial({ map: this.beachGantryTex, roughness: 0.34, metalness: 0.18 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(10.5, 2.4, 0.16), signMat);
    board.position.y = 6.2;
    group.add(board);
    return group;
  }

  createTrafficSignal(x, z) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.position.set(x, getTerrainHeight(x, z), z);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 5.2, 8), this.metalPoleMat);
    pole.position.y = 2.6;
    const cantArm = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.12), this.metalPoleMat);
    cantArm.position.set(-1.2, 5.1, 0);
    group.add(pole, cantArm);

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 1.05, 0.32),
      new THREE.MeshStandardMaterial({ color: 0x181b20, roughness: 0.55, metalness: 0.35 })
    );
    box.position.y = 4.6;
    group.add(box);

    const redLamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    redLamp.position.set(0, 4.9, 0.16);
    const amberLamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
    amberLamp.position.set(0, 4.6, 0.16);
    const greenLamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
    greenLamp.position.set(0, 4.3, 0.16);
    group.add(redLamp, amberLamp, greenLamp);
    return group;
  }

  createPetrolStation(x, z, colliders) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    const y = getTerrainHeight(x, z);
    group.position.set(x, y, z);

    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(13, 0.75, 16),
      new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.30, metalness: 0.38, envMapIntensity: 1.25 })
    );
    canopy.position.y = 5.2;
    canopy.castShadow = true;
    group.add(canopy);

    const fascia = new THREE.Mesh(
      new THREE.BoxGeometry(13.2, 0.28, 16.2),
      new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.32, emissive: 0x552200, emissiveIntensity: 0.35 })
    );
    fascia.position.y = 5.0;
    group.add(fascia);

    for (const [px, pz] of [[-4.2, -5], [4.2, -5], [-4.2, 5], [4.2, 5]]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.65, 5.2, 0.65), this.concreteMat);
      col.position.set(px, 2.6, pz);
      group.add(col);
    }

    const pumpMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.36, metalness: 0.28 });
    for (const pz of [-2.5, 2.5]) {
      const island = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.24, 2.2), this.concreteMat);
      island.position.set(0, 0.12, pz);
      const pump = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.85, 1.35), pumpMat);
      pump.position.set(0, 1.04, pz);
      const screen = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.42, 0.55), this.darkGlassMat);
      screen.position.set(0, 1.38, pz);
      group.add(island, pump, screen);
    }

    colliders.push({ minX: x - 1.2, maxX: x + 1.2, minZ: z - 4, maxZ: z + 4, maxY: y + 5.5 });
    return group;
  }

  buildKursuraSubmarine(colliders) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    const pos = latLngToWorld(17.7172, 83.3275);
    const bx = pos.x;
    const bz = pos.z;
    const by = getTerrainHeight(bx, bz);
    group.position.set(bx, by, bz);
    group.rotation.y = 0.68; // Aligned along RK Beach coastline angle

    const baseDeck = new THREE.Mesh(new THREE.BoxGeometry(12, 1.0, 46), this.concreteMat);
    baseDeck.position.y = 0.5;
    baseDeck.receiveShadow = true;
    group.add(baseDeck);

    // Keel support cradles
    for (const cz of [-10, 0, 10]) {
      const cradle = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.6, 1.4), this.concreteMat);
      cradle.position.set(0, 1.4, cz);
      group.add(cradle);
    }

    const metalMaps = this.tex.getMetalMaps();
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x161c22,
      normalMap: metalMaps.normalMap,
      roughnessMap: metalMaps.roughnessMap,
      metalness: 0.74,
      roughness: 0.28,
      envMapIntensity: 1.5
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd99b26,
      metalness: 0.88,
      roughness: 0.22
    });

    const hullBody = new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.45, 33, 24), hullMat);
    hullBody.rotation.x = Math.PI / 2;
    hullBody.position.y = 3.45;
    hullBody.castShadow = true;
    group.add(hullBody);

    const noseFore = new THREE.Mesh(new THREE.SphereGeometry(2.45, 20, 16), hullMat);
    noseFore.scale.set(0.96, 1.0, 2.0);
    noseFore.position.set(0, 3.45, -16.5);
    noseFore.castShadow = true;
    group.add(noseFore);

    const noseAft = new THREE.Mesh(new THREE.ConeGeometry(2.45, 8.2, 20), hullMat);
    noseAft.rotation.x = Math.PI / 2;
    noseAft.position.set(0, 3.45, 20.5);
    noseAft.castShadow = true;
    group.add(noseAft);

    // Twin Bronze Propellers + Horizontal Stern Fins
    for (const px of [-0.95, 0.95]) {
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.65, 10), brassMat);
      hub.rotation.x = Math.PI / 2;
      hub.position.set(px, 3.3, 22.8);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.14, 0.08), brassMat);
      blade.position.set(px, 3.3, 23.0);
      blade.rotation.z = 0.55;
      group.add(hub, blade);
    }

    // Conning Tower / Sail + Diving Hydroplanes + Dual Masts
    const sail = new THREE.Mesh(new THREE.BoxGeometry(1.78, 3.9, 7.8), hullMat);
    sail.position.set(0, 6.5, -2.5);
    sail.castShadow = true;
    const plane = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.18, 1.25), hullMat);
    plane.position.set(0, 7.0, -4.0);
    const periscope = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.6, 8), this.metalPoleMat);
    periscope.position.set(0, 9.8, -3.4);
    const snorkel = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 2.8, 8), this.metalPoleMat);
    snorkel.position.set(0, 9.4, -1.5);
    group.add(sail, plane, periscope, snorkel);

    // Upper Deck Guard Rails & Museum Sign Arch
    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 1.6, 0.18),
      new THREE.MeshStandardMaterial({ map: this.kursuraSignTex, roughness: 0.35 })
    );
    signBoard.position.set(-5.8, 3.4, 0);
    signBoard.rotation.y = -Math.PI / 2;
    group.add(signBoard);

    colliders.push({
      minX: bx - 16.0,
      maxX: bx + 16.0,
      minZ: bz - 18.0,
      maxZ: bz + 18.0,
      minY: by,
      maxY: by + 9.0
    });
    return group;
  }

  buildVictoryMemorial(colliders) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    const pos = latLngToWorld(17.7124, 83.3220);
    const bx = pos.x;
    const bz = pos.z;
    const by = getTerrainHeight(bx, bz);
    group.position.set(bx, by, bz);

    const concreteMaps = this.tex.getConcreteMaps();
    const sandstoneMat = new THREE.MeshStandardMaterial({
      color: 0xb8523d,
      normalMap: concreteMaps.normalMap,
      roughnessMap: concreteMaps.roughnessMap,
      roughness: 0.62
    });
    const dais = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 7.4, 0.45, 24), this.concreteMat);
    dais.position.y = 0.22;
    const podium = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 5.2, 0.85, 24), this.concreteMat);
    podium.position.y = 0.85;
    group.add(dais, podium);

    const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 1.55, 12.6, 4), sandstoneMat);
    obelisk.position.y = 7.4;
    obelisk.castShadow = true;
    const crest = new THREE.Mesh(new THREE.OctahedronGeometry(0.75, 0), new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.85, roughness: 0.25 }));
    crest.position.y = 14.0;
    group.add(obelisk, crest);

    colliders.push({
      minX: bx - 4.6,
      maxX: bx + 4.6,
      minZ: bz - 4.6,
      maxZ: bz + 4.6,
      maxY: by + 14.5
    });
    return group;
  }

  buildKailasagiriSummit(colliders) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    const pos = latLngToWorld(17.7492, 83.3422);
    const bx = pos.x;
    const bz = pos.z;
    const by = getTerrainHeight(bx, bz);
    group.position.set(bx, by, bz);

    const concreteMaps = this.tex.getConcreteMaps();
    const marbleMat = new THREE.MeshStandardMaterial({
      color: 0xf5f7fa,
      normalMap: concreteMaps.normalMap,
      roughness: 0.26,
      metalness: 0.08,
      envMapIntensity: 1.3
    });
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(16, 18.5, 1.4, 28), marbleMat);
    plaza.position.y = 0.5;
    plaza.receiveShadow = true;
    const ringRail = new THREE.Mesh(new THREE.TorusGeometry(15.6, 0.18, 8, 32), this.railingMat);
    ringRail.rotation.x = Math.PI / 2;
    ringRail.position.y = 1.6;
    group.add(plaza, ringRail);

    const spireLeft = new THREE.Mesh(new THREE.ConeGeometry(2.6, 11.4, 14), marbleMat);
    spireLeft.position.set(-2.7, 6.7, -2);
    spireLeft.castShadow = true;
    const spireRight = new THREE.Mesh(new THREE.ConeGeometry(2.3, 10.2, 14), marbleMat);
    spireRight.position.set(2.7, 6.1, -2);
    spireRight.castShadow = true;
    group.add(spireLeft, spireRight);

    colliders.push({ minX: bx - 6, maxX: bx + 6, minZ: bz - 6, maxZ: bz + 2, minY: by, maxY: by + 12 });
    return group;
  }

  buildPortTerminal(colliders) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    const pos = latLngToWorld(17.6945, 83.2915);
    const bx = pos.x;
    const bz = pos.z;
    const by = getTerrainHeight(bx, bz);
    group.position.set(bx, by, bz);

    const metalMaps = this.tex.getMetalMaps();
    const craneMat = new THREE.MeshStandardMaterial({
      color: 0xd64535,
      normalMap: metalMaps.normalMap,
      roughnessMap: metalMaps.roughnessMap,
      metalness: 0.65,
      roughness: 0.34,
      envMapIntensity: 1.4
    });

    for (let c = -1; c <= 1; c += 2) {
      const cx = c * 14;
      const leg1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 22, 1.4), craneMat);
      leg1.position.set(cx - 4, 11, 14);
      const leg2 = leg1.clone();
      leg2.position.set(cx + 4, 11, 14);
      const brace = new THREE.Mesh(new THREE.BoxGeometry(10, 0.8, 0.8), craneMat);
      brace.position.set(cx, 12, 14);
      brace.rotation.z = 0.55;
      const boom = new THREE.Mesh(new THREE.BoxGeometry(26, 1.8, 2.6), craneMat);
      boom.position.set(cx + 4, 21.5, 14);
      boom.castShadow = true;
      const cab = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.4, 2.8), this.darkGlassMat);
      cab.position.set(cx + 6, 19.6, 14);
      group.add(leg1, leg2, brace, boom, cab);
    }

    // Stacked ISO shipping containers
    const containerColors = [0x1d4ed8, 0x0f766e, 0xd97706, 0xb91c1c];
    for (let k = 0; k < 4; k++) {
      const cMat = new THREE.MeshStandardMaterial({
        color: containerColors[k],
        normalMap: metalMaps.normalMap,
        roughness: 0.48,
        metalness: 0.35
      });
      const box = new THREE.Mesh(new THREE.BoxGeometry(6.2, 2.6, 2.6), cMat);
      box.position.set(-10 + (k % 2) * 7.2, 1.3 + Math.floor(k / 2) * 2.6, -4);
      box.castShadow = true;
      group.add(box);
    }

    colliders.push({ minX: bx - 18, maxX: bx + 18, minZ: bz + 12, maxZ: bz + 16, minY: by, maxY: by + 23 });
    return group;
  }

  buildDolphinsNoseLighthouse(colliders) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    const pos = latLngToWorld(17.6775, 83.2948);
    const bx = pos.x;
    const bz = pos.z;
    const by = getTerrainHeight(bx, bz);
    group.position.set(bx, by, bz);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5.2, 1.6, 16), this.concreteMat);
    base.position.y = 0.8;
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(1.75, 2.8, 16.5, 16),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 })
    );
    tower.position.y = 9.0;
    tower.castShadow = true;
    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(2.15, 2.4, 3.6, 16),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45 })
    );
    stripe.position.y = 7.6;
    const lantern = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.4, 2.4, 12),
      new THREE.MeshBasicMaterial({ color: 0xfff3b0 })
    );
    lantern.position.y = 18.2;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.8, 12), this.railingMat);
    cap.position.y = 20.1;
    group.add(base, tower, stripe, lantern, cap);

    colliders.push({ minX: bx - 4.4, maxX: bx + 4.4, minZ: bz - 4.4, maxZ: bz + 4.4, minY: by, maxY: by + 20 });
    return group;
  }

  // Real GeoJSON / GIS Polygon Building Footprint Extruder
  createFootprintExtrudedBuilding(polyPts, height, facadeMat, groundY, colliders) {
    const THREE = this.THREE;
    if (!polyPts || polyPts.length < 3) return null;

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of polyPts) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }
    const cx = (minX + maxX) * 0.5;
    const cz = (minZ + maxZ) * 0.5;

    // Ensure consistent CCW winding in shape coordinates (sx, sy) = (px - cx, -(pz - cz))
    const localPts = polyPts.map((p) => ({ sx: p.x - cx, sy: -(p.z - cz) }));
    let area = 0;
    for (let i = 0; i < localPts.length; i++) {
      const a = localPts[i];
      const b = localPts[(i + 1) % localPts.length];
      area += a.sx * b.sy - b.sx * a.sy;
    }
    if (area < 0) localPts.reverse();

    const shape = new THREE.Shape();
    shape.moveTo(localPts[0].sx, localPts[0].sy);
    for (let i = 1; i < localPts.length; i++) {
      shape.lineTo(localPts[i].sx, localPts[i].sy);
    }
    shape.closePath();

    const h = Math.max(4.5, Number(height) || 12);
    const extrudeGeo = new THREE.ExtrudeGeometry(shape, {
      depth: h + 1.2,
      bevelEnabled: true,
      bevelThickness: 0.25,
      bevelSize: 0.18,
      bevelSegments: 1
    });
    extrudeGeo.rotateX(-Math.PI / 2);

    const mesh = new THREE.Mesh(extrudeGeo, facadeMat);
    mesh.position.set(cx, groundY - 1.2, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const group = new THREE.Group();
    group.add(mesh);

    // Rooftop terrace water tank / elevator penthouse detail on extruded GIS footprint
    const core = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(2.2, (maxX - minX) * 0.22), 2.1, Math.max(2.2, (maxZ - minZ) * 0.22)),
      this.concreteMat
    );
    core.position.set(cx, groundY + h + 1.05, cz);
    core.castShadow = true;
    group.add(core);

    if (colliders) {
      colliders.push({
        minX: minX - 0.3,
        maxX: maxX + 0.3,
        minZ: minZ - 0.3,
        maxZ: maxZ + 0.3,
        minY: groundY - 1.5,
        maxY: groundY + h + 2.0,
        blocksVehicle: true
      });
    }
    return group;
  }

  createZebraCrosswalk(x, z, yaw = 0, roadWidth = 17.5) {
    const THREE = this.THREE;
    const y = getTerrainHeight(x, z) + 0.13;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(roadWidth - 0.8, 3.6),
      this.materials.crosswalkMat
    );
    mesh.rotation.order = 'YXZ';
    mesh.rotation.y = yaw;
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    return mesh;
  }
}
