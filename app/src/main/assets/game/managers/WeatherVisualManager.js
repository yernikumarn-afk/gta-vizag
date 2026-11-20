// WeatherVisualManager managing all 6 presets:
// SUNNY, CLOUDY, RAIN, FOG, STORMY, and CLEAR_NIGHT
// Drives smooth transitions in wetness, rain particle intensity, storm lightning, fog density, clouds & lighting.

const WEATHER_PRESET_TABLE = {
  SUNNY: {
    fogDensity: 0.0011,
    cloudCover: 0.24,
    sunDim: 1.0,
    ambientBoost: 1.0,
    wetnessTarget: 0.0,
    allowSunFlare: true,
    godRayBoost: 0.25,
    rainIntensity: 0.0,
    topTint: 0x1664ab,
    horizonTint: 0xa6daf7,
    tintWeight: 0.0
  },
  CLOUDY: {
    fogDensity: 0.0022,
    cloudCover: 0.74,
    sunDim: 0.74,
    ambientBoost: 0.92,
    wetnessTarget: 0.08,
    allowSunFlare: false,
    godRayBoost: 0.35,
    rainIntensity: 0.0,
    topTint: 0x4b637a,
    horizonTint: 0x8fa3b5,
    tintWeight: 0.56
  },
  RAIN: {
    fogDensity: 0.0040,
    cloudCover: 0.90,
    sunDim: 0.56,
    ambientBoost: 0.85,
    wetnessTarget: 0.85,
    allowSunFlare: false,
    godRayBoost: 0.0,
    rainIntensity: 0.78,
    topTint: 0x263545,
    horizonTint: 0x4e6073,
    tintWeight: 0.76
  },
  FOG: {
    fogDensity: 0.0078,
    cloudCover: 0.64,
    sunDim: 0.66,
    ambientBoost: 1.04,
    wetnessTarget: 0.32,
    allowSunFlare: false,
    godRayBoost: 0.45,
    rainIntensity: 0.0,
    topTint: 0x8da6b8,
    horizonTint: 0xb9ccd9,
    tintWeight: 0.82
  },
  STORMY: {
    fogDensity: 0.0052,
    cloudCover: 0.98,
    sunDim: 0.42,
    ambientBoost: 0.72,
    wetnessTarget: 1.0,
    allowSunFlare: false,
    godRayBoost: 0.0,
    rainIntensity: 1.0,
    topTint: 0x172230,
    horizonTint: 0x344456,
    tintWeight: 0.86
  },
  CLEAR_NIGHT: {
    fogDensity: 0.0014,
    cloudCover: 0.14,
    sunDim: 0.95,
    ambientBoost: 0.96,
    wetnessTarget: 0.0,
    allowSunFlare: false,
    godRayBoost: 0.0,
    rainIntensity: 0.0,
    topTint: 0x050d1a,
    horizonTint: 0x0d1c30,
    tintWeight: 0.12
  }
};

export class WeatherVisualManager {
  constructor(THREE, scene) {
    this.THREE = THREE;
    this.scene = scene;
    this.weather = 'SUNNY';

    // Smoothed scalar state
    this.curFogDensity = WEATHER_PRESET_TABLE.SUNNY.fogDensity;
    this.curCloudCover = WEATHER_PRESET_TABLE.SUNNY.cloudCover;
    this.curSunDim = WEATHER_PRESET_TABLE.SUNNY.sunDim;
    this.curAmbientBoost = WEATHER_PRESET_TABLE.SUNNY.ambientBoost;
    this.curWetness = 0.0;
    this.curTintWeight = 0.0;
    this.curTopTint = new THREE.Color(WEATHER_PRESET_TABLE.SUNNY.topTint);
    this.curHorTint = new THREE.Color(WEATHER_PRESET_TABLE.SUNNY.horizonTint);

    this.lightningTimer = 4.0;
    this.lightningFlash = 0.0;

    this._initRainSystem();
  }

