// Cinematic GTA V-Style LightingManager:
// Natural sun/moon DirectionalLight3D-equivalent with soft shadows, Global Illumination sky/ground bounce,
// 8-phase Kelvin day/night temperature transitions, Volumetric Sunlight Shafts (God Rays), & Artificial Lamp Pools.

export class LightingManager {
  constructor(THREE, scene, textureManager) {
    this.THREE = THREE;
    this.scene = scene;
    this.tex = textureManager;
    this.lampPositions = [];
    this.lightningIntensity = 0.0;

    this._initLights();
    this._initVolumetricSunShafts();
  }

  _initLights() {
    const THREE = this.THREE;

    // 1. Sky-to-Terrain Global Illumination Hemisphere Bounce
    this.hemiLight = new THREE.HemisphereLight(0xb2e1ff, 0x5c4f41, 0.92);
    this.scene.add(this.hemiLight);

    // 2. Primary Sun / Moon Shadow-Casting Light (Soft PCF shadows + crisp 54m player frustum)
    this.sunLight = new THREE.DirectionalLight(0xffe6ba, 1.98);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 3;
    this.sunLight.shadow.camera.far = 215;
    const d = 54;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.00028;
    this.sunLight.shadow.normalBias = 0.022;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // 3. Opposite Coastal Horizon & Sea Bounce Rim Light (GI Fill without extra shadow cost)
    this.rimBounceLight = new THREE.DirectionalLight(0x6fc9e8, 0.55);
    this.rimBounceLight.castShadow = false;
    this.scene.add(this.rimBounceLight);

    // 4. Pooled Dynamic Artificial Lights with realistic inverse-square falloff (decay = 2)
    this.headlightPoolLight = new THREE.PointLight(0xfff1d6, 0, 42, 1.85);
    this.streetLightPoolA = new THREE.PointLight(0xffb85c, 0, 34, 1.95);
    this.streetLightPoolB = new THREE.PointLight(0xffb85c, 0, 34, 1.95);
    this.scene.add(this.headlightPoolLight, this.streetLightPoolA, this.streetLightPoolB);
  }

