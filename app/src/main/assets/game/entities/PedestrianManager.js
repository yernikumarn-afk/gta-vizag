// PedestrianManager: Diverse Sculpted Vizag Citizens along projected RK Beach Promenade & Siripuram
import { getTerrainHeight, latLngToWorld } from '../data/VizagGeoData.js';
import { HumanMeshBuilder } from './HumanMeshBuilder.js';

const NPC_DIALOGUES = [
  'RK Beach Vendor: "Fresh roasted corn & filter coffee right by Kursura!"',
  'Vizag Jogger: "Morning sea breeze off the Bay of Bengal is unbeatable today."',
  'Tour Guide: "INS Kursura S20 served 31 years before becoming South Asia\'s first submarine museum."',
  'Commuter: "Take Beach Road north past Kailasagiri if you\'re heading to Rushikonda!"',
  'Traffic Warden: "Cross harbor channel on the bridge south of Port to reach Dolphin\'s Nose."'
];

const RK_PROM_A = latLngToWorld(17.7112, 83.3210);
const RK_PROM_B = latLngToWorld(17.7202, 83.3310);
const SIRI_A = latLngToWorld(17.7215, 83.3132);
const SIRI_B = latLngToWorld(17.7238, 83.3175);

export class PedestrianManager {
  constructor(THREE, scene, humanBuilder = null) {
    this.THREE = THREE;
    this.scene = scene;
    this.humanBuilder = humanBuilder || new HumanMeshBuilder(THREE);
    this.pedestrians = [];
    this._spawnPromenadePedestrians();
  }

  _spawnPromenadePedestrians() {
    const skinTones = [0xc98b63, 0x9f6642, 0xb87b53, 0xd49a73, 0x8a5435];
    const shirtColors = [0x1d4ed8, 0xd97706, 0x059669, 0x7c3aed, 0xdc2626, 0x0e7490, 0xf1f5f9, 0xbe185d];
    const jacketColors = [0x1e293b, 0x3b2f2f, 0x0f3b4a, 0x43284b, 0x293241];
    const trouserColors = [0x1e293b, 0x2a2420, 0x334155, 0x172554, 0x3f3f46];
    const hairColors = [0x141418, 0x261d18, 0x101216, 0x3a2e28];

    for (let i = 0; i < 22; i++) {
      const hasJacket = i % 3 === 0;
      const heightScale = 0.94 + (i % 5) * 0.028;

      const rig = this.humanBuilder.createSculptedHuman({
        skinColor: skinTones[i % skinTones.length],
        shirtColor: shirtColors[i % shirtColors.length],
        jacketColor: jacketColors[i % jacketColors.length],
        trouserColor: trouserColors[i % trouserColors.length],
        shoeColor: i % 2 === 0 ? 0xe2e8f0 : 0x27272a,
        hairColor: hairColors[i % hairColors.length],
        hasJacket,
        scale: heightScale
      });

      const isSiripuram = i >= 16;
      const segA = isSiripuram ? SIRI_A : RK_PROM_A;
      const segB = isSiripuram ? SIRI_B : RK_PROM_B;
      const dx = segB.x - segA.x;
      const dz = segB.z - segA.z;
      const segLen = Math.hypot(dx, dz) || 1;
      const segYaw = Math.atan2(dx, dz);
      const sideOffset = ((i % 4) - 1.5) * 1.4;
      const ox = Math.cos(segYaw) * sideOffset;
      const oz = -Math.sin(segYaw) * sideOffset;

      const t = ((i * 0.17) % 0.86) + 0.07;
      const startX = segA.x + dx * t + ox;
      const startZ = segA.z + dz * t + oz;
      const dir = i % 2 === 0 ? 1 : -1;

      rig.root.position.set(startX, getTerrainHeight(startX, startZ), startZ);
      this.scene.add(rig.root);

      this.pedestrians.push({
        rig,
        group: rig.root,
        aX: segA.x + ox,
        aZ: segA.z + oz,
        dx,
        dz,
        segLen,
        segYaw,
        t,
        x: startX,
        z: startZ,
        dir,
        speed: 1.2 + (i % 4) * 0.22,
        phase: i * 1.35,
        dialogue: NPC_DIALOGUES[i % NPC_DIALOGUES.length]
      });
    }
  }