  _initRainSystem() {
    const THREE = this.THREE;
    const dropCount = 1200;
    const positions = new Float32Array(dropCount * 6);
    for (let i = 0; i < dropCount; i++) {
      const rx = (Math.random() - 0.5) * 90;
      const ry = Math.random() * 42;
      const rz = (Math.random() - 0.5) * 90;
      const idx = i * 6;
      positions[idx] = rx;
      positions[idx + 1] = ry;
      positions[idx + 2] = rz;
      positions[idx + 3] = rx - 0.35;
      positions[idx + 4] = ry - 1.6;
      positions[idx + 5] = rz;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.rainMat = new THREE.LineBasicMaterial({
      color: 0xc2e2ff,
      transparent: true,
      opacity: 0.54
    });
    this.rainLines = new THREE.LineSegments(geo, this.rainMat);
    this.rainLines.visible = false;
    this.scene.add(this.rainLines);
  }

  static normalizeKey(key) {
    const upper = String(key || 'SUNNY').trim().toUpperCase();
    if (upper === 'CLEAR' || upper === 'SUNNY') return 'SUNNY';
    if (upper === 'CLOUDY') return 'CLOUDY';
    if (upper === 'RAIN' || upper === 'RAINY') return 'RAIN';
    if (upper === 'FOG' || upper === 'FOGGY') return 'FOG';
    if (upper === 'STORMY' || upper === 'STORM') return 'STORMY';
    if (upper === 'CLEAR_NIGHT' || upper === 'CLEAR NIGHT') return 'CLEAR_NIGHT';
    return 'SUNNY';
  }

  setWeather(weatherKey) {
    this.weather = WeatherVisualManager.normalizeKey(weatherKey);
    const preset = WEATHER_PRESET_TABLE[this.weather];
    this.rainLines.visible = preset.rainIntensity > 0.01;
    this.rainMat.opacity = this.weather === 'STORMY' ? 0.68 : 0.50;
    if (this.weather === 'STORMY') {
      this.lightningTimer = 1.6 + Math.random() * 2.5;
    } else {
      this.lightningFlash = 0.0;
    }
    return this.weather;
  }

  shouldActivateArtificialLights(isNight) {
    return isNight || this.weather === 'RAIN' || this.weather === 'FOG' || this.weather === 'STORMY' || this.weather === 'CLEAR_NIGHT';
  }

  update(dt, timePalette, playerPos) {
    const THREE = this.THREE;
    const target = WEATHER_PRESET_TABLE[this.weather] || WEATHER_PRESET_TABLE.SUNNY;
    const blend = Math.min(1.0, dt * 1.45);

    this.curFogDensity += (target.fogDensity - this.curFogDensity) * blend;
    this.curCloudCover += (target.cloudCover - this.curCloudCover) * blend;
    this.curSunDim += (target.sunDim - this.curSunDim) * blend;
    this.curAmbientBoost += (target.ambientBoost - this.curAmbientBoost) * blend;
    this.curWetness += (target.wetnessTarget - this.curWetness) * (dt * 0.85);
    this.curTintWeight += (target.tintWeight - this.curTintWeight) * blend;

    this.curTopTint.lerp(new THREE.Color(target.topTint), blend);
    this.curHorTint.lerp(new THREE.Color(target.horizonTint), blend);

    // Stormy lightning flash envelope
    if (this.weather === 'STORMY') {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.lightningFlash = 0.85 + Math.random() * 0.45;
        this.lightningTimer = 3.5 + Math.random() * 6.5;
      }
      this.lightningFlash = Math.max(0.0, this.lightningFlash - dt * 3.8);
    } else {
      this.lightningFlash = 0.0;
    }

    // Rain particle update
    if (this.rainLines.visible && playerPos) {
      this.rainLines.position.set(playerPos.x, playerPos.y, playerPos.z);
      const posAttr = this.rainLines.geometry.attributes.position;
      const arr = posAttr.array;
      const isStorm = this.weather === 'STORMY';
      const fall = dt * (isStorm ? 46 : 36);
      const windShift = isStorm ? -0.68 : -0.35;
      const activeStride = isStorm ? 6 : 12; // Storm uses denser drops; normal rain renders half at full speed
      for (let i = 0; i < arr.length; i += 6) {
        const yOff = (i % activeStride === 0) ? fall : fall * 1.1;
        arr[i + 1] -= yOff;
        arr[i + 4] -= yOff;
        if (arr[i + 1] < -2) {
          const resetY = 34 + Math.random() * 8;
          arr[i + 1] = resetY;
          arr[i + 3] = arr[i] + windShift;
          arr[i + 4] = resetY - (isStorm ? 1.85 : 1.55);
        }
      }
      posAttr.needsUpdate = true;
    }

    const topColor = timePalette.topCol.clone().lerp(this.curTopTint, this.curTintWeight);
    const horizonColor = timePalette.horCol.clone().lerp(this.curHorTint, this.curTintWeight);
    const fogColor = horizonColor.clone().lerp(new THREE.Color(0xcbd5e1), this.lightningFlash * 0.45);

    return {
      key: this.weather,
      topColor,
      horizonColor,
      fogColor,
      fogDensity: this.curFogDensity,
      cloudCover: this.curCloudCover,
      sunDim: this.curSunDim,
      ambientBoost: this.curAmbientBoost,
      allowSunFlare: target.allowSunFlare,
      godRayBoost: target.godRayBoost,
      wetness: this.curWetness,
      lightning: this.lightningFlash
    };
  }
}
