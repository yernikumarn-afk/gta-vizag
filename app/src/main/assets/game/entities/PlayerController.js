// Realistic Human PlayerController with Sculpted Multi-Joint Skeletal Rig + Optional GLB AnimationMixer
// Uses signed coastline distance gradient for Bay of Bengal surf & steep cliff safety.
import { getCoastSignedDistance, getTerrainHeight, latLngToWorld } from '../data/VizagGeoData.js';
import { HumanMeshBuilder } from './HumanMeshBuilder.js';

const RK_SPAWN = latLngToWorld(17.7140, 83.3236);
const KURSURA_PT = latLngToWorld(17.7172, 83.3275);
const INITIAL_YAW = Math.atan2(KURSURA_PT.x - RK_SPAWN.x, KURSURA_PT.z - RK_SPAWN.z);

export class PlayerController {
  constructor(THREE, scene, humanBuilder = null) {
    this.THREE = THREE;
    this.scene = scene;
    this.humanBuilder = humanBuilder || new HumanMeshBuilder(THREE);

    this.position = new THREE.Vector3(RK_SPAWN.x, getTerrainHeight(RK_SPAWN.x, RK_SPAWN.z), RK_SPAWN.z);
    this.velocity = new THREE.Vector3();
    this.yaw = INITIAL_YAW;
    this.radius = 0.46;
    this.grounded = true;
    this.inVehicle = false;
    this.isSeated = false;
    this.standReturnPos = null;
    this.isIndoor = false;
    this.interiorName = '';
    this.floorLabel = '';
    this.ceilingY = Infinity;
    this.health = 100;
    this.stamina = 100;

    this.mixer = null;
    this.actions = {};
    this.activeActionName = '';
    this.usingRiggedGlb = false;
    this.walkPhase = 0;
    this.idlePhase = 0;
    this.interactWaveTimer = 0;

    this.root = new THREE.Group();
    this.root.position.copy(this.position);
    this.root.rotation.y = this.yaw;
    this.scene.add(this.root);

    this._buildAnatomicalRig();
  }

  _buildAnatomicalRig() {
    this.humanRig = this.humanBuilder.createSculptedHuman({
      skinColor: 0xc2835a,
      shirtColor: 0x164e63,
      jacketColor: 0x213247,
      trouserColor: 0x1e293b,
      shoeColor: 0xe2e8f0,
      hairColor: 0x15171c,
      hasJacket: true,
      scale: 1.0
    });
    this.fallbackRig = this.humanRig.root;
    this.root.add(this.fallbackRig);
  }

