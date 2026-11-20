// Pure-THREE PostProcessingManager:
// Single-pass HDR RenderTarget -> Soft Bloom, ACES Filmic Tone Mapping, Adaptive Exposure,
// GTA V Color Grading, Screen-Space Depth AO/Vignette, Distance DOF, Speed Motion Blur, Lens Streak & FXAA.
// Zero extra CDN dependencies; automatically bypasses on LOW preset for max framerate on mobile tablets.

export class PostProcessingManager {
  constructor(THREE, renderer) {
    this.THREE = THREE;
    this.renderer = renderer;
    this.enabled = true;
    this.bloomStrength = 0.24;
    this.aoStrength = 0.22;
    this.dofStrength = 0.14;
    this.motionBlurStrength = 0.18;
    this.fxaaEnabled = true;

    this.targetExposure = 1.08;
    this.currentExposure = 1.08;

    this.renderTarget = null;
    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.uniforms = {
      tDiffuse: { value: null },
      tDepth: { value: null },
      uHasDepth: { value: 0.0 },
      uResolution: { value: new THREE.Vector2(1280, 720) },
      uExposure: { value: 1.08 },
      uBloomStrength: { value: 0.24 },
      uAoStrength: { value: 0.22 },
      uDofStrength: { value: 0.14 },
      uMotionBlur: { value: 0.0 },
      uFxaa: { value: 1.0 },
      uLensWarmth: { value: 0.15 },
      uNightFactor: { value: 0.0 },
      uLightning: { value: 0.0 }
    };

    this._initPostQuad();
    this.resize(window.innerWidth, window.innerHeight, renderer.getPixelRatio ? renderer.getPixelRatio() : 1);
  }

  _initPostQuad() {
    const THREE = this.THREE;
    const mat = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      uniforms: this.uniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform sampler2D tDepth;
        uniform float uHasDepth;
        uniform vec2 uResolution;
        uniform float uExposure;
        uniform float uBloomStrength;
        uniform float uAoStrength;
        uniform float uDofStrength;
        uniform float uMotionBlur;
        uniform float uFxaa;
        uniform float uLensWarmth;
        uniform float uNightFactor;
        uniform float uLightning;
        varying vec2 vUv;

        float luma(vec3 c) {
          return dot(c, vec3(0.299, 0.587, 0.114));
        }

        vec3 acesFilm(vec3 x) {
          float a = 2.51;
          float b = 0.03;
          float c = 2.43;
          float d = 0.59;
          float e = 0.14;
          return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
        }

        // Fast FXAA edge smoothing
        vec3 sampleFxaa(sampler2D tex, vec2 uv, vec2 invRes) {
          vec3 rgbM = texture2D(tex, uv).rgb;
          if (uFxaa < 0.5) return rgbM;
          vec3 rgbNW = texture2D(tex, uv + vec2(-1.0, -1.0) * invRes).rgb;
          vec3 rgbNE = texture2D(tex, uv + vec2( 1.0, -1.0) * invRes).rgb;
          vec3 rgbSW = texture2D(tex, uv + vec2(-1.0,  1.0) * invRes).rgb;
          vec3 rgbSE = texture2D(tex, uv + vec2( 1.0,  1.0) * invRes).rgb;

          float lM = luma(rgbM);
          float lNW = luma(rgbNW);
          float lNE = luma(rgbNE);
          float lSW = luma(rgbSW);
          float lSE = luma(rgbSE);
          float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
          float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));

          if ((lMax - lMin) < 0.055) return rgbM;

          vec2 dir;
          dir.x = -((lNW + lNE) - (lSW + lSE));
          dir.y =  ((lNW + lSW) - (lNE + lSE));
          float dirReduce = max((lNW + lNE + lSW + lSE) * 0.03125, 0.0078125);
          float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
          dir = clamp(dir * rcpDirMin, vec2(-3.0), vec2(3.0)) * invRes;

