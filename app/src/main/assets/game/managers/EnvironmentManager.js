// Procedural Sky Dome, Atmospheric Scattering, FBM Clouds, Sky IBL Probe & Bay of Bengal Water Shader
export class EnvironmentManager {
  constructor(THREE, scene, textureManager) {
    this.THREE = THREE;
    this.scene = scene;
    this.tex = textureManager;
    this.elapsed = 0;

    this.pmremGenerator = null;
    this.envRenderTarget = null;
    this.lastEnvBucket = '';

    this.scene.fog = new THREE.FogExp2(0xcbe1f4, 0.0012);

    this._initSkyDome();
    this._initOcean();
  }

  initEnvironment(renderer) {
    if (!renderer || this.pmremGenerator) return;
    try {
      const THREE = this.THREE;
      this.pmremGenerator = new THREE.PMREMGenerator(renderer);
      this.pmremGenerator.compileEquirectangularShader();
      this.lastEnvBucket = '';
    } catch (_) {
      this.pmremGenerator = null;
    }
  }

  _initSkyDome() {
    const THREE = this.THREE;
    const skyGeo = new THREE.SphereGeometry(980, 32, 20);
    this.skyUniforms = {
      uTime: { value: 0 },
      uTopColor: { value: new THREE.Color(0x1664ab) },
      uHorizonColor: { value: new THREE.Color(0xa6daf7) },
      uSunDir: { value: new THREE.Vector3(0.6, 0.35, -0.2).normalize() },
      uSunColor: { value: new THREE.Color(0xffe6b3) },
      uCloudCover: { value: 0.28 },
      uNightFactor: { value: 0.0 },
      uGoldenFactor: { value: 0.0 },
      uLightning: { value: 0.0 }
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
        uniform float uGoldenFactor;
        uniform float uLightning;
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

          // Rayleigh vertical atmospheric gradient + Mie forward solar scatter
          vec3 sky = mix(uHorizonColor, uTopColor, pow(h, 0.58));
          float sunAmt = max(dot(dir, normalize(uSunDir)), 0.0);
          float horizonBand = pow(1.0 - clamp(abs(dir.y), 0.0, 1.0), 4.0);

          sky += uSunColor * pow(sunAmt, 6.0) * (0.20 + uGoldenFactor * 0.24);
          sky += uSunColor * pow(sunAmt, 36.0) * 0.44;
          sky += uSunColor * horizonBand * uGoldenFactor * 0.22;
          sky += uSunColor * smoothstep(0.9974, 0.9996, sunAmt) * 1.75;

          // Volumetric-style drifting FBM cumulus clouds with sunlit silver-lining
          if (dir.y > 0.02) {
            vec2 cloudUv = dir.xz / (dir.y + 0.22) * 1.65 + vec2(uTime * 0.0085, -uTime * 0.005);
            float cVal = fbm(cloudUv);
            float cMask = smoothstep(0.68 - uCloudCover * 0.48, 0.92, cVal) * smoothstep(0.02, 0.22, dir.y);
            float litEdge = pow(sunAmt, 4.0) * 0.55 + 0.25;
            vec3 cloudBase = mix(vec3(0.68, 0.74, 0.82), vec3(0.97, 0.97, 0.99), cVal);
            vec3 cloudTint = mix(cloudBase, uSunColor, clamp(litEdge * 0.45, 0.0, 0.52));
            cloudTint *= (1.0 - uNightFactor * 0.78);
            cloudTint += vec3(0.75, 0.86, 1.0) * uLightning * 0.65;
            sky = mix(sky, cloudTint, clamp(cMask * 0.90, 0.0, 0.92));
          }

          // Clear night stars + subtle silver moon glow
          if (uNightFactor > 0.12 && uCloudCover < 0.62 && dir.y > 0.06) {
            vec2 starUv = floor(dir.xz / (dir.y + 0.35) * 215.0);
            float starRand = hash(starUv);
            if (starRand > 0.9945) {
              float twinkle = 0.7 + 0.3 * sin(uTime * 2.4 + starRand * 60.0);
              sky += vec3(0.86, 0.93, 1.0) * uNightFactor * dir.y * twinkle * (1.0 - uCloudCover * 0.7);
            }
            vec3 moonDir = normalize(vec3(-0.45, 0.62, -0.35));
            float moonAmt = max(dot(dir, moonDir), 0.0);
            sky += vec3(0.72, 0.84, 1.0) * pow(moonAmt, 160.0) * 0.65 * uNightFactor;
            sky += vec3(0.85, 0.92, 1.0) * smoothstep(0.9982, 0.9994, moonAmt) * 1.15 * uNightFactor;
          }

          // Subtle storm flash atmospheric scatter
          sky += vec3(0.75, 0.86, 1.0) * uLightning * 0.35;

          gl_FragColor = vec4(sky, 1.0);
        }
      `
    });

    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyDome);
  }

  _initOcean() {
    const THREE = this.THREE;
    const oceanGeo = new THREE.PlaneGeometry(2400, 2400, 110, 110);
    oceanGeo.rotateX(-Math.PI / 2);

    const fallbackTex = new THREE.DataTexture(new Uint8Array([0, 255, 0, 255]), 1, 1, THREE.RGBAFormat);
    fallbackTex.needsUpdate = true;

    this.oceanUniforms = {
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0.6, 0.35, -0.2).normalize() },
      uSunColor: { value: new THREE.Color(0xffdfa3) },
      uDeepColor: { value: new THREE.Color(0x063a5e) },
      uShallowColor: { value: new THREE.Color(0x0ea4b5) },
      uSkyHorizon: { value: new THREE.Color(0xa6daf7) },
      uSkyTop: { value: new THREE.Color(0x1664ab) },
      uCameraPos: { value: new THREE.Vector3() },
      uNormalMap: { value: this.tex.getWaterDetailNormalMap() },
      uCoastMap: { value: fallbackTex },
      uWorldBounds: { value: new THREE.Vector4(-1580, 1320, -1760, 920) },
      uStormAmp: { value: 1.0 }
    };

    const oceanMat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: this.oceanUniforms,
      vertexShader: `
        uniform float uTime;
        uniform float uStormAmp;
        uniform sampler2D uCoastMap;
        uniform vec4 uWorldBounds;
        varying vec3 vWorldPos;
        varying float vWave;
        varying float vSeaDist;

        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vec2 uvC = vec2(
            clamp((wp.x - uWorldBounds.x) / (uWorldBounds.y - uWorldBounds.x), 0.0, 1.0),
            clamp((wp.z - uWorldBounds.z) / (uWorldBounds.w - uWorldBounds.z), 0.0, 1.0)
          );
          float rawR = texture2D(uCoastMap, uvC).r;
          float seaDist = (0.50196 - rawR) * 182.8;
          vSeaDist = seaDist;

          float amp = clamp(max(0.0, seaDist) * 0.015, 0.03, 0.72) * uStormAmp;
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
        uniform vec3 uSkyTop;
        uniform vec3 uCameraPos;
        uniform sampler2D uNormalMap;
        uniform sampler2D uCoastMap;
        uniform vec4 uWorldBounds;

        varying vec3 vWorldPos;
        varying float vWave;
        varying float vSeaDist;

        void main() {
          vec2 uvC = vec2(
            clamp((vWorldPos.x - uWorldBounds.x) / (uWorldBounds.y - uWorldBounds.x), 0.0, 1.0),
            clamp((vWorldPos.z - uWorldBounds.z) / (uWorldBounds.w - uWorldBounds.z), 0.0, 1.0)
          );
          float rawR = texture2D(uCoastMap, uvC).r;
          float seaDist = (0.50196 - rawR) * 182.8;

          float alpha = smoothstep(-2.8, 1.8, seaDist);
          if (alpha < 0.01) discard;

          float depthFactor = clamp(seaDist / 78.0, 0.0, 1.0);
          vec3 waterBase = mix(uShallowColor, uDeepColor, smoothstep(0.0, 1.0, depthFactor));

          // Combine macro wave normals + scrolling capillary detail normal map
          vec2 nUv1 = vWorldPos.xz * 0.032 + vec2(uTime * 0.03, -uTime * 0.02);
          vec2 nUv2 = vWorldPos.xz * 0.068 + vec2(-uTime * 0.022, uTime * 0.028);
          vec3 mapN1 = texture2D(uNormalMap, nUv1).xyz * 2.0 - 1.0;
          vec3 mapN2 = texture2D(uNormalMap, nUv2).xyz * 2.0 - 1.0;

          float nx = cos(vWorldPos.x * 0.14 - uTime * 2.1) * 0.17 + (mapN1.x + mapN2.x) * 0.14;
          float nz = -sin(vWorldPos.z * 0.11 + uTime * 1.55) * 0.13 + (mapN1.y + mapN2.y) * 0.14;
          vec3 N = normalize(vec3(-nx, 1.0, -nz));

          vec3 V = normalize(uCameraPos - vWorldPos);
          float NdotV = max(dot(N, V), 0.0);
          float fresnel = pow(1.0 - NdotV, 3.6);
          vec3 reflSky = mix(uSkyHorizon, uSkyTop, clamp(0.15 + N.y * 0.35, 0.0, 0.8));
          vec3 col = mix(waterBase, reflSky, clamp(fresnel * 0.72, 0.06, 0.80));

          // Sun specular glitter + coastal sheen
          vec3 L = normalize(uSunDir);
          vec3 H = normalize(L + V);
          float specSharp = pow(max(dot(N, H), 0.0), 155.0);
          float specBroad = pow(max(dot(N, H), 0.0), 22.0);
          col += uSunColor * (specSharp * 1.85 + specBroad * 0.24);

          // Shoreline turquoise scattering & breaking white foam following exact GIS shoreline
          float surfBand = 1.0 - smoothstep(0.0, 13.0, abs(seaDist - 3.2));
          float surfPulse = 0.5 + 0.5 * sin(seaDist * 0.45 - uTime * 3.1 + sin(vWorldPos.z * 0.09) * 2.0);
          float foam = smoothstep(0.46, 0.88, surfBand * surfPulse + max(0.0, vWave) * 0.50);
          col = mix(col, vec3(0.96, 0.99, 1.0), clamp(foam * 0.90, 0.0, 0.94));

          gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.96));
        }
      `
    });

    this.oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    this.oceanMesh.position.set(0, 0.06, 0);
    this.scene.add(this.oceanMesh);
  }

  setOceanVisible(visible) {
    if (this.oceanMesh) {
      this.oceanMesh.visible = Boolean(visible);
    }
  }

  setCoastMapTexture(dataTexture, bounds) {
    if (!this.oceanUniforms || !dataTexture) return;
    this.oceanUniforms.uCoastMap.value = dataTexture;
    if (bounds) {
      this.oceanUniforms.uWorldBounds.value.set(bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ);
    }
  }

  refreshEnvironmentProbe(timeOfDay, weatherKey, nightFactor, force = false) {
    if (!this.pmremGenerator || !this.tex) return;
    const hourBucket = Math.floor(timeOfDay * 0.8);
    const bucketKey = `${hourBucket}_${weatherKey}`;
    if (!force && bucketKey === this.lastEnvBucket) return;
    this.lastEnvBucket = bucketKey;

    try {
      const topCol = this.skyUniforms.uTopColor.value;
      const horCol = this.skyUniforms.uHorizonColor.value;
      const sunCol = this.skyUniforms.uSunColor.value;
      const groundCol = nightFactor > 0.55
        ? new this.THREE.Color(0x161f2b)
        : new this.THREE.Color(0x524c44);

      const eqTex = this.tex.createSkyEquirectangularTexture(topCol, horCol, groundCol, sunCol);
      const nextRt = this.pmremGenerator.fromEquirectangular(eqTex);
      eqTex.dispose();

      if (this.envRenderTarget) {
        this.envRenderTarget.dispose();
      }
      this.envRenderTarget = nextRt;
      this.scene.environment = nextRt.texture;
    } catch (_) {
      // Safe fallback if PMREM shader unavailable
    }
  }

  applyEnvironment(dt, timeOfDay, timePalette, weatherParams, playerPos, cameraPos, forceProbe = false) {
    this.elapsed += dt;

    this.skyUniforms.uTime.value = this.elapsed;
    this.skyUniforms.uTopColor.value.copy(weatherParams.topColor);
    this.skyUniforms.uHorizonColor.value.copy(weatherParams.horizonColor);
    this.skyUniforms.uSunDir.value.copy(timePalette.sunDir);
    this.skyUniforms.uSunColor.value.copy(timePalette.sunCol);
    this.skyUniforms.uCloudCover.value = weatherParams.cloudCover;
    this.skyUniforms.uNightFactor.value = timePalette.nightFactor;
    this.skyUniforms.uGoldenFactor.value = timePalette.goldenFactor;
    this.skyUniforms.uLightning.value = weatherParams.lightning;

    this.scene.fog.color.copy(weatherParams.fogColor);
    this.scene.fog.density = weatherParams.fogDensity;

    const px = playerPos ? playerPos.x : 0;
    const pz = playerPos ? playerPos.z : 0;
    this.skyDome.position.set(px, 0, pz);

    const lightDir = timePalette.sunElev > -0.05
      ? timePalette.sunDir
      : new this.THREE.Vector3(0.3, 0.78, 0.25).normalize();

    this.oceanMesh.position.x = px + 80;
    this.oceanMesh.position.z = pz;
    this.oceanUniforms.uTime.value = this.elapsed;
    this.oceanUniforms.uSunDir.value.copy(lightDir);
    this.oceanUniforms.uSunColor.value.copy(timePalette.sunCol);
    this.oceanUniforms.uSkyHorizon.value.copy(weatherParams.horizonColor);
    this.oceanUniforms.uSkyTop.value.copy(weatherParams.topColor);
    this.oceanUniforms.uDeepColor.value.setHex(timePalette.nightFactor > 0.6 ? 0x03192b : 0x063d61);
    this.oceanUniforms.uShallowColor.value.setHex(timePalette.nightFactor > 0.6 ? 0x07485b : 0x0ea4b5);
    this.oceanUniforms.uStormAmp.value = weatherParams.key === 'STORMY' ? 1.55 : (weatherParams.key === 'RAIN' ? 1.25 : 1.0);
    if (cameraPos) {
      this.oceanUniforms.uCameraPos.value.copy(cameraPos);
    }

    this.refreshEnvironmentProbe(timeOfDay, weatherParams.key, timePalette.nightFactor, forceProbe);
  }
}