  _initVolumetricSunShafts() {
    const THREE = this.THREE;
    const glowTex = this.tex.createLightGlowTexture();

    // Solar Corona Flare
    const flareMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xffe0a3,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.sunFlareSprite = new THREE.Sprite(flareMat);
    this.sunFlareSprite.scale.set(175, 175, 1);
    this.scene.add(this.sunFlareSprite);

    // Volumetric God Ray Light-Shaft Cones projecting from Sun toward camera/player horizon
    this.godRayGroup = new THREE.Group();
    this.godRayMat = new THREE.MeshBasicMaterial({
      map: glowTex,
      color: 0xffd79b,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    for (let i = 0; i < 3; i++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(28 + i * 14, 130, 12, 1, true), this.godRayMat);
      cone.position.set((i - 1) * 18, 28, -i * 12);
      cone.rotation.z = 0.25 + (i - 1) * 0.14;
      cone.rotation.x = 0.35;
      this.godRayGroup.add(cone);
    }
    this.scene.add(this.godRayGroup);
  }

  setNearbyLampPositions(list) {
    this.lampPositions = list || [];
  }

  setLightningPulse(strength) {
    this.lightningIntensity = Math.max(0, strength);
  }

  updateShadowResolution(mapSize) {
    if (!this.sunLight) return;
    const size = Math.max(512, Math.min(2048, mapSize));
    if (this.sunLight.shadow.mapSize.width !== size) {
      this.sunLight.shadow.mapSize.width = size;
      this.sunLight.shadow.mapSize.height = size;
      if (this.sunLight.shadow.map) {
        this.sunLight.shadow.map.dispose();
        this.sunLight.shadow.map = null;
      }
    }
  }

  // Computes natural Kelvin-inspired colors across Dawn, Sunrise, Midday, Golden Hour, Sunset, Blue Hour & Night
  computeTimeColors(timeOfDay) {
    const THREE = this.THREE;
    const sunPhase = ((timeOfDay - 6.0) / 24.0) * Math.PI * 2.0;
    const sunElev = Math.sin(sunPhase);
    const sunEastWest = Math.cos(sunPhase);
    const sunDir = new THREE.Vector3(sunEastWest, Math.max(-0.35, sunElev), -0.22).normalize();

    const dayFactor = Math.max(0, Math.min(1, (sunElev + 0.12) / 0.52));
    // Warm golden hour peaks near sunrise (~06:30) and sunset (~17:30)
    const goldenFactor = Math.max(0, 1.0 - Math.abs(sunElev - 0.13) * 3.4);
    // Blue hour peaks right before sunrise (~05:25) and after sunset (~18:35)
    const blueHourFactor = Math.max(0, 1.0 - Math.abs(sunElev + 0.05) * 5.2);
    const nightFactor = 1.0 - dayFactor;

    const topCol = new THREE.Color(0x050d1a)
      .lerp(new THREE.Color(0x1664ab), dayFactor)
      .lerp(new THREE.Color(0x1e437a), goldenFactor * 0.58)
      .lerp(new THREE.Color(0x183868), blueHourFactor * 0.65);

    const horCol = new THREE.Color(0x0d1c30)
      .lerp(new THREE.Color(0xa6daf7), dayFactor)
      .lerp(new THREE.Color(0xf69852), goldenFactor * 0.88)
      .lerp(new THREE.Color(0x4c79a8), blueHourFactor * 0.55);

    const sunCol = new THREE.Color(0x527eb0)
      .lerp(new THREE.Color(0xfff5dc), dayFactor)
      .lerp(new THREE.Color(0xff9b3d), goldenFactor * 0.86)
      .lerp(new THREE.Color(0x7ca6d8), blueHourFactor * 0.42);

    const groundBounce = new THREE.Color(0x18212c)
      .lerp(new THREE.Color(0x635648), dayFactor)
      .lerp(new THREE.Color(0x75523b), goldenFactor * 0.5);

    return { sunDir, sunElev, dayFactor, goldenFactor, blueHourFactor, nightFactor, topCol, horCol, sunCol, groundBounce };
  }

  applyLighting(playerPos, cameraPos, timePalette, weatherParams, effectsLevel) {
    const px = playerPos ? playerPos.x : 0;
    const pz = playerPos ? playerPos.z : 0;
    const { sunDir, sunElev, dayFactor, goldenFactor } = timePalette;

    const lightDir = sunElev > -0.05
      ? sunDir
      : new this.THREE.Vector3(0.3, 0.78, 0.25).normalize();

    this.sunLight.position.set(
      px + lightDir.x * 108,
      24 + Math.abs(lightDir.y) * 92,
      pz + lightDir.z * 108
    );
    this.sunLight.target.position.set(px, 0, pz);

    // Apply atmospheric & lightning overrides cleanly without oversaturation
    const sunCol = timePalette.sunCol.clone().lerp(new this.THREE.Color(0xdbeafe), this.lightningIntensity * 0.85);
    this.sunLight.color.copy(sunCol);

    this.rimBounceLight.position.set(px - lightDir.x * 80 + 40, 26, pz - lightDir.z * 80);
    this.rimBounceLight.color.copy(weatherParams.horizonColor);

    const dim = weatherParams.sunDim;
    this.sunLight.intensity = (0.32 + dayFactor * 1.78) * dim + this.lightningIntensity * 2.4;
    this.hemiLight.intensity = (0.44 + dayFactor * 0.62) * weatherParams.ambientBoost + this.lightningIntensity * 0.9;
    this.hemiLight.color.copy(weatherParams.horizonColor);
    this.hemiLight.groundColor.copy(timePalette.groundBounce);
    this.rimBounceLight.intensity = (0.22 + dayFactor * 0.42) * dim;

    // Volumetric Solar Flare & God Rays
    const sunVisible = dayFactor > 0.14 && weatherParams.allowSunFlare && sunDir.y > 0.02;
    this.sunFlareSprite.visible = sunVisible;
    if (sunVisible) {
      this.sunFlareSprite.position.set(
        px + sunDir.x * 460,
        sunDir.y * 460,
        pz + sunDir.z * 460
      );
      this.sunFlareSprite.material.color.copy(sunCol);
      this.sunFlareSprite.material.opacity = 0.34 + goldenFactor * 0.38;
    }

    const godRaysActive = sunVisible && effectsLevel >= 1 && (goldenFactor > 0.15 || weatherParams.godRayBoost > 0);
    this.godRayGroup.visible = godRaysActive;
    if (godRaysActive) {
      this.godRayGroup.position.set(
        px + sunDir.x * 85,
        Math.max(18, sunDir.y * 85),
        pz + sunDir.z * 85
      );
      this.godRayGroup.lookAt(px, playerPos ? playerPos.y + 4 : 4, pz);
      this.godRayMat.color.copy(sunCol);
      this.godRayMat.opacity = Math.min(0.16, (0.04 + goldenFactor * 0.09) * (1 + weatherParams.godRayBoost));
    }
  }

  updateDynamicLightPool(headlightPose, playerPos, isDarkOrBadWeather, isNight, effectsLevel) {
    const allowPool = effectsLevel >= 1 && isDarkOrBadWeather;

    if (allowPool && headlightPose) {
      this.headlightPoolLight.position.set(headlightPose.x, headlightPose.y + 1.4, headlightPose.z);
      this.headlightPoolLight.intensity = isNight ? 20.0 : 10.5;
    } else {
      this.headlightPoolLight.intensity = 0;
    }

    if (allowPool && playerPos && this.lampPositions.length > 0) {
      let bestA = null;
      let distA = Infinity;
      let bestB = null;
      let distB = Infinity;
      for (let i = 0; i < this.lampPositions.length; i++) {
        const lp = this.lampPositions[i];
        const d = Math.hypot(lp.x - playerPos.x, lp.z - playerPos.z);
        if (d < distA) {
          distB = distA;
          bestB = bestA;
          distA = d;
          bestA = lp;
        } else if (d < distB) {
          distB = d;
          bestB = lp;
        }
      }
      if (bestA && distA < 48) {
        this.streetLightPoolA.position.set(bestA.x, bestA.y + 6.4, bestA.z);
        this.streetLightPoolA.intensity = isNight ? 18.0 : 8.5;
      } else {
        this.streetLightPoolA.intensity = 0;
      }
      if (bestB && distB < 54) {
        this.streetLightPoolB.position.set(bestB.x, bestB.y + 6.4, bestB.z);
        this.streetLightPoolB.intensity = isNight ? 15.0 : 7.5;
      } else {
        this.streetLightPoolB.intensity = 0;
      }
    } else {
      this.streetLightPoolA.intensity = 0;
      this.streetLightPoolB.intensity = 0;
    }
  }
}
