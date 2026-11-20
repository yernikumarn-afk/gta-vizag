// Realistic Bay of Bengal Ocean Shader, Volumetric-Style Cloud Sky Dome, PBR IBL & Dynamic GTA-Style Lighting Rig
// Zero-lag architecture: 1 shadow-casting directional sun + 1 coastal rim bounce + 3 pooled PointLights + PMREM Sky IBL

export class OceanAndSky {
  constructor(THREE, scene, pbrGen) {
    this.THREE = THREE;
    this.scene = scene;
    this.pbrGen = pbrGen;
    this.timeOfDay = 16.4; // Golden afternoon over Visakhapatnam RK Beach
    this.autoCycle = true;
    this.weather = 'SUNNY'; // SUNNY | CLOUDY | RAIN | FOG
    this.elapsed = 0;

    this.pmremGenerator = null;
    this.envRenderTarget = null;
    this.lastEnvBucket = '';
    this.lampPositions = [];

    this._initLighting();
    this._initSkyDome();
    this._initSunFlare();
    this._initOcean();
    this._initRainSystem();
    this.applyAtmosphere(0);
  }

  initEnvironment(renderer) {
    if (!renderer || this.pmremGenerator) return;
    const THREE = this.THREE;
    this.pmremGenerator = new THREE.PMREMGenerator(renderer);
    this.pmremGenerator.compileEquirectangularShader();
    this.lastEnvBucket = '';
    this._refreshEnvironmentMap(true);
  }

  setNearbyLampPositions(list) {
    this.lampPositions = list || [];
  }

  _initLighting() {
    const THREE = this.THREE;
    // 1. Sky-to-sand Hemisphere Ambient Bounce
    this.hemiLight = new THREE.HemisphereLight(0xb2e1ff, 0x5c4f41, 0.92);
    this.scene.add(this.hemiLight);

    // 2. Primary Sun / Moon Directional Light (Tight player-centered frustum = 2x sharper shadows at zero cost)
    this.sunLight = new THREE.DirectionalLight(0xffe6ba, 1.95);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 3;
    this.sunLight.shadow.camera.far = 210;
    const d = 60;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.00035;
    this.sunLight.shadow.normalBias = 0.03;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // 3. Coastal Sea-Reflection Rim Bounce Light (No shadow map -> zero GPU lag, gives GTA V silhouette pop!)
    this.rimBounceLight = new THREE.DirectionalLight(0x6fc9e8, 0.55);
    this.rimBounceLight.castShadow = false;
    this.scene.add(this.rimBounceLight);

    // 4. Pooled Dynamic Night/Rain PointLights (Headlight beam + 2 nearest Beach Road LED streetlamps)
    this.headlightPoolLight = new THREE.PointLight(0xfff1d6, 0, 38, 1.55);
    this.streetLightPoolA = new THREE.PointLight(0xffb85c, 0, 32, 1.65);
    this.streetLightPoolB = new THREE.PointLight(0xffb85c, 0, 32, 1.65);
    this.scene.add(this.headlightPoolLight, this.streetLightPoolA, this.streetLightPoolB);

    this.scene.fog = new THREE.FogExp2(0xcbe1f4, 0.0014);
  }

