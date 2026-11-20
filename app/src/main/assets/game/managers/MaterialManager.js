// Centralized PBR MaterialManager managing shared materials, wet-surface wetness response & reflection probes
export class MaterialManager {
  constructor(THREE, textureManager) {
    this.THREE = THREE;
    this.tex = textureManager;
    this.facadeMatCache = new Map();
    this.tintMatCache = new Map();
    this.shopMatCache = new Map();
    this.isNight = false;
    this.wetness = 0.0;

    this._initCoreMaterials();
  }

  _initCoreMaterials() {
    const THREE = this.THREE;

    // 1. Road Asphalt (Normal + Bump + Dry/Wet Roughness + Metalness + AO + IBL Reflection)
    const roadMaps = this.tex.getAsphaltMaps();
    this.dryRoadRoughness = roadMaps.dryRoughnessMap;
    this.wetRoadRoughness = roadMaps.wetRoughnessMap;
    this.roadMaterial = new THREE.MeshStandardMaterial({
      map: roadMaps.map,
      normalMap: roadMaps.normalMap,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughnessMap: this.dryRoadRoughness,
      roughness: 0.86,
      metalnessMap: roadMaps.metalnessMap,
      metalness: 0.14,
      aoMap: roadMaps.aoMap,
      aoMapIntensity: 0.75,
      envMapIntensity: 1.25,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });

    // 2. Terracotta Brick Promenade Pavers
    const brickMaps = this.tex.getBrickMaps();
    this.promenadeMat = new THREE.MeshStandardMaterial({
      map: brickMaps.map,
      normalMap: brickMaps.normalMap,
      normalScale: new THREE.Vector2(1.0, 1.0),
      roughnessMap: brickMaps.roughnessMap,
      roughness: 0.80,
      metalnessMap: brickMaps.metalnessMap,
      metalness: 0.06,
      aoMap: brickMaps.aoMap,
      aoMapIntensity: 0.7,
      envMapIntensity: 0.9
    });

    // 3. Soil & Grass Coastal Terrain
    const terrainMaps = this.tex.getSoilAndGrassMaps();
    this.terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: terrainMaps.map,
      normalMap: terrainMaps.normalMap,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughnessMap: terrainMaps.roughnessMap,
      roughness: 0.92,
      metalness: 0.02,
      envMapIntensity: 0.7
    });

    // 4. Concrete (Seawalls, Chajjas, Parapets)
    const concreteMaps = this.tex.getConcreteMaps();
    this.concreteMat = new THREE.MeshStandardMaterial({
      map: concreteMaps.map,
      normalMap: concreteMaps.normalMap,
      normalScale: new THREE.Vector2(0.75, 0.75),
      roughnessMap: concreteMaps.roughnessMap,
      roughness: 0.86,
      metalnessMap: concreteMaps.metalnessMap,
      metalness: 0.05,
      aoMap: concreteMaps.aoMap,
      aoMapIntensity: 0.65,
      envMapIntensity: 0.95
    });

    // 5. Brushed & Galvanized Metal (Lamp poles, railings, gantries)
    const metalMaps = this.tex.getMetalMaps();
    this.metalPoleMat = new THREE.MeshStandardMaterial({
      color: 0x5c6773,
      map: metalMaps.map,
      normalMap: metalMaps.normalMap,
      roughnessMap: metalMaps.roughnessMap,
      metalnessMap: metalMaps.metalnessMap,
      metalness: 0.84,
      roughness: 0.30,
      envMapIntensity: 1.5
    });
    this.railingMat = new THREE.MeshStandardMaterial({
      color: 0x333c47,
      map: metalMaps.map,
      normalMap: metalMaps.normalMap,
      metalness: 0.76,
      roughness: 0.36,
      envMapIntensity: 1.35
    });

    // 6. Wood / Coconut Palm Bark & Leaves
    const woodMaps = this.tex.getWoodMaps();
    this.palmTrunkMat = new THREE.MeshStandardMaterial({
      color: 0x9b8068,
      map: woodMaps.map,
      normalMap: woodMaps.normalMap,
      roughnessMap: woodMaps.roughnessMap,
      roughness: 0.88
    });

    const leafMaps = this.tex.getLeavesMaps();
    this.palmFrondMat = new THREE.MeshStandardMaterial({
      color: 0xd9f2d8,
      map: leafMaps.map,
      normalMap: leafMaps.normalMap,
      roughnessMap: leafMaps.roughnessMap,
      roughness: 0.54,
      metalness: 0.04,
      side: THREE.DoubleSide
    });

    this.waterTankMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45 });

    // 6B. Interlocking Sidewalk Pavers, Yellow-Black Beveled Curbs & Cast-Iron Drain Grates
    const sidewalkMaps = this.tex.getSidewalkPaverMaps();
    this.sidewalkMat = new THREE.MeshStandardMaterial({
      map: sidewalkMaps.map,
      normalMap: sidewalkMaps.normalMap,
      normalScale: new THREE.Vector2(0.95, 0.95),
      roughnessMap: sidewalkMaps.roughnessMap,
      aoMap: sidewalkMaps.aoMap,
      aoMapIntensity: 0.72,
      roughness: 0.84,
      metalness: 0.04,
      envMapIntensity: 0.85
    });

    const curbMaps = this.tex.getCurbMaps();
    this.curbMat = new THREE.MeshStandardMaterial({
      map: curbMaps.map,
      normalMap: curbMaps.normalMap,
      roughnessMap: curbMaps.roughnessMap,
      roughness: 0.78,
      metalness: 0.06,
      envMapIntensity: 0.9
    });

    const drainMaps = this.tex.getDrainGrateMaps();
    this.drainGrateMat = new THREE.MeshStandardMaterial({
      map: drainMaps.map,
      normalMap: drainMaps.normalMap,
      roughnessMap: drainMaps.roughnessMap,
      metalness: 0.78,
      roughness: 0.42,
      envMapIntensity: 1.25
    });

    // 6C. Physical Architectural Glazing & Shopfront Shutters
    this.darkGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x18344c,
      metalness: 0.22,
      roughness: 0.06,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.75
    });
    this.nightLitGlassMat = new THREE.MeshStandardMaterial({
      color: 0xffe4a8,
      emissive: 0xffc668,
      emissiveIntensity: 0.35,
      roughness: 0.2,
      metalness: 0.1
    });
    this.shutterMetalMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      map: metalMaps.map,
      normalMap: metalMaps.normalMap,
      metalness: 0.65,
      roughness: 0.42
    });
    this.foliageCanopyMat = new THREE.MeshStandardMaterial({
      color: 0x2f6d3b,
      normalMap: leafMaps.normalMap,
      roughness: 0.72,
      metalness: 0.02
    });
    this.bougainvilleaMat = new THREE.MeshStandardMaterial({
      color: 0xc22572,
      normalMap: leafMaps.normalMap,
      roughness: 0.68
    });

    // 7. Architectural Facade + Reflective Glass Maps
    this.facadeMaps = this.tex.getBuildingFacadeAndGlassMaps();

    // 8. Emissive Lighting Sprites & Ground AO
    this.glowTex = this.tex.createLightGlowTexture();
    this.lampEmissiveMat = new THREE.MeshBasicMaterial({ color: 0xffe4a3 });
    this.lampGlowSpriteMat = new THREE.SpriteMaterial({
      map: this.glowTex,
      color: 0xffc86b,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.lampGroundPoolMat = new THREE.MeshBasicMaterial({
      map: this.glowTex,
      color: 0xffb854,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.aoShadowMat = new THREE.MeshBasicMaterial({
      map: this.tex.createContactShadowTexture(),
      transparent: true,
      depthWrite: false
    });

    this.crosswalkMat = new THREE.MeshStandardMaterial({
      map: this.tex.createCrosswalkTexture(),
      transparent: true,
      roughness: 0.75,
      metalness: 0.04,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4
    });
  }

  getFacadeMaterial(tintHex) {
    if (!this.facadeMatCache.has(tintHex)) {
      const mat = new this.THREE.MeshStandardMaterial({
        color: new this.THREE.Color(tintHex),
        map: this.isNight ? this.facadeMaps.nightMap : this.facadeMaps.dayMap,
        normalMap: this.facadeMaps.normalMap,
        normalScale: new this.THREE.Vector2(0.85, 0.85),
        roughnessMap: this.facadeMaps.roughnessMap,
        metalnessMap: this.facadeMaps.metalnessMap,
        aoMap: this.facadeMaps.aoMap,
        aoMapIntensity: 0.65,
        emissive: new this.THREE.Color(0xffca7a),
        emissiveMap: this.facadeMaps.emissiveMap,
        emissiveIntensity: this.isNight ? 0.78 : 0.0,
        roughness: 0.88,
        metalness: 0.28,
        envMapIntensity: 1.55
      });
      this.facadeMatCache.set(tintHex, mat);
    }
    return this.facadeMatCache.get(tintHex);
  }

  getPaintedTintMaterial(tintHex) {
    if (!this.tintMatCache.has(tintHex)) {
      const col = new this.THREE.Color(tintHex).multiplyScalar(0.84);
      this.tintMatCache.set(
        tintHex,
        new this.THREE.MeshStandardMaterial({
          color: col,
          normalMap: this.concreteMat.normalMap,
          roughness: 0.72,
          metalness: 0.05,
          envMapIntensity: 1.0
        })
      );
    }
    return this.tintMatCache.get(tintHex);
  }

  getShopMaterial(shopIndex) {
    const shopColors = [0xd97706, 0x0284c7, 0xdc2626, 0x059669, 0x7c3aed];
    const idx = shopIndex % shopColors.length;
    if (!this.shopMatCache.has(idx)) {
      this.shopMatCache.set(
        idx,
        new this.THREE.MeshStandardMaterial({
          color: shopColors[idx],
          roughness: 0.34,
          metalness: 0.14,
          envMapIntensity: 1.15
        })
      );
    }
    return this.shopMatCache.get(idx);
  }

  updateAtmosphereState(isNight, isRainOrFog, wetness = 0.0) {
    const clampedWet = Math.max(0, Math.min(1, wetness));
    const isWet = clampedWet > 0.35;

    this.lampEmissiveMat.color.setHex(isNight ? 0xffd07a : 0xdbe3eb);
    const glowActive = isNight || isRainOrFog;
    this.lampGlowSpriteMat.opacity = isNight ? 0.88 : (glowActive ? 0.40 : 0.0);
    this.lampGroundPoolMat.opacity = isNight ? 0.44 : (glowActive ? 0.20 : 0.0);

    if (this.isNight !== isNight) {
      this.isNight = isNight;
      this.nightLitGlassMat.emissiveIntensity = isNight ? 1.15 : 0.05;
      this.nightLitGlassMat.color.setHex(isNight ? 0xffe4a8 : 0x1e3850);
      for (const mat of this.facadeMatCache.values()) {
        mat.map = isNight ? this.facadeMaps.nightMap : this.facadeMaps.dayMap;
        mat.emissiveIntensity = isNight ? 0.78 : 0.0;
        mat.needsUpdate = true;
      }
    }

    if (Math.abs(this.wetness - clampedWet) > 0.08) {
      this.wetness = clampedWet;
      this.roadMaterial.roughnessMap = isWet ? this.wetRoadRoughness : this.dryRoadRoughness;
      this.roadMaterial.roughness = 0.86 - clampedWet * 0.32;
      this.roadMaterial.metalness = 0.14 + clampedWet * 0.36;
      this.roadMaterial.envMapIntensity = 1.25 + clampedWet * 0.85;
      this.roadMaterial.needsUpdate = true;

      this.promenadeMat.roughness = 0.80 - clampedWet * 0.42;
      this.promenadeMat.envMapIntensity = 0.9 + clampedWet * 0.85;

      this.sidewalkMat.roughness = 0.84 - clampedWet * 0.40;
      this.sidewalkMat.envMapIntensity = 0.85 + clampedWet * 0.8;

      this.curbMat.roughness = 0.78 - clampedWet * 0.36;
      this.concreteMat.roughness = 0.86 - clampedWet * 0.34;
      this.concreteMat.envMapIntensity = 0.95 + clampedWet * 0.65;
    }
  }
}
