// Unified 3D Collision & Multi-Floor Walkable Surface System
// Handles 3D AABB wall/obstacle colliders (minY..maxY), animated door/gate colliders,
// walkable floors, sloped 3D staircases, balconies, elevators, and elevated flyover decks.
import { getTerrainHeight } from '../data/VizagGeoData.js';

export class CollisionManager {
  constructor() {
    this.staticBoxes = [];
    this.interiorBoxes = [];
    this.interiorSurfaces = [];
    this.flyoverSurfaces = [];
    this.dynamicDoors = []; // { minX, maxX, minZ, maxZ, minY, maxY, enabled, blocksVehicle }
  }

  setStaticBoxes(boxes) {
    this.staticBoxes = boxes || [];
  }

  setFlyoverSurfaces(surfaces) {
    this.flyoverSurfaces = surfaces || [];
  }

  setInteriorCollisions(boxes, surfaces, dynamicDoors) {
    this.interiorBoxes = boxes || [];
    this.interiorSurfaces = surfaces || [];
    this.dynamicDoors = dynamicDoors || [];
  }

  // Computes highest valid walkable surface Y at (x, z) reachable from current feet height curY
  getSurfaceInfo(x, curY, z) {
    let bestY = getTerrainHeight(x, z);
    let ceilingY = Infinity;
    let isIndoor = false;
    let interiorName = '';
    let floorLabel = '';

    const checkSurfaceList = (list) => {
      for (let i = 0; i < list.length; i++) {
        const s = list[i];
        if (x < s.minX || x > s.maxX || z < s.minZ || z > s.maxZ) continue;
        const sy = typeof s.getY === 'function' ? s.getY(x, z) : s.y;
        // Walkable if surface is at or within step-up height (0.78m) of current feet
        if (sy <= curY + 0.78 && sy >= bestY - 0.05) {
          if (sy >= bestY) {
            bestY = sy;
            if (s.isIndoor) {
              isIndoor = true;
              interiorName = s.interiorName || interiorName;
              floorLabel = s.floorLabel || floorLabel;
            }
          }
        }
        // Overhead slab detection for indoor camera height clamping
        if (s.isRoofOrUpperFloor && sy > curY + 1.45 && sy < ceilingY) {
          ceilingY = sy;
          if (s.isIndoor) {
            isIndoor = true;
            interiorName = s.interiorName || interiorName;
          }
        }
      }
    };

    checkSurfaceList(this.flyoverSurfaces);
    checkSurfaceList(this.interiorSurfaces);

    return {
      groundY: bestY,
      ceilingY,
      isIndoor,
      interiorName,
      floorLabel
    };
  }

  // Resolves 2D circle vs 3D vertical-slice AABB colliders cleanly across multiple building floors
  resolveCircleXZ(x, y, z, radius, isVehicle = false) {
    let nx = x;
    let nz = z;
    let collided = false;
    const bodyBottom = y + (isVehicle ? 0.35 : 0.34);
    const bodyTop = y + (isVehicle ? 1.85 : 1.72);

    const resolveBox = (box) => {
      if (box.enabled === false) return;
      if (isVehicle && box.blocksVehicle === false) return;
      const bMinY = box.minY !== undefined ? box.minY : -20;
      const bMaxY = box.maxY !== undefined ? box.maxY : 500;
      if (bodyTop < bMinY || bodyBottom > bMaxY) return;

      const cx = Math.max(box.minX, Math.min(nx, box.maxX));
      const cz = Math.max(box.minZ, Math.min(nz, box.maxZ));
      const dx = nx - cx;
      const dz = nz - cz;
      const distSq = dx * dx + dz * dz;
      if (distSq < radius * radius) {
        const dist = Math.sqrt(distSq);
        if (dist > 0.0001) {
          const pen = radius - dist;
          nx += (dx / dist) * pen;
          nz += (dz / dist) * pen;
        } else {
          // Embedded deeply: push toward shallowest AABB face
          const dLeft = Math.abs(nx - box.minX);
          const dRight = Math.abs(box.maxX - nx);
          const dTop = Math.abs(nz - box.minZ);
          const dBottom = Math.abs(box.maxZ - nz);
          const m = Math.min(dLeft, dRight, dTop, dBottom);
          if (m === dLeft) nx = box.minX - radius;
          else if (m === dRight) nx = box.maxX + radius;
          else if (m === dTop) nz = box.minZ - radius;
          else nz = box.maxZ + radius;
        }
        collided = true;
      }
    };

    for (let i = 0; i < this.staticBoxes.length; i++) resolveBox(this.staticBoxes[i]);
    for (let i = 0; i < this.interiorBoxes.length; i++) resolveBox(this.interiorBoxes[i]);
    for (let i = 0; i < this.dynamicDoors.length; i++) resolveBox(this.dynamicDoors[i]);

    return { x: nx, z: nz, collided };
  }

  getAllRayColliders() {
    const out = [];
    for (let i = 0; i < this.staticBoxes.length; i++) out.push(this.staticBoxes[i]);
    for (let i = 0; i < this.interiorBoxes.length; i++) out.push(this.interiorBoxes[i]);
    for (let i = 0; i < this.dynamicDoors.length; i++) {
      if (this.dynamicDoors[i].enabled !== false) out.push(this.dynamicDoors[i]);
    }
    return out;
  }
}