  _initSkyDome() {
    const THREE = this.THREE;
    const skyGeo = new THREE.SphereGeometry(980, 32, 20);
    this.skyUniforms = {
      uTime: { value: 0 },
      uTopColor: { value: new THREE.Color(0x1b65b5) },
      uHorizonColor: { value: new THREE.Color(0xf6be85) },
      uSunDir: { value: new THREE.Vector3(0.6, 0.35, -0.2).normalize() },
      uSunColor: { value: new THREE.Color(0xffe6b3) },
      uCloudCover: { value: 0.28 },
      uNightFactor: { value: 0.0 }
    };

    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: this.skyUniforms,
      vertexShader: `
        varying vec3 vWorldDir;
        void main() {
          vWorldDir = normalize(position);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uTopColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform float uCloudCover;
        uniform float uNightFactor;
        varying vec3 vWorldDir;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
            u.y
          );
        }

        float fbm(vec2 p) {
          float v = 0.0;
          v += 0.54 * noise(p);
          v += 0.31 * noise(p * 2.07 + 3.7);
          v += 0.15 * noise(p * 4.25 + 7.1);
          return v;
        }

        void main() {
          vec3 dir = normalize(vWorldDir);
          float h = clamp(dir.y * 1.15 + 0.08, 0.0, 1.0);
          vec3 sky = mix(uHorizonColor, uTopColor, pow(h, 0.56));

          // Atmospheric Mie Corona + Crisp Solar Disc
          float sunAmt = max(dot(dir, normalize(uSunDir)), 0.0);
          sky += uSunColor * pow(sunAmt, 8.0) * 0.24;
          sky += uSunColor * pow(sunAmt, 38.0) * 0.45;
          sky += uSunColor * smoothstep(0.9972, 0.9996, sunAmt) * 1.8;

          // Silver-lined volumetric-style drifting clouds
          if (dir.y > 0.025) {
            vec2 cloudUv = dir.xz / (dir.y + 0.22) * 1.65 + vec2(uTime * 0.0085, -uTime * 0.005);
            float cVal = fbm(cloudUv);
            float cMask = smoothstep(0.66 - uCloudCover * 0.44, 0.91, cVal) * smoothstep(0.025, 0.22, dir.y);
            float litEdge = pow(sunAmt, 4.0) * 0.55 + 0.25;
            vec3 cloudBase = mix(vec3(0.76, 0.81, 0.88), vec3(0.98, 0.98, 1.0), cVal);
            vec3 cloudTint = mix(cloudBase, uSunColor, clamp(litEdge * 0.48, 0.0, 0.55)) * (1.0 - uNightFactor * 0.76);
            sky = mix(sky, cloudTint, clamp(cMask * 0.88, 0.0, 0.90));
          }

          // Clear night stars + subtle moon glow
          if (uNightFactor > 0.15 && uCloudCover < 0.52 && dir.y > 0.07) {
            vec2 starUv = floor(dir.xz / (dir.y + 0.35) * 205.0);
            if (hash(starUv) > 0.9945) {
              sky += vec3(0.86, 0.93, 1.0) * uNightFactor * dir.y;
            }
          }

          gl_FragColor = vec4(sky, 1.0);
        }
      `
    });

    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyDome);
  }

  _initSunFlare() {
    const THREE = this.THREE;
    if (!this.pbrGen) return;
    const glowTex = this.pbrGen.createLightGlowTexture();
    const flareMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xffe0a3,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.sunFlareSprite = new THREE.Sprite(flareMat);
    this.sunFlareSprite.scale.set(170, 170, 1);
    this.scene.add(this.sunFlareSprite);
  }

  _initOcean() {
    const THREE = this.THREE;
    const oceanGeo = new THREE.PlaneGeometry(820, 1400, 92, 128);
    oceanGeo.rotateX(-Math.PI / 2);

    this.oceanUniforms = {
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0.6, 0.35, -0.2).normalize() },
      uSunColor: { value: new THREE.Color(0xffdfa3) },
      uDeepColor: { value: new THREE.Color(0x063a5e) },
      uShallowColor: { value: new THREE.Color(0x0ea4b5) },
      uSkyHorizon: { value: new THREE.Color(0xf6b979) },
      uCameraPos: { value: new THREE.Vector3() }
    };

    const oceanMat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: this.oceanUniforms,
      vertexShader: `
        uniform float uTime;
        varying vec3 vWorldPos;
        varying float vWave;

        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          float shoreDist = max(0.0, wp.x - 38.0);
          float amp = clamp(shoreDist * 0.015, 0.06, 0.68);

          float w1 = sin(wp.x * 0.14 - uTime * 2.1 + wp.z * 0.04);
          float w2 = cos(wp.z * 0.11 + uTime * 1.55 + wp.x * 0.05) * 0.65;
          float w3 = sin((wp.x + wp.z) * 0.27 - uTime * 2.8) * 0.3;
          float wave = (w1 + w2 + w3) * amp;

          wp.y += wave;
          vWorldPos = wp.xyz;
          vWave = wave;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform vec3 uDeepColor;
        uniform vec3 uShallowColor;
        uniform vec3 uSkyHorizon;
        uniform vec3 uCameraPos;

        varying vec3 vWorldPos;
        varying float vWave;

        void main() {
          float northDrift = vWorldPos.z < -450.0 ? min(34.0, (-vWorldPos.z - 450.0) * 0.045) : 0.0;
          float coastX = 44.0 + northDrift + sin(vWorldPos.z * 0.0045) * 12.0 + cos(vWorldPos.z * 0.0022) * 7.0;
          float depthFactor = clamp((vWorldPos.x - coastX) / 84.0, 0.0, 1.0);

          vec3 waterBase = mix(uShallowColor, uDeepColor, smoothstep(0.0, 1.0, depthFactor));

          // Multi-frequency ocean wave + capillary ripple normals for GTA V sun-path glitter
          float nx = cos(vWorldPos.x * 0.14 - uTime * 2.1) * 0.19
                   + sin(vWorldPos.x * 0.92 + vWorldPos.z * 0.65 - uTime * 3.4) * 0.065;
          float nz = -sin(vWorldPos.z * 0.11 + uTime * 1.55) * 0.14
                   + cos(vWorldPos.z * 0.88 - vWorldPos.x * 0.42 + uTime * 2.9) * 0.065;
          vec3 N = normalize(vec3(-nx, 1.0, -nz));

          vec3 V = normalize(uCameraPos - vWorldPos);
          float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.2);
          vec3 col = mix(waterBase, uSkyHorizon, clamp(fresnel * 0.64, 0.0, 0.72));

          // Sun specular glitter + broader coastal sheen
          vec3 L = normalize(uSunDir);
          vec3 H = normalize(L + V);
          float specSharp = pow(max(dot(N, H), 0.0), 140.0);
          float specBroad = pow(max(dot(N, H), 0.0), 22.0);
          col += uSunColor * (specSharp * 1.75 + specBroad * 0.24);

          // Shoreline turquoise subsurface glow & frothy breaking surf
          float surfBand = 1.0 - smoothstep(0.0, 14.5, abs(vWorldPos.x - coastX - 3.5));
          float surfPulse = 0.5 + 0.5 * sin(vWorldPos.x * 0.45 - uTime * 3.1 + sin(vWorldPos.z * 0.09) * 2.0);
          float foam = smoothstep(0.48, 0.90, surfBand * surfPulse + max(0.0, vWave) * 0.55);
          col = mix(col, vec3(0.96, 0.99, 1.0), clamp(foam * 0.90, 0.0, 0.94));

          float alpha = smoothstep(coastX - 9.0, coastX + 2.0, vWorldPos.x);
          gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.96));
        }
      `
    });

    this.oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    this.oceanMesh.position.set(430, 0.05, 0);
    this.scene.add(this.oceanMesh);
  }

  _initRainSystem() {
    const THREE = this.THREE;
    const dropCount = 1050;
    const positions = new Float32Array(dropCount * 6);
    for (let i = 0; i < dropCount; i++) {
      const rx = (Math.random() - 0.5) * 86;
      const ry = Math.random() * 40;
      const rz = (Math.random() - 0.5) * 86;
      const idx = i * 6;
      positions[idx] = rx;
      positions[idx + 1] = ry;
      positions[idx + 2] = rz;
      positions[idx + 3] = rx - 0.35;
      positions[idx + 4] = ry - 1.55;
      positions[idx + 5] = rz;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({ color: 0xc2e2ff, transparent: true, opacity: 0.54 });
    this.rainLines = new THREE.LineSegments(geo, mat);
    this.rainLines.visible = false;
    this.scene.add(this.rainLines);
  }

  _refreshEnvironmentMap(force = false) {
    if (!this.pmremGenerator || !this.pbrGen) return;
    const hourBucket = Math.floor(this.timeOfDay * 0.8);
    const bucketKey = `${hourBucket}_${this.weather}`;
    if (!force && bucketKey === this.lastEnvBucket) return;
    this.lastEnvBucket = bucketKey;

    const topCol = this.skyUniforms.uTopColor.value;
    const horCol = this.skyUniforms.uHorizonColor.value;
    const sunCol = this.skyUniforms.uSunColor.value;
    const groundCol = this.isNight()
      ? new this.THREE.Color(0x161f2b)
      : new this.THREE.Color(0x524c44);

    const eqTex = this.pbrGen.createSkyEquirectangularTexture(topCol, horCol, groundCol, sunCol);
    const nextRt = this.pmremGenerator.fromEquirectangular(eqTex);
    eqTex.dispose();

    if (this.envRenderTarget) {
      this.envRenderTarget.dispose();
    }
    this.envRenderTarget = nextRt;
    this.scene.environment = nextRt.texture;
  }

  setEnvironmentTime(hour, autoCycle) {
    this.timeOfDay = ((hour % 24) + 24) % 24;
    this.autoCycle = Boolean(autoCycle);
    this._refreshEnvironmentMap(true);
  }

  setWeather(weatherKey) {
    const upper = String(weatherKey || 'SUNNY').toUpperCase();
    this.weather = upper === 'CLEAR' ? 'SUNNY' : upper;
    this.rainLines.visible = this.weather === 'RAIN';
    this._refreshEnvironmentMap(true);
  }

  isNight() {
    return this.timeOfDay < 5.8 || this.timeOfDay > 18.6;
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

  updateDynamicLightPool(headlightPose, playerPos, effectsLevel) {
    const darkFactor = this.isNight() || this.weather === 'RAIN' || this.weather === 'FOG';
    const allowPool = effectsLevel >= 1 && darkFactor;

    if (allowPool && headlightPose) {
      this.headlightPoolLight.position.set(headlightPose.x, headlightPose.y + 1.4, headlightPose.z);
      this.headlightPoolLight.intensity = this.isNight() ? 18.0 : 9.0;
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
      if (bestA && distA < 46) {
        this.streetLightPoolA.position.set(bestA.x, bestA.y + 6.4, bestA.z);
        this.streetLightPoolA.intensity = this.isNight() ? 16.0 : 7.5;
      } else {
        this.streetLightPoolA.intensity = 0;
      }
      if (bestB && distB < 52) {
        this.streetLightPoolB.position.set(bestB.x, bestB.y + 6.4, bestB.z);
        this.streetLightPoolB.intensity = this.isNight() ? 14.0 : 6.5;
      } else {
        this.streetLightPoolB.intensity = 0;
      }
    } else {
      this.streetLightPoolA.intensity = 0;
      this.streetLightPoolB.intensity = 0;
    }
  }

  applyAtmosphere(dt, playerPos = null, cameraPos = null) {
    const THREE = this.THREE;
    this.elapsed += dt;

    if (this.autoCycle) {
      this.timeOfDay = (this.timeOfDay + dt * 0.025) % 24;
    }

    const sunPhase = ((this.timeOfDay - 6.0) / 24.0) * Math.PI * 2.0;
    const sunElev = Math.sin(sunPhase);
    const sunEastWest = Math.cos(sunPhase);
    const sunDir = new THREE.Vector3(sunEastWest, Math.max(-0.35, sunElev), -0.22).normalize();

    const dayFactor = Math.max(0, Math.min(1, (sunElev + 0.12) / 0.55));
    const goldenFactor = Math.max(0, 1.0 - Math.abs(sunElev - 0.15) * 3.1);
    const nightFactor = 1.0 - dayFactor;

    const topCol = new THREE.Color(0x050d1a)
      .lerp(new THREE.Color(0x1664ab), dayFactor)
      .lerp(new THREE.Color(0x234478), goldenFactor * 0.65);

    const horCol = new THREE.Color(0x0f2036)
      .lerp(new THREE.Color(0xa6daf7), dayFactor)
      .lerp(new THREE.Color(0xf89b56), goldenFactor * 0.88);

    const sunCol = new THREE.Color(0x527eb0)
      .lerp(new THREE.Color(0xfff4d8), dayFactor)
      .lerp(new THREE.Color(0xff9b3d), goldenFactor * 0.86);

    let fogDensity = 0.0012;
    let cloudCover = 0.26;

    if (this.weather === 'CLOUDY') {
      topCol.lerp(new THREE.Color(0x4a627a), 0.52);
      horCol.lerp(new THREE.Color(0x8ea2b5), 0.58);
      fogDensity = 0.0022;
      cloudCover = 0.72;
    } else if (this.weather === 'RAIN') {
      topCol.lerp(new THREE.Color(0x273545), 0.74);
      horCol.lerp(new THREE.Color(0x4c5e70), 0.78);
      fogDensity = 0.0042;
      cloudCover = 0.92;
    } else if (this.weather === 'FOG') {
      topCol.lerp(new THREE.Color(0x8da6b8), 0.62);
      horCol.lerp(new THREE.Color(0xb8ccd9), 0.82);
      fogDensity = 0.0080;
      cloudCover = 0.65;
    }

    this.skyUniforms.uTime.value = this.elapsed;
    this.skyUniforms.uTopColor.value.copy(topCol);
    this.skyUniforms.uHorizonColor.value.copy(horCol);
    this.skyUniforms.uSunDir.value.copy(sunDir);
    this.skyUniforms.uSunColor.value.copy(sunCol);
    this.skyUniforms.uCloudCover.value = cloudCover;
    this.skyUniforms.uNightFactor.value = nightFactor;

    this.scene.fog.color.copy(horCol);
    this.scene.fog.density = fogDensity;

    const px = playerPos ? playerPos.x : 0;
    const pz = playerPos ? playerPos.z : 0;
    const lightDir = sunElev > -0.05 ? sunDir : new THREE.Vector3(0.3, 0.75, 0.25).normalize();
    this.sunLight.position.set(px + lightDir.x * 105, 22 + Math.abs(lightDir.y) * 90, pz + lightDir.z * 105);
    this.sunLight.target.position.set(px, 0, pz);
    this.sunLight.color.copy(sunCol);

    // Opposite sea-bounce rim light fills dark shadow sides smoothly
    this.rimBounceLight.position.set(px - lightDir.x * 80 + 40, 26, pz - lightDir.z * 80);
    this.rimBounceLight.color.copy(horCol);

    const weatherDim =
      this.weather === 'RAIN' ? 0.55 : (this.weather === 'CLOUDY' ? 0.74 : (this.weather === 'FOG' ? 0.70 : 1.0));
    this.sunLight.intensity = (0.30 + dayFactor * 1.72) * weatherDim;
    this.hemiLight.intensity = (0.42 + dayFactor * 0.60) * weatherDim;
    this.hemiLight.color.copy(horCol);
    this.rimBounceLight.intensity = (0.22 + dayFactor * 0.42) * weatherDim;

    this.skyDome.position.set(px, 0, pz);
    if (this.sunFlareSprite) {
      const flareVisible = dayFactor > 0.15 && this.weather === 'SUNNY' && sunDir.y > 0.02;
      this.sunFlareSprite.visible = flareVisible;
      if (flareVisible) {
        this.sunFlareSprite.position.set(
          px + sunDir.x * 460,
          sunDir.y * 460,
          pz + sunDir.z * 460
        );
        this.sunFlareSprite.material.color.copy(sunCol);
        this.sunFlareSprite.material.opacity = 0.35 + goldenFactor * 0.35;
      }
    }

    this.oceanMesh.position.z = pz;
    this.oceanUniforms.uTime.value = this.elapsed;
    this.oceanUniforms.uSunDir.value.copy(lightDir);
    this.oceanUniforms.uSunColor.value.copy(sunCol);
    this.oceanUniforms.uSkyHorizon.value.copy(horCol);
    this.oceanUniforms.uDeepColor.value.setHex(nightFactor > 0.6 ? 0x03192b : 0x063d61);
    this.oceanUniforms.uShallowColor.value.setHex(nightFactor > 0.6 ? 0x07485b : 0x0ea4b5);
    if (cameraPos) {
      this.oceanUniforms.uCameraPos.value.copy(cameraPos);
    }

    this._refreshEnvironmentMap(false);

    if (this.rainLines.visible && playerPos) {
      this.rainLines.position.set(px, playerPos.y, pz);
      const posAttr = this.rainLines.geometry.attributes.position;
      const arr = posAttr.array;
      const fall = dt * 36;
      for (let i = 0; i < arr.length; i += 6) {
        arr[i + 1] -= fall;
        arr[i + 4] -= fall;
        if (arr[i + 1] < -2) {
          const resetY = 34 + Math.random() * 8;
          arr[i + 1] = resetY;
          arr[i + 4] = resetY - 1.55;
        }
      }
      posAttr.needsUpdate = true;
    }
  }
}
