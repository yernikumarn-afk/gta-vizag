// Open-World Mission & GPS Waypoint Beacon System for Visakhapatnam Prototype
import { getTerrainHeight, latLngToWorld } from '../data/VizagGeoData.js';

const RAW_MISSIONS = [
  {
    index: 0,
    title: '1. Kursura Recon',
    lat: 17.7170,
    lng: 83.3266,
    reward: 1500,
    requiresVehicle: false
  },
  {
    index: 1,
    title: '2. Beach Road Ignition',
    lat: 17.7235,
    lng: 83.3322,
    reward: 2500,
    requiresVehicle: true
  },
  {
    index: 2,
    title: '3. Siripuram VIP Sprint',
    lat: 17.7224,
    lng: 83.3150,
    reward: 3500,
    requiresVehicle: false
  },
  {
    index: 3,
    title: '4. Kailasagiri Summit',
    lat: 17.7492,
    lng: 83.3422,
    reward: 5000,
    requiresVehicle: false
  },
  {
    index: 4,
    title: '5. Harbor Container Run',
    lat: 17.6945,
    lng: 83.2915,
    reward: 7500,
    requiresVehicle: true
  }
];

export const MISSIONS = RAW_MISSIONS.map((m) => {
  const p = latLngToWorld(m.lat, m.lng);
  return { ...m, x: p.x, z: p.z };
});

export class MissionSystem {
  constructor(THREE, scene, onMissionCompleted) {
    this.THREE = THREE;
    this.scene = scene;
    this.onMissionCompleted = onMissionCompleted;

    this.activeMissionIndex = 0;
    this.customWaypoint = null; // { x, z, label }
    this.pulseTime = 0;

    this._buildBeaconVisuals();
    this.setMission(0);
  }

  _buildBeaconVisuals() {
    const THREE = this.THREE;
    this.beaconGroup = new THREE.Group();

    // Glowing translucent GTA-style golden/cyan objective cylinder
    this.beamMat = new THREE.MeshBasicMaterial({
      color: 0xff9e2c,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 24, 20, 1, true), this.beamMat);
    beam.position.y = 12;
    this.beaconGroup.add(beam);

    // Pulsing ground target ring
    this.ringMat = new THREE.MeshBasicMaterial({
      color: 0xffc857,
      side: THREE.DoubleSide
    });
    this.ringMesh = new THREE.Mesh(new THREE.RingGeometry(2.8, 3.6, 28), this.ringMat);
    this.ringMesh.rotation.x = -Math.PI / 2;
    this.ringMesh.position.y = 0.22;
    this.beaconGroup.add(this.ringMesh);

    this.scene.add(this.beaconGroup);

    // Floating directional GPS chevron above player pointing toward active waypoint
    const arrowGeo = new THREE.ConeGeometry(0.32, 0.9, 4);
    arrowGeo.rotateX(Math.PI / 2);
    this.gpsArrow = new THREE.Mesh(
      arrowGeo,
      new THREE.MeshBasicMaterial({ color: 0x00d2d3 })
    );
    this.scene.add(this.gpsArrow);
  }

  setMission(index) {
    const safeIdx = ((index % MISSIONS.length) + MISSIONS.length) % MISSIONS.length;
    this.activeMissionIndex = safeIdx;
    this.customWaypoint = null;
    this.beamMat.color.setHex(0xff9e2c);
    this.ringMat.color.setHex(0xffc857);
    this._syncBeaconPosition();
  }

  setCustomWaypoint(x, z, label) {
    this.customWaypoint = { x, z, label };
    this.beamMat.color.setHex(0x00d2d3);
    this.ringMat.color.setHex(0x00d2d3);
    this._syncBeaconPosition();
  }

  _syncBeaconPosition() {
    const target = this.getCurrentTarget();
    const y = getTerrainHeight(target.x, target.z);
    this.beaconGroup.position.set(target.x, y, target.z);
  }

  getCurrentTarget() {
    if (this.customWaypoint) {
      return this.customWaypoint;
    }
    const m = MISSIONS[this.activeMissionIndex];
    return { x: m.x, z: m.z, label: m.title, mission: m };
  }

  update(dt, playerX, playerY, playerZ, inVehicle) {
    this.pulseTime += dt;
    const scale = 1.0 + Math.sin(this.pulseTime * 4.0) * 0.1;
    this.ringMesh.scale.set(scale, scale, 1);

    const target = this.getCurrentTarget();
    const dx = target.x - playerX;
    const dz = target.z - playerZ;
    const dist = Math.hypot(dx, dz);

    // Position floating GPS compass chevron slightly ahead/above player
    this.gpsArrow.position.set(playerX, playerY + 2.65, playerZ);
    this.gpsArrow.rotation.y = Math.atan2(dx, dz);
    this.gpsArrow.visible = dist > 7.5;

    // Check arrival trigger
    if (dist < 6.2) {
      if (this.customWaypoint) {
        this.customWaypoint = null;
        this.beamMat.color.setHex(0xff9e2c);
        this.ringMat.color.setHex(0xffc857);
        this._syncBeaconPosition();
      } else {
        const m = MISSIONS[this.activeMissionIndex];
        if (!m.requiresVehicle || inVehicle) {
          const completedIdx = m.index;
          const reward = m.reward;
          const nextIdx = (completedIdx + 1) % MISSIONS.length;
          this.setMission(nextIdx);
          if (this.onMissionCompleted) {
            this.onMissionCompleted(completedIdx, reward);
          }
        }
      }
    }

    return {
      missionIdx: this.activeMissionIndex,
      wpX: target.x,
      wpZ: target.z,
      wpLabel: target.label,
      wpDist: Math.round(dist)
    };
  }
}