  attachRiggedGlb(loadedData) {
    if (!loadedData || !loadedData.gltf || !loadedData.gltf.scene) return;
    const THREE = this.THREE;
    const { gltf, facingOffset } = loadedData;

    const model = gltf.scene;
    model.rotation.y = facingOffset || 0;
    model.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });

    const box = new THREE.Box3().setFromObject(model);
    const height = box.max.y - box.min.y;
    if (height > 0.2) {
      const scale = 1.78 / height;
      model.scale.setScalar(scale);
    }

    this.mixer = new THREE.AnimationMixer(model);
    this.actions = {};
    for (const clip of gltf.animations || []) {
      const lower = clip.name.toLowerCase();
      if (lower.includes('idle')) this.actions.idle = this.mixer.clipAction(clip);
      else if (lower.includes('walk')) this.actions.walk = this.mixer.clipAction(clip);
      else if (lower.includes('run')) this.actions.run = this.mixer.clipAction(clip);
    }

    if (this.actions.idle) {
      this._fadeToAction('idle', 0.1);
    }

    this.root.remove(this.fallbackRig);
    this.root.add(model);
    this.usingRiggedGlb = true;
  }

  _fadeToAction(name, duration = 0.22) {
    const nextAction = this.actions[name];
    if (!nextAction || this.activeActionName === name) return;

    const prevAction = this.actions[this.activeActionName];
    this.activeActionName = name;

    nextAction.reset();
    nextAction.enabled = true;
    nextAction.setEffectiveTimeScale(1);
    nextAction.setEffectiveWeight(1);
    if (prevAction) {
      nextAction.crossFadeFrom(prevAction, duration, true);
    }
    nextAction.play();
  }

  jump() {
    if (this.inVehicle) return;
    if (this.isSeated) {
      this.standUp();
      return;
    }
    if (this.grounded) {
      this.velocity.y = 8.2;
      this.grounded = false;
    }
  }

  sitOnSeat(x, seatY, z, seatYaw) {
    if (this.inVehicle) return;
    this.standReturnPos = this.position.clone();
    this.isSeated = true;
    this.grounded = true;
    this.velocity.set(0, 0, 0);
    this.position.set(x, seatY - 0.44, z);
    this.yaw = seatYaw;
    this.root.position.copy(this.position);
    this.root.rotation.y = this.yaw;
  }

  standUp() {
    if (!this.isSeated) return;
    this.isSeated = false;
    if (this.standReturnPos) {
      this.position.copy(this.standReturnPos);
      this.standReturnPos = null;
    } else {
      this.position.x += Math.sin(this.yaw) * 0.65;
      this.position.z += Math.cos(this.yaw) * 0.65;
    }
    this.root.position.copy(this.position);
  }

  triggerInteractGesture() {
    this.interactWaveTimer = 0.9;
  }

  setInVehicle(flag) {
    if (flag && this.isSeated) this.standUp();
    this.inVehicle = flag;
    this.root.visible = !flag;
  }

  teleport(x, z, yaw = this.yaw, overrideY = null) {
    this.isSeated = false;
    const y = overrideY !== null ? overrideY : getTerrainHeight(x, z);
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this.yaw = yaw;
    this.grounded = true;
    this.root.position.copy(this.position);
    this.root.rotation.y = this.yaw;
  }

  _animateSculptedPose(dt, horizSpeed) {
    const rig = this.humanRig;
    if (!rig) return;

    const blend = Math.min(1, dt * 11);
    const lerpAngle = (cur, target) => cur + (target - cur) * blend;

    if (this.isSeated) {
      rig.pelvisJoint.position.y = lerpAngle(rig.pelvisJoint.position.y, 0.56);
      rig.pelvisJoint.rotation.y = lerpAngle(rig.pelvisJoint.rotation.y, 0);
      rig.pelvisJoint.rotation.z = lerpAngle(rig.pelvisJoint.rotation.z, 0);
      rig.spineJoint.rotation.x = lerpAngle(rig.spineJoint.rotation.x, -0.06);
      rig.spineJoint.rotation.y = lerpAngle(rig.spineJoint.rotation.y, 0);
      rig.headJoint.rotation.x = lerpAngle(rig.headJoint.rotation.x, 0.04);
      rig.leftLeg.hipJoint.rotation.x = lerpAngle(rig.leftLeg.hipJoint.rotation.x, -1.35);
      rig.leftLeg.kneeJoint.rotation.x = lerpAngle(rig.leftLeg.kneeJoint.rotation.x, 1.38);
      rig.leftLeg.ankleJoint.rotation.x = lerpAngle(rig.leftLeg.ankleJoint.rotation.x, 0);
      rig.rightLeg.hipJoint.rotation.x = lerpAngle(rig.rightLeg.hipJoint.rotation.x, -1.35);
      rig.rightLeg.kneeJoint.rotation.x = lerpAngle(rig.rightLeg.kneeJoint.rotation.x, 1.38);
      rig.rightLeg.ankleJoint.rotation.x = lerpAngle(rig.rightLeg.ankleJoint.rotation.x, 0);
      rig.leftArm.shoulderJoint.rotation.x = lerpAngle(rig.leftArm.shoulderJoint.rotation.x, -0.45);
      rig.leftArm.elbowJoint.rotation.x = lerpAngle(rig.leftArm.elbowJoint.rotation.x, -0.85);
      rig.rightArm.shoulderJoint.rotation.x = lerpAngle(rig.rightArm.shoulderJoint.rotation.x, -0.45);
      rig.rightArm.elbowJoint.rotation.x = lerpAngle(rig.rightArm.elbowJoint.rotation.x, -0.85);
      return;
    }

    if (!this.grounded) {
      rig.pelvisJoint.position.y = lerpAngle(rig.pelvisJoint.position.y, 0.86);
      rig.pelvisJoint.rotation.x = lerpAngle(rig.pelvisJoint.rotation.x, 0.08);
      rig.spineJoint.rotation.x = lerpAngle(rig.spineJoint.rotation.x, 0.18);
      rig.spineJoint.rotation.y = lerpAngle(rig.spineJoint.rotation.y, 0);
      rig.headJoint.rotation.x = lerpAngle(rig.headJoint.rotation.x, -0.1);

      rig.leftLeg.hipJoint.rotation.x = lerpAngle(rig.leftLeg.hipJoint.rotation.x, -0.58);
      rig.leftLeg.kneeJoint.rotation.x = lerpAngle(rig.leftLeg.kneeJoint.rotation.x, 0.85);
      rig.leftLeg.ankleJoint.rotation.x = lerpAngle(rig.leftLeg.ankleJoint.rotation.x, 0.25);

      rig.rightLeg.hipJoint.rotation.x = lerpAngle(rig.rightLeg.hipJoint.rotation.x, 0.24);
      rig.rightLeg.kneeJoint.rotation.x = lerpAngle(rig.rightLeg.kneeJoint.rotation.x, 0.42);
      rig.rightLeg.ankleJoint.rotation.x = lerpAngle(rig.rightLeg.ankleJoint.rotation.x, 0.15);

      rig.leftArm.shoulderJoint.rotation.x = lerpAngle(rig.leftArm.shoulderJoint.rotation.x, -0.75);
      rig.leftArm.shoulderJoint.rotation.z = lerpAngle(rig.leftArm.shoulderJoint.rotation.z, -0.28);
      rig.leftArm.elbowJoint.rotation.x = lerpAngle(rig.leftArm.elbowJoint.rotation.x, -0.55);

      rig.rightArm.shoulderJoint.rotation.x = lerpAngle(rig.rightArm.shoulderJoint.rotation.x, 0.48);
      rig.rightArm.shoulderJoint.rotation.z = lerpAngle(rig.rightArm.shoulderJoint.rotation.z, 0.28);
      rig.rightArm.elbowJoint.rotation.x = lerpAngle(rig.rightArm.elbowJoint.rotation.x, -0.62);
      return;
    }

    if (horizSpeed > 0.25) {
      const sprintBlend = Math.max(0, Math.min(1, (horizSpeed - 3.6) / 5.5));
      this.walkPhase += dt * (3.8 + horizSpeed * 1.38);

      const sinP = Math.sin(this.walkPhase);
      const cosP = Math.cos(this.walkPhase);

      const strideBob = Math.abs(sinP) * (0.028 + sprintBlend * 0.042);
      rig.pelvisJoint.position.y = 0.88 - (0.02 + sprintBlend * 0.03) + strideBob;
      rig.pelvisJoint.rotation.y = sinP * (0.07 + sprintBlend * 0.06);
      rig.pelvisJoint.rotation.z = cosP * (0.032 + sprintBlend * 0.025);

      rig.spineJoint.rotation.x = 0.05 + sprintBlend * 0.22;
      rig.spineJoint.rotation.y = -sinP * (0.09 + sprintBlend * 0.08);
      rig.headJoint.rotation.x = -(0.04 + sprintBlend * 0.14);
      rig.headJoint.rotation.y = sinP * 0.03;

      const legAmp = 0.44 + sprintBlend * 0.42;
      const leftHip = sinP * legAmp;
      const rightHip = -sinP * legAmp;

      const leftKnee = Math.max(0.06, -cosP * (0.62 + sprintBlend * 0.58) + 0.22);
      const rightKnee = Math.max(0.06, cosP * (0.62 + sprintBlend * 0.58) + 0.22);

      rig.leftLeg.hipJoint.rotation.x = lerpAngle(rig.leftLeg.hipJoint.rotation.x, leftHip);
      rig.leftLeg.kneeJoint.rotation.x = lerpAngle(rig.leftLeg.kneeJoint.rotation.x, leftKnee);
      rig.leftLeg.ankleJoint.rotation.x = lerpAngle(rig.leftLeg.ankleJoint.rotation.x, -leftHip * 0.35 - leftKnee * 0.25);

      rig.rightLeg.hipJoint.rotation.x = lerpAngle(rig.rightLeg.hipJoint.rotation.x, rightHip);
      rig.rightLeg.kneeJoint.rotation.x = lerpAngle(rig.rightLeg.kneeJoint.rotation.x, rightKnee);
      rig.rightLeg.ankleJoint.rotation.x = lerpAngle(rig.rightLeg.ankleJoint.rotation.x, -rightHip * 0.35 - rightKnee * 0.25);

      const armAmp = 0.38 + sprintBlend * 0.46;
      const leftShoulder = -sinP * armAmp;
      const rightShoulder = sinP * armAmp;
      const baseElbow = -0.26 - sprintBlend * 0.72;

      rig.leftArm.shoulderJoint.rotation.x = lerpAngle(rig.leftArm.shoulderJoint.rotation.x, leftShoulder);
      rig.leftArm.shoulderJoint.rotation.z = lerpAngle(rig.leftArm.shoulderJoint.rotation.z, -0.06 - sprintBlend * 0.04);
      rig.leftArm.elbowJoint.rotation.x = lerpAngle(rig.leftArm.elbowJoint.rotation.x, baseElbow - Math.max(0, -leftShoulder) * 0.45);

      rig.rightArm.shoulderJoint.rotation.x = lerpAngle(rig.rightArm.shoulderJoint.rotation.x, rightShoulder);
      rig.rightArm.shoulderJoint.rotation.z = lerpAngle(rig.rightArm.shoulderJoint.rotation.z, 0.06 + sprintBlend * 0.04);
      rig.rightArm.elbowJoint.rotation.x = lerpAngle(rig.rightArm.elbowJoint.rotation.x, baseElbow - Math.max(0, -rightShoulder) * 0.45);
    } else {
      this.idlePhase += dt * 1.8;
      const breath = Math.sin(this.idlePhase);
      const weightShift = Math.sin(this.idlePhase * 0.52);

      rig.pelvisJoint.position.y = lerpAngle(rig.pelvisJoint.position.y, 0.88 + breath * 0.004);
      rig.pelvisJoint.rotation.y = lerpAngle(rig.pelvisJoint.rotation.y, weightShift * 0.04);
      rig.pelvisJoint.rotation.z = lerpAngle(rig.pelvisJoint.rotation.z, weightShift * 0.02);

      rig.spineJoint.rotation.x = lerpAngle(rig.spineJoint.rotation.x, breath * 0.022);
      rig.spineJoint.rotation.y = lerpAngle(rig.spineJoint.rotation.y, -weightShift * 0.03);
      rig.headJoint.rotation.y = lerpAngle(rig.headJoint.rotation.y, Math.sin(this.idlePhase * 0.35) * 0.09);
      rig.headJoint.rotation.x = lerpAngle(rig.headJoint.rotation.x, -breath * 0.015);

      rig.leftLeg.hipJoint.rotation.x = lerpAngle(rig.leftLeg.hipJoint.rotation.x, -0.02);
      rig.leftLeg.kneeJoint.rotation.x = lerpAngle(rig.leftLeg.kneeJoint.rotation.x, 0.05);
      rig.leftLeg.ankleJoint.rotation.x = lerpAngle(rig.leftLeg.ankleJoint.rotation.x, -0.02);

      rig.rightLeg.hipJoint.rotation.x = lerpAngle(rig.rightLeg.hipJoint.rotation.x, 0.03);
      rig.rightLeg.kneeJoint.rotation.x = lerpAngle(rig.rightLeg.kneeJoint.rotation.x, 0.06);
      rig.rightLeg.ankleJoint.rotation.x = lerpAngle(rig.rightLeg.ankleJoint.rotation.x, -0.03);

      rig.leftArm.shoulderJoint.rotation.x = lerpAngle(rig.leftArm.shoulderJoint.rotation.x, 0.03 + breath * 0.018);
      rig.leftArm.shoulderJoint.rotation.z = lerpAngle(rig.leftArm.shoulderJoint.rotation.z, -0.055);
      rig.leftArm.elbowJoint.rotation.x = lerpAngle(rig.leftArm.elbowJoint.rotation.x, -0.16);

      if (this.interactWaveTimer > 0) {
        const wave = Math.sin(this.interactWaveTimer * 14);
        rig.rightArm.shoulderJoint.rotation.x = lerpAngle(rig.rightArm.shoulderJoint.rotation.x, -1.65);
        rig.rightArm.shoulderJoint.rotation.z = lerpAngle(rig.rightArm.shoulderJoint.rotation.z, 0.45 + wave * 0.24);
        rig.rightArm.elbowJoint.rotation.x = lerpAngle(rig.rightArm.elbowJoint.rotation.x, -0.85 + wave * 0.22);
      } else {
        rig.rightArm.shoulderJoint.rotation.x = lerpAngle(rig.rightArm.shoulderJoint.rotation.x, 0.03 - breath * 0.018);
        rig.rightArm.shoulderJoint.rotation.z = lerpAngle(rig.rightArm.shoulderJoint.rotation.z, 0.055);
        rig.rightArm.elbowJoint.rotation.x = lerpAngle(rig.rightArm.elbowJoint.rotation.x, -0.16);
      }
    }
  }

  update(dt, joyX, joyY, isSprinting, cameraYaw, collisionMgr) {
    if (this.inVehicle) return;

    if (this.interactWaveTimer > 0) {
      this.interactWaveTimer = Math.max(0, this.interactWaveTimer - dt);
    }

    const inputMag = Math.min(1.0, Math.hypot(joyX, joyY));
    if (this.isSeated) {
      if (inputMag > 0.65) {
        this.standUp();
      } else {
        this.stamina = Math.min(100, this.stamina + dt * 20.0);
        this._animateSculptedPose(dt, 0, false);
        this.root.position.copy(this.position);
        this.root.rotation.y = this.yaw;
        return;
      }
    }

    const canSprint = isSprinting && inputMag > 0.12 && this.stamina > 2.0;
    if (canSprint) {
      this.stamina = Math.max(0, this.stamina - dt * 16.0);
    } else {
      this.stamina = Math.min(100, this.stamina + dt * 14.0);
    }

    let maxTargetSpeed = 5.4;
    if (canSprint) {
      maxTargetSpeed = 9.6;
    } else if (inputMag < 0.58) {
      maxTargetSpeed = 2.6;
    }

    if (inputMag > 0.05) {
      const localAngle = Math.atan2(joyX, joyY);
      const targetYaw = cameraYaw - localAngle;

      let diff = targetYaw - this.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.yaw += diff * Math.min(1, dt * 10.5);

      const desiredSpeed = isSprinting ? maxTargetSpeed * Math.max(0.75, inputMag) : maxTargetSpeed * inputMag;
      const targetVx = Math.sin(targetYaw) * desiredSpeed;
      const targetVz = Math.cos(targetYaw) * desiredSpeed;

      const accelLerp = Math.min(1, dt * 9.5);
      this.velocity.x += (targetVx - this.velocity.x) * accelLerp;
      this.velocity.z += (targetVz - this.velocity.z) * accelLerp;
    } else {
      const decel = Math.max(0, 1 - dt * 12.0);
      this.velocity.x *= decel;
      this.velocity.z *= decel;
      if (Math.hypot(this.velocity.x, this.velocity.z) < 0.05) {
        this.velocity.x = 0;
        this.velocity.z = 0;
      }
    }

    let nextX = this.position.x + this.velocity.x * dt;
    let nextZ = this.position.z + this.velocity.z * dt;

    // Check bridge / elevated deck height before applying Bay of Bengal shoreline surf guard
    const surfCheck =
      collisionMgr && typeof collisionMgr.getSurfaceInfo === 'function'
        ? collisionMgr.getSurfaceInfo(nextX, this.position.y, nextZ)
        : { groundY: getTerrainHeight(nextX, nextZ), isIndoor: false };

    const onElevatedBridge = surfCheck.groundY > 1.8 && this.position.y > 1.2;
    if (!onElevatedBridge) {
      const coastDist = getCoastSignedDistance(nextX, nextZ);
      if (coastDist < -2.2) {
        const gx = getCoastSignedDistance(nextX + 1.0, nextZ) - getCoastSignedDistance(nextX - 1.0, nextZ);
        const gz = getCoastSignedDistance(nextX, nextZ + 1.0) - getCoastSignedDistance(nextX, nextZ - 1.0);
        const gLen = Math.hypot(gx, gz) || 1;
        const push = -2.2 - coastDist;
        nextX += (gx / gLen) * push;
        nextZ += (gz / gLen) * push;
        this.velocity.x *= 0.2;
        this.velocity.z *= 0.2;
      }
    }

    if (collisionMgr && typeof collisionMgr.resolveCircleXZ === 'function') {
      const resolved = collisionMgr.resolveCircleXZ(nextX, this.position.y, nextZ, this.radius, false);
      nextX = resolved.x;
      nextZ = resolved.z;
    }

    this.position.x = nextX;
    this.position.z = nextZ;

    this.velocity.y -= 21.0 * dt;
    this.position.y += this.velocity.y * dt;

    let groundY = getTerrainHeight(this.position.x, this.position.z);
    this.isIndoor = false;
    this.interiorName = '';
    this.floorLabel = '';
    this.ceilingY = Infinity;

    if (collisionMgr && typeof collisionMgr.getSurfaceInfo === 'function') {
      const surf = collisionMgr.getSurfaceInfo(this.position.x, Math.max(groundY, this.position.y), this.position.z);
      groundY = surf.groundY;
      this.isIndoor = surf.isIndoor;
      this.interiorName = surf.interiorName;
      this.floorLabel = surf.floorLabel;
      this.ceilingY = surf.ceilingY;
    }

    if (this.position.y <= groundY + 0.04) {
      this.position.y = groundY;
      this.velocity.y = 0;
      this.grounded = true;
    } else if (this.grounded && this.velocity.y <= 0 && this.position.y - groundY < 0.35) {
      this.position.y = groundY;
      this.velocity.y = 0;
    } else {
      this.grounded = false;
    }

    const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);

    if (this.usingRiggedGlb && this.mixer) {
      if (horizSpeed < 0.25) {
        this._fadeToAction('idle', 0.22);
      } else if (horizSpeed < 3.6 && this.actions.walk) {
        this._fadeToAction('walk', 0.20);
        this.actions.walk.timeScale = Math.max(0.8, horizSpeed / 2.4);
      } else if (this.actions.run) {
        this._fadeToAction('run', 0.20);
        this.actions.run.timeScale = isSprinting ? 1.32 : 1.0;
      }
      this.mixer.update(dt);
    } else {
      this._animateSculptedPose(dt, horizSpeed);
    }

    this.root.position.copy(this.position);
    this.root.rotation.y = this.yaw;
  }

  getHorizSpeedMps() {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  getSpeedKmh() {
    return Math.round(this.getHorizSpeedMps() * 3.6);
  }
}