  findNearestNpc(px, pz) {
    let best = null;
    let bestDist = Infinity;
    for (const p of this.pedestrians) {
      const d = Math.hypot(p.x - px, p.z - pz);
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    return { npc: best, distance: bestDist };
  }

  scareNearby(px, pz) {
    for (const p of this.pedestrians) {
      if (Math.hypot(p.x - px, p.z - pz) < 15) {
        p.speed = 3.1;
      }
    }
  }

  update(dt, playerX, playerZ) {
    for (const p of this.pedestrians) {
      const distToPlayer = Math.hypot(p.x - playerX, p.z - playerZ);
      p.group.visible = distToPlayer < 165;
      if (!p.group.visible) continue;

      const { pelvisJoint, spineJoint, headJoint, leftArm, rightArm, leftLeg, rightLeg } = p.rig;

      if (p.speed > 1.7) {
        p.speed = Math.max(1.4, p.speed - dt * 0.55);
      }

      if (distToPlayer < 2.4) {
        p.phase += dt * 1.6;
        const breath = Math.sin(p.phase);
        pelvisJoint.position.y = 0.88 + breath * 0.004;
        pelvisJoint.rotation.y *= 0.85;
        spineJoint.rotation.x = breath * 0.02;
        spineJoint.rotation.y *= 0.85;
        leftLeg.hipJoint.rotation.x *= 0.82;
        leftLeg.kneeJoint.rotation.x *= 0.82;
        rightLeg.hipJoint.rotation.x *= 0.82;
        rightLeg.kneeJoint.rotation.x *= 0.82;
        leftArm.shoulderJoint.rotation.x *= 0.82;
        leftArm.elbowJoint.rotation.x = -0.18;
        rightArm.shoulderJoint.rotation.x *= 0.82;
        rightArm.elbowJoint.rotation.x = -0.22;

        p.group.rotation.y = Math.atan2(playerX - p.x, playerZ - p.z);
        continue;
      }

      p.t += (p.dir * p.speed * dt) / p.segLen;
      if (p.t > 0.96) {
        p.t = 0.96;
        p.dir = -1;
      } else if (p.t < 0.04) {
        p.t = 0.04;
        p.dir = 1;
      }

      p.x = p.aX + p.dx * p.t;
      p.z = p.aZ + p.dz * p.t;
      const y = getTerrainHeight(p.x, p.z);
      p.group.position.set(p.x, y, p.z);
      p.group.rotation.y = p.dir > 0 ? p.segYaw : p.segYaw + Math.PI;

      p.phase += dt * p.speed * 4.1;
      const sinP = Math.sin(p.phase);
      const cosP = Math.cos(p.phase);
      const jogging = p.speed > 2.2;
      const legAmp = jogging ? 0.65 : 0.42;

      pelvisJoint.position.y = 0.86 + Math.abs(sinP) * 0.026;
      pelvisJoint.rotation.y = sinP * 0.06;
      spineJoint.rotation.x = jogging ? 0.14 : 0.04;
      spineJoint.rotation.y = -sinP * 0.07;

      const lHip = sinP * legAmp;
      const rHip = -sinP * legAmp;
      const lKnee = Math.max(0.05, -cosP * (jogging ? 0.85 : 0.55) + 0.18);
      const rKnee = Math.max(0.05, cosP * (jogging ? 0.85 : 0.55) + 0.18);

      leftLeg.hipJoint.rotation.x = lHip;
      leftLeg.kneeJoint.rotation.x = lKnee;
      leftLeg.ankleJoint.rotation.x = -lHip * 0.3;

      rightLeg.hipJoint.rotation.x = rHip;
      rightLeg.kneeJoint.rotation.x = rKnee;
      rightLeg.ankleJoint.rotation.x = -rHip * 0.3;

      const armAmp = jogging ? 0.62 : 0.34;
      leftArm.shoulderJoint.rotation.x = -sinP * armAmp;
      leftArm.elbowJoint.rotation.x = jogging ? -0.75 : -0.22;
      rightArm.shoulderJoint.rotation.x = sinP * armAmp;
      rightArm.elbowJoint.rotation.x = jogging ? -0.75 : -0.22;

      headJoint.rotation.y = sinP * 0.03;
    }
  }
}
