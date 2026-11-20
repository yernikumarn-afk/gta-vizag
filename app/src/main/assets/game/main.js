// Main Orchestrator for VIZAG CITY – THE OPEN WORLD
// Uses modular 6-Manager Cinematic Graphics Architecture:
// TextureManager, MaterialManager, LightingManager, EnvironmentManager, WeatherVisualManager, PostProcessingManager.

import { loadThreeModule } from './ThreeLoader.js';
import { AssetIntegrationManager } from './core/AssetIntegrationManager.js';
import { GraphicsSettingsManager } from './core/GraphicsSettingsManager.js';
import { AudioManager } from './core/AudioManager.js';
import { TextureManager } from './managers/TextureManager.js';
import { MaterialManager } from './managers/MaterialManager.js';
import { LightingManager } from './managers/LightingManager.js';
import { EnvironmentManager } from './managers/EnvironmentManager.js';
import { WeatherVisualManager } from './managers/WeatherVisualManager.js';
import { PostProcessingManager } from './managers/PostProcessingManager.js';
import {
  WORLD_BOUNDS,
  getCoastSignedDistance,
  getDistrictAt,
  getTerrainHeight,
  worldToLatLng
} from './data/VizagGeoData.js';
import { GisWorldManager } from './gis/GisWorldManager.js';
import { ChunkStreamManager } from './world/ChunkStreamManager.js';
import { HumanMeshBuilder } from './entities/HumanMeshBuilder.js';
import { PlayerController } from './entities/PlayerController.js';
import { CameraController } from './entities/CameraController.js';
import { VehicleManager } from './entities/VehicleManager.js';
import { PedestrianManager } from './entities/PedestrianManager.js';
import { MissionSystem } from './missions/MissionSystem.js';
import { CollisionManager } from './systems/CollisionManager.js';
import { InteriorManager } from './systems/InteriorManager.js';
import { InteractionManager } from './systems/InteractionManager.js';
import { NavigationManager } from './systems/NavigationManager.js';

const inputState = {
  joyX: 0,
  joyY: 0,
  sprint: false,
  throttle: 0,
  brake: 0,
  reverse: 0,
  handbrake: 0,
  paused: false
};

let engine = null;

function isNightHour(hour) {
  return hour < 5.8 || hour > 18.6;
}

