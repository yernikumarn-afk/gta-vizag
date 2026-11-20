// 4-Preset Graphics Settings & Mobile Anti-Lag Adaptive Optimization Controller
// Coordinates LightingManager shadows, WorldStreamer LODs/anisotropy, and PostProcessingManager quality.

export const GRAPHICS_PRESETS = {
  LOW: {
    preset: 'LOW',
    resolutionScale: 0.70,
    shadows: false,
    shadowMapSize: 512,
    drawDistance: 210,
    chunkRadius: 1,
    anisotropy: 1,
    effectsLevel: 0,
    targetFps: 30,
    trafficDensity: 0.4
  },
  MEDIUM: {
    preset: 'MEDIUM',
    resolutionScale: 0.94,
    shadows: true,
    shadowMapSize: 1024,
    drawDistance: 340,
    chunkRadius: 1,
    anisotropy: 2,
    effectsLevel: 1,
    targetFps: 60,
    trafficDensity: 0.75
  },
  HIGH: {
    preset: 'HIGH',
    resolutionScale: 1.15,
    shadows: true,
    shadowMapSize: 1536,
    drawDistance: 480,
    chunkRadius: 2,
    anisotropy: 4,
    effectsLevel: 2,
    targetFps: 60,
    trafficDensity: 1.0
  },
  ULTRA: {
    preset: 'ULTRA',
    resolutionScale: 1.40,
    shadows: true,
    shadowMapSize: 2048,
    drawDistance: 680,
    chunkRadius: 2,
    anisotropy: 8,
    effectsLevel: 3,
    targetFps: 60,
    trafficDensity: 1.25
  }
};

export class GraphicsSettingsManager {
  constructor(THREE, renderer, camera, lightingManager, worldStreamer, postProcessingManager = null) {
    this.THREE = THREE;
    this.renderer = renderer;
    this.camera = camera;
    this.lighting = lightingManager;
    this.worldStreamer = worldStreamer;
    this.postProcessing = postProcessingManager;

    this.config = { ...GRAPHICS_PRESETS.MEDIUM };
    this.adaptiveDprScale = 1.0;
  }

  applyPreset(presetName) {
    const key = String(presetName || 'MEDIUM').toUpperCase();
    const base = GRAPHICS_PRESETS[key] || GRAPHICS_PRESETS.MEDIUM;
    this.adaptiveDprScale = 1.0;
    this.applyCustomConfig(base);
  }

  applyCustomConfig(partial) {
    this.config = { ...this.config, ...partial };
    if (!this.renderer) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
    const effectiveRatio = Math.max(
      0.55,
      Math.min(2.0, dpr * this.config.resolutionScale * this.adaptiveDprScale)
    );
    this.renderer.setPixelRatio(effectiveRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    const shadowsChanged = this.renderer.shadowMap.enabled !== Boolean(this.config.shadows);
    this.renderer.shadowMap.enabled = Boolean(this.config.shadows);
    if (shadowsChanged) {
      this.renderer.shadowMap.needsUpdate = true;
    }

    if (this.lighting && this.lighting.sunLight) {
      this.lighting.sunLight.castShadow = Boolean(this.config.shadows);
      this.lighting.updateShadowResolution(this.config.shadowMapSize || 1024);
    }

    if (this.camera) {
      this.camera.far = Math.max(300, this.config.drawDistance * 2.2);
      this.camera.updateProjectionMatrix();
    }

    if (this.worldStreamer) {
      this.worldStreamer.setActiveRadius(this.config.chunkRadius || 1);
      this.worldStreamer.setAnisotropy(this.config.anisotropy || 2);
    }

    if (this.postProcessing) {
      this.postProcessing.setPresetConfig(
        this.config.preset,
        this.getEffectsLevel(),
        this.config.antiAliasing
      );
      this.postProcessing.resize(window.innerWidth, window.innerHeight, effectiveRatio);
    }
  }

  // Smooth adaptive DPR tuning when tablet GPU encounters heavy urban load (keeps 60 FPS lag-free)
  adaptToFrameRate(measuredFps) {
    if (!this.renderer || this.config.targetFps <= 30) return;
    let changed = false;
    if (measuredFps < 40 && this.adaptiveDprScale > 0.78) {
      this.adaptiveDprScale = Math.max(0.76, this.adaptiveDprScale - 0.06);
      changed = true;
    } else if (measuredFps >= 56 && this.adaptiveDprScale < 1.0) {
      this.adaptiveDprScale = Math.min(1.0, this.adaptiveDprScale + 0.04);
      changed = true;
    }
    if (changed) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
      const effectiveRatio = Math.max(
        0.55,
        Math.min(2.0, dpr * this.config.resolutionScale * this.adaptiveDprScale)
      );
      this.renderer.setPixelRatio(effectiveRatio);
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      if (this.postProcessing) {
        this.postProcessing.resize(window.innerWidth, window.innerHeight, effectiveRatio);
      }
    }
  }

  getEffectsLevel() {
    return this.config.effectsLevel ?? 1;
  }

  getMinFrameIntervalMs() {
    return this.config.targetFps <= 30 ? 32.0 : 0.0;
  }
}
