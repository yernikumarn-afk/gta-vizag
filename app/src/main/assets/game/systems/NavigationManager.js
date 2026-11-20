// Road-Graph Shortest-Path GPS Navigation Manager for Visakhapatnam
// Computes connected road-network Dijkstra routes and renders subtle 3D road-guide ribbon ahead of player.
import { getActiveRoadSegments, getTerrainHeight } from '../data/VizagGeoData.js';

export class NavigationManager {
  constructor(THREE, scene) {
    this.THREE = THREE;
    this.scene = scene;
    this.nodes = [];
    this.adj = [];
    this.routePoints = [];
    this.lastCalcKey = '';
    this.routeLine = null;

    this._buildRoadGraph();
    this._initRouteVisual();
  }

  rebuildRoadGraph() {
    this.nodes = [];
    this.adj = [];
    this.lastCalcKey = '';
    this._buildRoadGraph();
  }

  rebuildGraph() {
    this.rebuildRoadGraph();
  }

  _addOrFindNode(x, z, tol = 2.0) {
    for (let i = 0; i < this.nodes.length; i++) {
      if (Math.hypot(this.nodes[i].x - x, this.nodes[i].z - z) < tol) {
        return i;
      }
    }
    const idx = this.nodes.length;
    this.nodes.push({ x, z });
    this.adj.push([]);
    return idx;
  }

  _buildRoadGraph() {
    const roadSegments = getActiveRoadSegments();
    const candidatePts = [];
    for (const seg of roadSegments) {
      candidatePts.push({ x: seg.x1, z: seg.z1 });
      candidatePts.push({ x: seg.x2, z: seg.z2 });
    }
    for (const pt of candidatePts) {
      this._addOrFindNode(pt.x, pt.z, 2.5);
    }

    for (const seg of roadSegments) {
      const vx = seg.x2 - seg.x1;
      const vz = seg.z2 - seg.z1;
      const lenSq = vx * vx + vz * vz;
      if (lenSq < 1) continue;

      const onSeg = [];
      for (let i = 0; i < this.nodes.length; i++) {
        const n = this.nodes[i];
        const t = Math.max(0, Math.min(1, ((n.x - seg.x1) * vx + (n.z - seg.z1) * vz) / lenSq));
        const px = seg.x1 + vx * t;
        const pz = seg.z1 + vz * t;
        if (Math.hypot(n.x - px, n.z - pz) < 3.5) {
          onSeg.push({ idx: i, t });
        }
      }
      onSeg.sort((a, b) => a.t - b.t);

      for (let k = 0; k < onSeg.length - 1; k++) {
        const u = onSeg[k].idx;
        const v = onSeg[k + 1].idx;
        if (u === v) continue;
        const w = Math.hypot(this.nodes[u].x - this.nodes[v].x, this.nodes[u].z - this.nodes[v].z);
        if (!this.adj[u].some((e) => e.to === v)) {
          this.adj[u].push({ to: v, w });
        }
        if (!this.adj[v].some((e) => e.to === u)) {
          this.adj[v].push({ to: u, w });
        }
      }
    }
  }

  _initRouteVisual() {
    const THREE = this.THREE;
    const mat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.72
    });
    const geo = new THREE.BufferGeometry();
    this.routeLine = new THREE.Line(geo, mat);
    this.routeLine.frustumCulled = false;
    this.routeLine.visible = false;
    this.scene.add(this.routeLine);
  }

  _findClosestNode(x, z) {
    if (this.nodes.length === 0) return -1;
    let bestIdx = 0;
    let bestD = Infinity;
    for (let i = 0; i < this.nodes.length; i++) {
      const d = Math.hypot(this.nodes[i].x - x, this.nodes[i].z - z);
      if (d < bestD) {
        bestD = d;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  computeRoute(startX, startZ, targetX, targetZ) {
    const key = `${Math.round(startX / 12)},${Math.round(startZ / 12)}->${Math.round(targetX)},${Math.round(targetZ)}`;
    if (key === this.lastCalcKey && this.routePoints.length > 0) {
      return this.routePoints;
    }
    this.lastCalcKey = key;

    const totalDirect = Math.hypot(targetX - startX, targetZ - startZ);
    if (totalDirect < 22 || this.nodes.length === 0) {
      this.routePoints = [
        { x: Math.round(startX), z: Math.round(startZ) },
        { x: Math.round(targetX), z: Math.round(targetZ) }
      ];
      this._updateRouteVisual();
      return this.routePoints;
    }

    const sIdx = this._findClosestNode(startX, startZ);
    const eIdx = this._findClosestNode(targetX, targetZ);

    const n = this.nodes.length;
    const dist = new Float64Array(n).fill(Infinity);
    const prev = new Int32Array(n).fill(-1);
    const visited = new Uint8Array(n);
    dist[sIdx] = 0;

    for (let iter = 0; iter < n; iter++) {
      let u = -1;
      let best = Infinity;
      for (let i = 0; i < n; i++) {
        if (!visited[i] && dist[i] < best) {
          best = dist[i];
          u = i;
        }
      }
      if (u === -1 || u === eIdx || best === Infinity) break;
      visited[u] = 1;

      const edges = this.adj[u];
      for (let k = 0; k < edges.length; k++) {
        const edge = edges[k];
        const alt = best + edge.w;
        if (alt < dist[edge.to]) {
          dist[edge.to] = alt;
          prev[edge.to] = u;
        }
      }
    }

    const path = [{ x: Math.round(startX), z: Math.round(startZ) }];
    const chain = [];
    let cur = eIdx;
    while (cur !== -1) {
      chain.push(this.nodes[cur]);
      if (cur === sIdx) break;
      cur = prev[cur];
    }
    chain.reverse();
    for (let i = 0; i < chain.length; i++) {
      path.push({ x: Math.round(chain[i].x), z: Math.round(chain[i].z) });
    }
    path.push({ x: Math.round(targetX), z: Math.round(targetZ) });

    // Downsample evenly up to 14 waypoints so long Rushikonda/Port routes stay smooth
    if (path.length > 14) {
      const sampled = [path[0]];
      const step = (path.length - 1) / 13;
      for (let k = 1; k < 13; k++) {
        sampled.push(path[Math.round(k * step)]);
      }
      sampled.push(path[path.length - 1]);
      this.routePoints = sampled;
    } else {
      this.routePoints = path;
    }
    this._updateRouteVisual();
    return this.routePoints;
  }

  _updateRouteVisual() {
    if (!this.routeLine || this.routePoints.length < 2) return;
    const THREE = this.THREE;
    const verts = [];
    for (let i = 0; i < this.routePoints.length - 1; i++) {
      const a = this.routePoints[i];
      const b = this.routePoints[i + 1];
      const steps = Math.max(1, Math.min(8, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 28)));
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        const px = a.x + (b.x - a.x) * t;
        const pz = a.z + (b.z - a.z) * t;
        verts.push(px, getTerrainHeight(px, pz) + 0.34, pz);
      }
    }
    const last = this.routePoints[this.routePoints.length - 1];
    verts.push(last.x, getTerrainHeight(last.x, last.z) + 0.34, last.z);

    this.routeLine.geometry.dispose();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    this.routeLine.geometry = g;
    this.routeLine.visible = true;
  }
}