          vec3 rgbA = 0.5 * (texture2D(tex, uv + dir * (1.0 / 3.0 - 0.5)).rgb +
                             texture2D(tex, uv + dir * (2.0 / 3.0 - 0.5)).rgb);
          vec3 rgbB = rgbA * 0.5 + 0.25 * (
            texture2D(tex, uv + dir * -0.5).rgb +
            texture2D(tex, uv + dir *  0.5).rgb
          );
          float lB = luma(rgbB);
          return (lB < lMin || lB > lMax) ? rgbA : rgbB;
        }

        void main() {
          vec2 invRes = 1.0 / max(uResolution, vec2(1.0));
          vec3 base = sampleFxaa(tDiffuse, vUv, invRes);

          // Speed-reactive subtle radial motion blur
          if (uMotionBlur > 0.005) {
            vec2 toEdge = (vUv - 0.5);
            float radial = length(toEdge);
            vec2 stepUv = toEdge * (uMotionBlur * radial * 0.022);
            vec3 mb = texture2D(tDiffuse, vUv - stepUv).rgb * 0.5 +
                      texture2D(tDiffuse, vUv - stepUv * 2.0).rgb * 0.5;
            base = mix(base, mb, clamp(radial * uMotionBlur * 0.65, 0.0, 0.42));
          }

          // Depth-based Distance Softness (DOF) & Screen-Space AO Contact Edge Accent
          float aoFactor = 1.0;
          if (uHasDepth > 0.5) {
            float dC = texture2D(tDepth, vUv).r;
            if (uDofStrength > 0.01 && dC > 0.992) {
              vec3 dofBlur = (
                texture2D(tDiffuse, vUv + vec2(invRes.x * 1.6, 0.0)).rgb +
                texture2D(tDiffuse, vUv - vec2(invRes.x * 1.6, 0.0)).rgb +
                texture2D(tDiffuse, vUv + vec2(0.0, invRes.y * 1.6)).rgb +
                texture2D(tDiffuse, vUv - vec2(0.0, invRes.y * 1.6)).rgb
              ) * 0.25;
              float blurAmt = smoothstep(0.992, 0.9995, dC) * uDofStrength;
              base = mix(base, dofBlur, blurAmt);
            }
            if (uAoStrength > 0.01 && dC < 0.996) {
              float d1 = texture2D(tDepth, vUv + vec2(invRes.x * 2.5, 0.0)).r;
              float d2 = texture2D(tDepth, vUv - vec2(invRes.x * 2.5, 0.0)).r;
              float d3 = texture2D(tDepth, vUv + vec2(0.0, invRes.y * 2.5)).r;
              float d4 = texture2D(tDepth, vUv - vec2(0.0, invRes.y * 2.5)).r;
              float occlusion = max(0.0, (dC * 4.0 - (d1 + d2 + d3 + d4)) * 18.0);
              aoFactor = 1.0 - clamp(occlusion * uAoStrength, 0.0, 0.24);
            }
          }

          // Soft HDR Bloom + subtle Anamorphic Lens Halation on bright peaks
          if (uBloomStrength > 0.01) {
            vec2 off = invRes * 3.8;
            vec3 s1 = texture2D(tDiffuse, vUv + vec2( off.x,  off.y)).rgb;
            vec3 s2 = texture2D(tDiffuse, vUv + vec2(-off.x,  off.y)).rgb;
            vec3 s3 = texture2D(tDiffuse, vUv + vec2( off.x, -off.y)).rgb;
            vec3 s4 = texture2D(tDiffuse, vUv + vec2(-off.x, -off.y)).rgb;
            vec3 bloom = max(vec3(0.0), (s1 + s2 + s3 + s4) * 0.25 - vec3(0.76));
            base += bloom * uBloomStrength * 1.45;
          }

          // Lens optical warmth & subtle edge vignette
          vec2 centerOff = vUv - 0.5;
          float vig = 1.0 - dot(centerOff, centerOff) * (0.28 + uNightFactor * 0.14);
          vec3 col = base * aoFactor * clamp(vig, 0.72, 1.0) * uExposure;
          col += vec3(0.035, 0.022, 0.008) * uLensWarmth * (1.0 - length(centerOff));
          col += vec3(0.28, 0.34, 0.45) * uLightning * 0.35;

          // Filmic ACES Tone Mapping
          col = acesFilm(col);

          // Restrained GTA V Color Grading: cool shadow split-tone + warm sunlit highlights (no oversaturation)
          float lum = luma(col);
          vec3 graded = mix(
            col * vec3(0.96, 0.99, 1.04),
            col * vec3(1.03, 1.01, 0.96),
            smoothstep(0.25, 0.85, lum)
          );
          graded = mix(vec3(lum), graded, 1.05); // Restrained filmic saturation

          // Convert linear HDR result to display sRGB gamma
          vec3 srgbOut = pow(max(graded, vec3(0.0)), vec3(1.0 / 2.2));
          gl_FragColor = vec4(clamp(srgbOut, 0.0, 1.0), 1.0);
        }
      `
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    this.postScene.add(quad);
  }

  setPresetConfig(presetName, effectsLevel, antiAliasingOverride = null) {
    if (effectsLevel <= 0 || String(presetName).toUpperCase() === 'LOW') {
      this.enabled = false;
      this.bloomStrength = 0.0;
      this.aoStrength = 0.0;
      this.dofStrength = 0.0;
      this.motionBlurStrength = 0.0;
      this.fxaaEnabled = false;
    } else if (effectsLevel === 1) {
      this.enabled = true;
      this.bloomStrength = 0.16;
      this.aoStrength = 0.18;
      this.dofStrength = 0.08;
      this.motionBlurStrength = 0.12;
      this.fxaaEnabled = true;
    } else if (effectsLevel === 2) {
      this.enabled = true;
      this.bloomStrength = 0.24;
      this.aoStrength = 0.26;
      this.dofStrength = 0.14;
      this.motionBlurStrength = 0.18;
      this.fxaaEnabled = true;
    } else {
      this.enabled = true;
      this.bloomStrength = 0.30;
      this.aoStrength = 0.32;
      this.dofStrength = 0.20;
      this.motionBlurStrength = 0.22;
      this.fxaaEnabled = true;
    }

    if (antiAliasingOverride !== null && antiAliasingOverride !== undefined) {
      this.fxaaEnabled = Boolean(antiAliasingOverride);
    }

    this.uniforms.uBloomStrength.value = this.bloomStrength;
    this.uniforms.uAoStrength.value = this.aoStrength;
    this.uniforms.uDofStrength.value = this.dofStrength;
    this.uniforms.uFxaa.value = this.fxaaEnabled ? 1.0 : 0.0;
  }

  resize(width, height, pixelRatio = 1) {
    const THREE = this.THREE;
    const rtW = Math.max(2, Math.floor(width * pixelRatio));
    const rtH = Math.max(2, Math.floor(height * pixelRatio));

    if (this.renderTarget) {
      this.renderTarget.dispose();
    }

    try {
      const caps = this.renderer.capabilities;
      const useHalfFloat = Boolean(caps && caps.isWebGL2);
      const rt = new THREE.WebGLRenderTarget(rtW, rtH, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        type: useHalfFloat ? THREE.HalfFloatType : THREE.UnsignedByteType
      });
      if (caps && caps.isWebGL2) {
        const depthTex = new THREE.DepthTexture(rtW, rtH);
        depthTex.type = THREE.UnsignedShortType;
        rt.depthTexture = depthTex;
        this.uniforms.tDepth.value = depthTex;
        this.uniforms.uHasDepth.value = 1.0;
      } else {
        this.uniforms.uHasDepth.value = 0.0;
      }
      this.renderTarget = rt;
      this.uniforms.tDiffuse.value = rt.texture;
      this.uniforms.uResolution.value.set(rtW, rtH);
    } catch (_) {
      this.renderTarget = null;
      this.enabled = false;
    }
  }

  render(scene, camera, dt, speedMps = 0, goldenFactor = 0, nightFactor = 0, lightning = 0) {
    // Adaptive Exposure: gently lifts night visibility while preventing overblown midday concrete
    this.targetExposure = nightFactor > 0.5 ? 1.24 : (1.06 + goldenFactor * 0.08);
    this.currentExposure += (this.targetExposure - this.currentExposure) * Math.min(1, dt * 1.8);

    if (!this.enabled || !this.renderTarget) {
      this.renderer.toneMappingExposure = this.currentExposure * 1.04;
      this.renderer.setRenderTarget(null);
      this.renderer.render(scene, camera);
      return;
    }

    try {
      this.renderer.toneMappingExposure = 1.0; // Filmic ACES handled cleanly in post shader
      this.uniforms.uExposure.value = this.currentExposure;
      this.uniforms.uMotionBlur.value = Math.min(1.0, Math.abs(speedMps) / 28.0) * this.motionBlurStrength;
      this.uniforms.uLensWarmth.value = goldenFactor * (1.0 - nightFactor);
      this.uniforms.uNightFactor.value = nightFactor;
      this.uniforms.uLightning.value = lightning;

      this.renderer.setRenderTarget(this.renderTarget);
      this.renderer.clear();
      this.renderer.render(scene, camera);

      this.renderer.setRenderTarget(null);
      this.renderer.render(this.postScene, this.postCamera);
    } catch (_) {
      // Safe direct-render fallback if WebGL depth texture unsupported on a GPU driver
      this.enabled = false;
      this.renderer.setRenderTarget(null);
      this.renderer.render(scene, camera);
    }
  }
}
