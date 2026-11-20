// Dedicated Third-Person Orbital & Vehicle Chase Camera Controller with Wall/Terrain Collision Avoidance
import { getTerrainHeight } from '../data/VizagGeoData.js';

export class CameraController {
  constructor(THREE, camera) {
    this.THREE = THREE;
    this.camera = camera;
    this.yaw = Math.PI; // Facing North up RK Beach Road
    this.pitch = 0.25;
    this.currentPos = new THREE.Vector3(4, 4.5, 21);
    this.currentLook = new THREE.Vector3(4, 1.65, 14);
  }

  addDelta(dx, dy) {
    this.yaw -= Number(dx) || 0;
    this.pitch = Math.max(0.04, Math.min(1.02, this.pitch + (Number(dy) || 0)));
  }

  snapBehind(x, y, z, headingYaw) {
    this.yaw = headingYaw;
    this.currentPos.set(x - Math.sin(this.yaw) * 5.8, y + 2.8, z - Math.cos(this.yaw) * 5.8);
    this.currentLook.set(x, y + 1.55, z);
  }

  update(dt, targetPos, inVehicle, vehicleYaw, speedMps, isSprinting, collidersOrMgr, isIndoor = false, ceilingY = Infinity) {
    const THREE = this.THREE;
    const colliders =
      collidersOrMgr && typeof collidersOrMgr.getAllRayColliders === 'function'
        ? collidersOrMgr.getAllRayColliders()
        : collidersOrMgr || [];

    if (inVehicle && Math.abs(speedMps) > 1.4) {
      let diff = vehicleYaw - this.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.yaw += diff * Math.min(1, dt * 3.0);
    }

    const targetFov = inVehicle
      ? 60 + Math.min(12, Math.abs(speedMps) * 0.38)
      : (isIndoor ? 66 : (isSprinting && speedMps > 5 ? 65 : 60));
    if (Math.abs(this.camera.fov - targetFov) > 0.15) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 6);
      this.camera.updateProjectionMatrix();
    }

    const baseDist = inVehicle ? 8.6 : (isIndoor ? 2.65 : 5.4);
    const lookHeight = inVehicle ? 1.42 : (isIndoor ? 1.48 : 1.56);
    const shoulderOffset = inVehicle ? 0.0 : (isIndoor ? 0.24 : 0.34);

    const rightX = -Math.cos(this.yaw) * shoulderOffset;
    const rightZ = Math.sin(this.yaw) * shoulderOffset;

    const focusX = targetPos.x + rightX;
    const focusY = targetPos.y + lookHeight;
    const focusZ = targetPos.z + rightZ;

    const clampedPitch = isIndoor ? Math.min(0.42, this.pitch) : this.pitch;
    const horizDist = Math.cos(clampedPitch) * baseDist;
    const vertDist = Math.sin(clampedPitch) * baseDist;

    const rayDirX = -Math.sin(this.yaw) * horizDist;
    const rayDirZ = -Math.cos(this.yaw) * horizDist;

    // Step along camera boom using 3D minY..maxY wall boxes to prevent interior/exterior wall clipping
    let safeFraction = 1.0;
    for (let s = 0.22; s <= 1.0; s += 0.13) {
      const testX = focusX + rayDirX * s;
      const testY = focusY + vertDist * s;
      const testZ = focusZ + rayDirZ * s;
      let hit = false;
      for (let i = 0; i < colliders.length; i++) {
        const b = colliders[i];
        const bMinY = b.minY !== undefined ? b.minY : -10;
        const bMaxY = b.maxY !== undefined ? b.maxY : 500;
        if (
          testY >= bMinY &&
          testY <= bMaxY &&
          testX > b.minX - 0.28 &&
          testX < b.maxX + 0.28 &&
          testZ > b.minZ - 0.28 &&
          testZ < b.maxZ + 0.28
        ) {
          hit = true;
          break;
        }
      }
      if (hit) {
        safeFraction = Math.max(0.24, s - 0.13);
        break;
      }
    }

    const desiredX = focusX + rayDirX * safeFraction;
    const desiredZ = focusZ + rayDirZ * safeFraction;
    const minGroundY = getTerrainHeight(desiredX, desiredZ) + 0.65;
    let desiredY = Math.max(minGroundY, focusY + vertDist * safeFraction);
    if (isIndoor && ceilingY < Infinity) {
      desiredY = Math.min(desiredY, ceilingY - 0.45);
    }

    this.currentPos.lerp(new THREE.Vector3(desiredX, desiredY, desiredZ), Math.min(1, dt * 14));
    this.currentLook.lerp(new THREE.Vector3(focusX, focusY, focusZ), Math.min(1, dt * 18));

    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLook);
  }
}
