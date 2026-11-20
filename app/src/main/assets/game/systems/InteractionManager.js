// Reusable Proximity & Look-Direction Interaction System
// Handles hinged doors, sliding/rollup gates, working elevators, chairs/benches, shop counters, switches, NPCs & vehicles.

import { latLngToWorld } from '../data/VizagGeoData.js';

const KURSURA_PT = latLngToWorld(17.7172, 83.3275);
const VICTORY_PT = latLngToWorld(17.7124, 83.3220);
const LIGHTHOUSE_PT = latLngToWorld(17.6775, 83.2948);
const KAILASAGIRI_PT = latLngToWorld(17.7492, 83.3422);

export class InteractionManager {
  constructor() {
    this.currentCandidate = null;
  }

  detectCandidate(player, interiorMgr, vehicleMgr, pedestrianMgr, streetInteractables = []) {
    if (player.inVehicle) {
      this.currentCandidate = null;
      return { hint: '', candidate: null };
    }

    if (player.isSeated) {
      this.currentCandidate = {
        type: 'STAND_UP',
        hint: 'Stand up from seat',
        execute: () => player.standUp()
      };
      return { hint: this.currentCandidate.hint, candidate: this.currentCandidate };
    }

    const px = player.position.x;
    const py = player.position.y;
    const pz = player.position.z;
    const fwdX = Math.sin(player.yaw);
    const fwdZ = Math.cos(player.yaw);

    let bestScore = Infinity;
    let bestCandidate = null;

    const consider = (tx, ty, tz, maxDist, maxDy, type, hint, onExecute, priorityBoost = 0) => {
      const dy = Math.abs(ty - py);
      if (dy > maxDy) return;
      const dx = tx - px;
      const dz = tz - pz;
      const d = Math.hypot(dx, dz);
      if (d > maxDist) return;
      const dot = d > 0.1 ? (dx * fwdX + dz * fwdZ) / d : 1.0;
      const score = d - dot * 1.15 - priorityBoost;
      if (score < bestScore) {
        bestScore = score;
        bestCandidate = { type, hint, execute: onExecute, distance: d };
      }
    };

    if (interiorMgr) {
      const items = interiorMgr.getNearbyInteractables(px, py, pz);
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        consider(
          item.x,
          item.y,
          item.z,
          item.range || 3.1,
          item.maxDy || 2.1,
          item.type,
          item.getPrompt(player),
          () => item.onInteract(player),
          item.priorityBoost || 0.8
        );
      }
    }

    for (let i = 0; i < streetInteractables.length; i++) {
      const st = streetInteractables[i];
      consider(
        st.x,
        st.y,
        st.z,
        st.range || 2.6,
        2.0,
        st.type,
        st.prompt,
        () => st.onInteract(player),
        0.15
      );
    }

    const nearVeh = vehicleMgr ? vehicleMgr.findNearestVehicle(px, pz) : null;
    if (nearVeh && nearVeh.vehicle && nearVeh.distance <= 4.4) {
      consider(
        nearVeh.vehicle.x,
        nearVeh.vehicle.y,
        nearVeh.vehicle.z,
        4.4,
        2.6,
        'VEHICLE',
        `Board ${nearVeh.vehicle.name}`,
        () => vehicleMgr.tryEnterOrExit(player),
        0.45
      );
    }

    const nearNpc = pedestrianMgr ? pedestrianMgr.findNearestNpc(px, pz) : null;
    if (nearNpc && nearNpc.npc && nearNpc.distance <= 4.8) {
      consider(
        nearNpc.npc.x,
        py,
        nearNpc.npc.z,
        4.8,
        2.5,
        'NPC',
        'Talk to Citizen',
        () => ({ message: nearNpc.npc.dialogue, gesture: true }),
        0.3
      );
    }

    consider(
      KURSURA_PT.x,
      py,
      KURSURA_PT.z,
      15.0,
      4.5,
      'LANDMARK',
      'Inspect INS Kursura Submarine',
      () => ({
        message: 'INS Kursura (S20): Foxtrot-class Submarine Museum, RK Beach',
        gesture: true
      }),
      0.0
    );
    consider(
      VICTORY_PT.x,
      py,
      VICTORY_PT.z,
      12.0,
      4.5,
      'LANDMARK',
      'Inspect Victory at Sea Memorial',
      () => ({
        message: 'Victory at Sea Memorial: Dedicated to Eastern Naval Command',
        gesture: true
      }),
      0.0
    );
    consider(
      LIGHTHOUSE_PT.x,
      py,
      LIGHTHOUSE_PT.z,
      12.0,
      5.0,
      'LANDMARK',
      "Inspect Dolphin's Nose Lighthouse",
      () => ({
        message: "Dolphin's Nose Lighthouse (174m Headland): Port Entrance Beacon",
        gesture: true
      }),
      0.0
    );
    consider(
      KAILASAGIRI_PT.x,
      py,
      KAILASAGIRI_PT.z,
      14.0,
      5.0,
      'LANDMARK',
      'Kailasagiri Summit Overlook',
      () => ({
        message: 'Kailasagiri Hilltop Park: Panoramic Bay of Bengal Viewpoint',
        gesture: true
      }),
      0.0
    );

    this.currentCandidate = bestCandidate;
    return {
      hint: bestCandidate ? bestCandidate.hint : '',
      candidate: bestCandidate
    };
  }

  execute(player, vehicleMgr) {
    if (player.inVehicle) return { message: '' };

    if (player.isSeated) {
      player.standUp();
      return { message: 'Stood up from seat' };
    }

    if (this.currentCandidate && this.currentCandidate.execute) {
      const res = this.currentCandidate.execute();
      if (res && res.gesture) {
        player.triggerInteractGesture();
      }
      if (typeof res === 'string') {
        return { message: res };
      }
      return res || { message: this.currentCandidate.hint };
    }

    // Fallback: check slightly larger radius vehicle boarding or show district exploration info
    if (vehicleMgr) {
      const nearVeh = vehicleMgr.findNearestVehicle(player.position.x, player.position.z);
      if (nearVeh.vehicle && nearVeh.distance <= 15.0) {
        return vehicleMgr.tryEnterOrExit(player);
      }
    }

    player.triggerInteractGesture();
    return { message: 'Approach doors, chairs, elevators, NPCs, or vehicles to interact' };
  }
}