window.VizagGame = {
  setJoystick(x, y) {
    if (engine && engine.audio) engine.audio.ensureStarted();
    inputState.joyX = Number(x) || 0;
    inputState.joyY = Number(y) || 0;
  },
  addCameraDelta(dx, dy) {
    if (engine && engine.cameraCtrl) {
      engine.cameraCtrl.addDelta(dx, dy);
    }
  },
  jump() {
    if (engine && engine.audio) engine.audio.ensureStarted();
    if (engine && engine.player) {
      engine.player.jump();
    }
  },
  setSprint(active) {
    inputState.sprint = Boolean(active);
  },
  interact() {
    if (!engine || !engine.interactionMgr) return;
    engine.audio.ensureStarted();
    const res = engine.interactionMgr.execute(engine.player, engine.vehicles);
    if (res && res.message && window.AndroidBridge && window.AndroidBridge.onNotification) {
      window.AndroidBridge.onNotification(res.message);
    }
  },
  toggleVehicle() {
    if (!engine) return;
    engine.audio.ensureStarted();
    const res = engine.vehicles.tryEnterOrExit(engine.player);
    if (window.AndroidBridge && window.AndroidBridge.onNotification) {
      window.AndroidBridge.onNotification(res.message);
    }
  },
  setDrivingControls(throttle, brake, reverse, handbrake) {
    inputState.throttle = Number(throttle) || 0;
    inputState.brake = Number(brake) || 0;
    inputState.reverse = Number(reverse) || 0;
    inputState.handbrake = Number(handbrake) || 0;
  },
  setPedals(throttle, brake) {
    inputState.throttle = Number(throttle) || 0;
    inputState.brake = Number(brake) || 0;
  },
  honkHorn() {
    if (!engine) return;
    engine.audio.playHorn();
    engine.pedestrians.scareNearby(engine.player.position.x, engine.player.position.z);
  },
  spawnVehicle(vehicleId) {
    if (!engine) return;
    const name = engine.vehicles.spawnGarageVehicleNearPlayer(String(vehicleId), engine.player);
    if (window.AndroidBridge && window.AndroidBridge.onNotification) {
      window.AndroidBridge.onNotification(`Delivered ${name} to roadside`);
    }
  },
  setPaused(pausedFlag) {
    inputState.paused = Boolean(pausedFlag);
  },
  setAudioEnabled(enabledFlag) {
    if (engine && engine.audio) {
      engine.audio.setEnabled(Boolean(enabledFlag));
    }
  },
  setAudioVolume(volume) {
    if (engine && engine.audio) {
      engine.audio.setVolume(Number(volume));
    }
  },
  applyGraphicsPreset(presetName) {
    if (engine && engine.graphics) {
      engine.graphics.applyPreset(presetName);
    }
  },
  applyCustomGraphics(resScale, shadows, drawDist, targetFps, shadowSize, anisotropy, antiAliasing) {
    if (engine && engine.graphics) {
      engine.graphics.applyCustomConfig({
        resolutionScale: Number(resScale) || 0.94,
        shadows: Boolean(shadows),
        drawDistance: Number(drawDist) || 340,
        chunkRadius: Number(drawDist) >= 420 ? 2 : 1,
        targetFps: Number(targetFps) || 60,
        shadowMapSize: Number(shadowSize) || 1024,
        anisotropy: Number(anisotropy) || 2,
        antiAliasing: antiAliasing === undefined ? true : Boolean(antiAliasing)
      });
    }
  },
  setEnvironmentTime(hour, autoCycle) {
    if (!engine) return;
    engine.timeOfDay = ((Number(hour) % 24) + 24) % 24;
    engine.autoCycle = Boolean(autoCycle);
    engine.stepVisualAtmosphere(0.016, true);
  },
  setWeather(weatherKey) {
    if (!engine) return;
    const prevWeather = engine.weatherMgr.weather;
    const resolved = engine.weatherMgr.setWeather(weatherKey);
    if (resolved === 'CLEAR_NIGHT' && !isNightHour(engine.timeOfDay)) {
      engine.timeOfDay = 22.25;
    } else if (prevWeather === 'CLEAR_NIGHT' && resolved === 'SUNNY' && isNightHour(engine.timeOfDay)) {
      engine.timeOfDay = 16.4;
    }
    engine.stepVisualAtmosphere(0.016, true);
  },
  setCustomWaypoint(x, z, label) {
    if (engine && engine.missions) {
      engine.missions.setCustomWaypoint(Number(x), Number(z), String(label));
    }
  },
  setActiveMission(index) {
    if (engine && engine.missions) {
      engine.missions.setMission(Number(index) || 0);
    }
  },
  teleportTo(x, z, yaw = Math.PI) {
    if (!engine) return;
    const tx = Number(x) || 0;
    const tz = Number(z) || 0;
    const tyaw = Number(yaw) || Math.PI;
    if (engine.vehicles.drivenVehicle) {
      const v = engine.vehicles.drivenVehicle;
      v.x = tx;
      v.z = tz;
      v.y = getTerrainHeight(tx, tz);
      v.speed = 0;
      v.yaw = tyaw;
      v.mesh.position.set(v.x, v.y, v.z);
    } else {
      engine.player.teleport(tx, tz, tyaw);
    }
    engine.cameraCtrl.snapBehind(tx, getTerrainHeight(tx, tz), tz, tyaw);
    engine.chunks.update(tx, tz, engine.camera, true);
  },
  restoreState(x, z, yaw, timeOfDay, autoCycle, weatherKey, missionIndex) {
    if (!engine) return;
    this.setEnvironmentTime(timeOfDay, autoCycle);
    this.setWeather(weatherKey);
    this.setActiveMission(missionIndex);
    this.teleportTo(x, z, yaw);
  },
  setGisLayerVisibility(layerId, visible) {
    if (!engine || !engine.gisMgr) return;
    engine.gisMgr.setLayerVisible(String(layerId), Boolean(visible));
    if (layerId === 'water') {
      engine.environmentMgr.setOceanVisible(Boolean(visible));
    }
    engine.chunks.invalidateAllChunks();
    engine.chunks.update(engine.player.position.x, engine.player.position.z, engine.camera, true);
    engine.collisionMgr.setStaticBoxes(engine.chunks.getActiveColliders());
    engine.collisionMgr.setFlyoverSurfaces(engine.chunks.getActiveFlyoverSurfaces());
  },
  async importGisAsset(url, fileName, layerHint = 'auto') {
    if (!engine || !engine.gisMgr) return;
    const res = await engine.gisMgr.importFromUrl(String(url), String(fileName), String(layerHint));
    engine.environmentMgr.setCoastMapTexture(engine.gisMgr.coastDataTexture, WORLD_BOUNDS);
    engine.navigationMgr.rebuildRoadGraph();
    engine.vehicles.respawnTrafficOnActiveRoads();
    engine.chunks.invalidateAllChunks();
    engine.chunks.update(engine.player.position.x, engine.player.position.z, engine.camera, true);
    engine.collisionMgr.setStaticBoxes(engine.chunks.getActiveColliders());
    engine.collisionMgr.setFlyoverSurfaces(engine.chunks.getActiveFlyoverSurfaces());
    engine.lightingMgr.setNearbyLampPositions(engine.chunks.getAllLampPositions());
    if (res && res.message && window.AndroidBridge && window.AndroidBridge.onNotification) {
      window.AndroidBridge.onNotification(res.message);
    }
  }
};

async function bootVizagOpenWorld() {
  const container = document.getElementById('webgl-container');
  let THREE;
  let GLTFLoader;
  try {
    const loaded = await loadThreeModule();
    THREE = loaded.THREE;
    GLTFLoader = loaded.GLTFLoader;
  } catch (_) {
    if (window.AndroidBridge && window.AndroidBridge.onNotification) {
      window.AndroidBridge.onNotification('Offline mode: check internet for WebGL module');
    }
    if (window.AndroidBridge && window.AndroidBridge.onEngineReady) {
      window.AndroidBridge.onEngineReady();
    }
    return;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
  } catch (_) {
    if (window.AndroidBridge && window.AndroidBridge.onEngineReady) {
      window.AndroidBridge.onEngineReady();
    }
    return;
  }

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / Math.max(1, window.innerHeight),
    0.35,
    950
  );

  const assetManager = new AssetIntegrationManager(THREE, GLTFLoader, (manifestJson) => {
    if (window.AndroidBridge && window.AndroidBridge.onAssetManifest) {
      window.AndroidBridge.onAssetManifest(manifestJson);
    }
  });

  const audio = new AudioManager();

  // Initialize Modular 6-Manager Graphics Architecture
  const textureMgr = new TextureManager(THREE);
  const materialMgr = new MaterialManager(THREE, textureMgr);
  const lightingMgr = new LightingManager(THREE, scene, textureMgr);
  const environmentMgr = new EnvironmentManager(THREE, scene, textureMgr);
  const weatherMgr = new WeatherVisualManager(THREE, scene);
  const postProcessingMgr = new PostProcessingManager(THREE, renderer);

  const gltfLoaderInstance = GLTFLoader ? new GLTFLoader() : null;
  const gisMgr = new GisWorldManager(THREE, scene, gltfLoaderInstance, (gisStateJson) => {
    if (window.AndroidBridge && window.AndroidBridge.onGisStateChanged) {
      window.AndroidBridge.onGisStateChanged(gisStateJson);
    }
  });

  environmentMgr.initEnvironment(renderer);
  environmentMgr.setCoastMapTexture(gisMgr.coastDataTexture, WORLD_BOUNDS);

  const chunks = new ChunkStreamManager(THREE, scene, textureMgr, materialMgr, gisMgr);
  const graphics = new GraphicsSettingsManager(THREE, renderer, camera, lightingMgr, chunks, postProcessingMgr);
  graphics.applyPreset('MEDIUM');

  const collisionMgr = new CollisionManager();
  const interiorMgr = new InteriorManager(THREE, scene, textureMgr, materialMgr, collisionMgr);
  const interactionMgr = new InteractionManager();
  const navigationMgr = new NavigationManager(THREE, scene);

  const humanBuilder = new HumanMeshBuilder(THREE);
  const player = new PlayerController(THREE, scene, humanBuilder);
  const cameraCtrl = new CameraController(THREE, camera);
  cameraCtrl.snapBehind(player.position.x, player.position.y, player.position.z, player.yaw);

  const vehicles = new VehicleManager(THREE, scene, humanBuilder, textureMgr);
  const pedestrians = new PedestrianManager(THREE, scene, humanBuilder);
  const missions = new MissionSystem(THREE, scene, (missionIdx, reward) => {
    if (window.AndroidBridge && window.AndroidBridge.onMissionCompleted) {
      window.AndroidBridge.onMissionCompleted(missionIdx, reward);
    }
  });

  let latestTimePalette = lightingMgr.computeTimeColors(16.4);
  let latestWeatherParams = weatherMgr.update(0.016, latestTimePalette, player.position);

  const stepVisualAtmosphere = (dt, forceProbe = false) => {
    latestTimePalette = lightingMgr.computeTimeColors(engine.timeOfDay);
    latestWeatherParams = weatherMgr.update(dt, latestTimePalette, player.position);

    lightingMgr.setLightningPulse(latestWeatherParams.lightning);
    lightingMgr.applyLighting(
      player.position,
      camera.position,
      latestTimePalette,
      latestWeatherParams,
      graphics.getEffectsLevel()
    );
    environmentMgr.applyEnvironment(
      dt,
      engine.timeOfDay,
      latestTimePalette,
      latestWeatherParams,
      player.position,
      camera.position,
      forceProbe
    );

    const isNight = isNightHour(engine.timeOfDay);
    const isDarkOrBad = weatherMgr.shouldActivateArtificialLights(isNight);
    chunks.setAtmosphereFlags(isNight, isDarkOrBad, latestWeatherParams.wetness);
    vehicles.setLightsActive(isDarkOrBad);

    lightingMgr.updateDynamicLightPool(
      vehicles.getActiveHeadlightPose(),
      player.position,
      isDarkOrBad,
      isNight,
      graphics.getEffectsLevel()
    );
  };

  engine = {
    THREE,
    renderer,
    scene,
    camera,
    assetManager,
    audio,
    textureMgr,
    materialMgr,
    lightingMgr,
    environmentMgr,
    weatherMgr,
    postProcessingMgr,
    gisMgr,
    chunks,
    collisionMgr,
    interiorMgr,
    interactionMgr,
    navigationMgr,
    graphics,
    player,
    cameraCtrl,
    vehicles,
    pedestrians,
    missions,
    timeOfDay: 16.4,
    autoCycle: true,
    stepVisualAtmosphere
  };

  // Immediate instant stream & atmosphere pass for starting RK Beach zone
  chunks.update(player.position.x, player.position.z, camera, true);
  collisionMgr.setStaticBoxes(chunks.getActiveColliders());
  collisionMgr.setFlyoverSurfaces(chunks.getActiveFlyoverSurfaces());
  interiorMgr.update(0.016, player.position.x, player.position.z);
  lightingMgr.setNearbyLampPositions(chunks.getAllLampPositions());
  stepVisualAtmosphere(0.016, true);

  assetManager.loadRiggedPlayerCharacter().then((loadedChar) => {
    if (loadedChar) {
      player.attachRiggedGlb(loadedChar);
    }
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
    camera.updateProjectionMatrix();
    graphics.applyCustomConfig({});
  });

  // Keyboard support (E to interact, F to enter vehicle, WASD/Arrows, Space to jump) for hardware keyboards & emulators
  const keysDown = new Set();
  const syncKeysToInput = () => {
    let kx = 0;
    let ky = 0;
    if (keysDown.has('KeyA') || keysDown.has('ArrowLeft')) kx -= 1;
    if (keysDown.has('KeyD') || keysDown.has('ArrowRight')) kx += 1;
    if (keysDown.has('KeyW') || keysDown.has('ArrowUp')) ky += 1;
    if (keysDown.has('KeyS') || keysDown.has('ArrowDown')) ky -= 1;
    if (kx !== 0 || ky !== 0 || keysDown.size === 0) {
      inputState.joyX = kx;
      inputState.joyY = ky;
    }
    inputState.sprint = keysDown.has('ShiftLeft') || keysDown.has('ShiftRight');
    if (vehicles.drivenVehicle) {
      inputState.throttle = keysDown.has('KeyW') || keysDown.has('ArrowUp') ? 1 : 0;
      inputState.reverse = keysDown.has('KeyS') || keysDown.has('ArrowDown') ? 1 : 0;
      inputState.handbrake = keysDown.has('Space') ? 1 : 0;
    }
  };
  window.addEventListener('keydown', (ev) => {
    if (ev.repeat) return;
    if (ev.code === 'KeyE') {
      window.VizagGame.interact();
      return;
    }
    if (ev.code === 'KeyF') {
      window.VizagGame.toggleVehicle();
      return;
    }
    if (ev.code === 'Space' && !vehicles.drivenVehicle) {
      window.VizagGame.jump();
      return;
    }
    keysDown.add(ev.code);
    syncKeysToInput();
  });
  window.addEventListener('keyup', (ev) => {
    if (keysDown.delete(ev.code)) {
      syncKeysToInput();
    }
  });

  if (window.AndroidBridge && window.AndroidBridge.onEngineReady) {
    window.AndroidBridge.onEngineReady();
  }

  let prevTime = performance.now();
  let lastRenderTime = prevTime;
  let telemetryTimer = 0;
  let frameCounter = 0;
  let fpsTimer = 0;
  let measuredFps = 60;
  let lastLampCount = -1;

  function animate(now) {
    requestAnimationFrame(animate);

    const minFrameMs = graphics.getMinFrameIntervalMs();
    if (minFrameMs > 0 && now - lastRenderTime < minFrameMs) {
      return;
    }
    lastRenderTime = now;

    const dt = Math.min(0.05, Math.max(0.001, (now - prevTime) / 1000));
    prevTime = now;

    frameCounter++;
    fpsTimer += dt;
    if (fpsTimer >= 0.75) {
      measuredFps = Math.min(60, Math.round(frameCounter / fpsTimer));
      frameCounter = 0;
      fpsTimer = 0;
      if (!inputState.paused) {
        graphics.adaptToFrameRate(measuredFps);
      }
    }

    let speedMps = 0;

    if (!inputState.paused) {
      if (engine.autoCycle) {
        engine.timeOfDay = (engine.timeOfDay + dt * 0.025) % 24;
      }

      chunks.update(player.position.x, player.position.z, camera, false);
      collisionMgr.setStaticBoxes(chunks.getActiveColliders());
      collisionMgr.setFlyoverSurfaces(chunks.getActiveFlyoverSurfaces());
      interiorMgr.update(dt, player.position.x, player.position.z);

      const lamps = chunks.getAllLampPositions();
      if (lamps.length !== lastLampCount) {
        lastLampCount = lamps.length;
        lightingMgr.setNearbyLampPositions(lamps);
      }

      player.update(
        dt,
        inputState.joyX,
        inputState.joyY,
        inputState.sprint,
        cameraCtrl.yaw,
        collisionMgr
      );

      vehicles.update(
        dt,
        inputState.joyX,
        inputState.throttle,
        inputState.brake,
        inputState.reverse,
        inputState.handbrake,
        player,
        collisionMgr
      );

      pedestrians.update(dt, player.position.x, player.position.z);

      const inVeh = Boolean(vehicles.drivenVehicle);
      speedMps = inVeh
        ? vehicles.drivenVehicle.speed
        : player.getHorizSpeedMps();

      const wpState = missions.update(
        dt,
        player.position.x,
        player.position.y,
        player.position.z,
        inVeh
      );

      cameraCtrl.update(
        dt,
        player.position,
        inVeh,
        inVeh ? vehicles.drivenVehicle.yaw : player.yaw,
        speedMps,
        inputState.sprint,
        collisionMgr,
        player.isIndoor,
        player.ceilingY
      );

      stepVisualAtmosphere(dt, false);

      const coastDist = Math.max(0, getCoastSignedDistance(player.position.x, player.position.z));
      audio.update(dt, coastDist, Math.abs(speedMps), inVeh, player.grounded, coastDist < 34);

      telemetryTimer += dt;
      if (telemetryTimer >= 0.1 && window.AndroidBridge && window.AndroidBridge.onTelemetry) {
        telemetryTimer = 0;
        const px = player.position.x;
        const pz = player.position.z;
        const geo = worldToLatLng(px, pz);
        const district = getDistrictAt(px, pz);
        const nearestVeh = vehicles.findNearestVehicle(px, pz);

        const detected = interactionMgr.detectCandidate(
          player,
          interiorMgr,
          vehicles,
          pedestrians,
          chunks.getStreetInteractables()
        );
        const navRoute = navigationMgr.computeRoute(px, pz, wpState.wpX, wpState.wpZ);

        const payload = JSON.stringify({
          x: Number(px.toFixed(2)),
          y: Number(player.position.y.toFixed(2)),
          z: Number(pz.toFixed(2)),
          yaw: Number(player.yaw.toFixed(3)),
          lat: Number(geo.lat.toFixed(5)),
          lng: Number(geo.lng.toFixed(5)),
          district: district.name,
          health: player.health,
          stamina: Math.round(player.stamina),
          speedKmh: inVeh ? vehicles.getActiveSpeedKmh() : player.getSpeedKmh(),
          inVehicle: inVeh,
          vehicleName: inVeh ? vehicles.drivenVehicle.name : '',
          vehicleType: inVeh ? vehicles.drivenVehicle.type : '',
          vehicleCondition: inVeh ? vehicles.drivenVehicle.condition : 100,
          nearbyVehicle: nearestVeh.vehicle ? nearestVeh.vehicle.name : '',
          nearbyDist: Number(nearestVeh.distance.toFixed(1)),
          interactHint: detected.hint,
          interiorName: player.interiorName || '',
          floorLabel: player.floorLabel || '',
          isSeated: Boolean(player.isSeated),
          navRoute,
          riggedGlb: player.usingRiggedGlb,
          grounded: player.grounded,
          timeOfDay: Number(engine.timeOfDay.toFixed(2)),
          weather: weatherMgr.weather,
          chunks: chunks.getActiveChunkCount(),
          fps: measuredFps,
          missionIdx: wpState.missionIdx,
          wpX: wpState.wpX,
          wpZ: wpState.wpZ,
          wpLabel: wpState.wpLabel,
          wpDist: wpState.wpDist
        });
        window.AndroidBridge.onTelemetry(payload);
      }
    } else {
      stepVisualAtmosphere(dt * 0.25, false);
    }

    postProcessingMgr.render(
      scene,
      camera,
      dt,
      speedMps,
      latestTimePalette.goldenFactor,
      latestTimePalette.nightFactor,
      latestWeatherParams.lightning
    );
  }

  requestAnimationFrame(animate);
}

bootVizagOpenWorld();
