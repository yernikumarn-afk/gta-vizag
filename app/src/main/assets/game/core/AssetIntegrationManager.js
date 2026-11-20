// Honest GLB/GLTF Asset Integration System & Missing-Asset Manifest Tracker
// Loads real rigged GLB assets where available and transparently tracks missing custom GLB packs.

export class AssetIntegrationManager {
  constructor(THREE, GLTFLoaderClass, onManifestUpdated) {
    this.THREE = THREE;
    this.loader = GLTFLoaderClass ? new GLTFLoaderClass() : null;
    this.onManifestUpdated = onManifestUpdated;

    this.manifest = [
      {
        id: 'player_rigged_human',
        title: 'Rigged Human Character (Idle / Walk / Run)',
        localPath: 'assets/game/models/player_arjun.glb',
        remoteUrl: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r169/examples/models/gltf/Soldier.glb',
        backupUrl: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r169/examples/models/gltf/Xbot.glb',
        status: 'LOADING',
        detail: 'Fetching rigged SkinnedMesh GLB & skeletal AnimationClips'
      },
      {
        id: 'ins_kursura_submarine',
        title: 'INS Kursura S20 Submarine Museum',
        localPath: 'assets/game/models/ins_kursura_s20.glb',
        remoteUrl: null,
        status: 'MISSING_CUSTOM_GLB',
        detail: 'Optional custom GLB slot; using multi-part naval hull, sail hydroplanes & twin bronze props'
      },
      {
        id: 'vizag_coastal_buildings',
        title: 'Visakhapatnam Indian Apartments & Shops Pack',
        localPath: 'assets/game/models/vizag_buildings_pack.glb',
        remoteUrl: null,
        status: 'MISSING_CUSTOM_GLB',
        detail: 'Optional custom GLB slot; using 4-style 3D colonnade, recessed glass & balcony LOD builder'
      },
      {
        id: 'indian_vehicles_pack',
        title: 'Indian Cars, Bikes, Autos & APSRTC Bus GLBs',
        localPath: 'assets/game/models/vizag_vehicles_pack.glb',
        remoteUrl: null,
        status: 'MISSING_CUSTOM_GLB',
        detail: 'Optional custom GLB slot; using ExtrudeGeometry cars with 3D interiors, alloy wheels & autos'
      },
      {
        id: 'coastal_palm_vegetation',
        title: 'Indian Coconut Palm & Eastern Ghats Foliage',
        localPath: 'assets/game/models/coconut_palm.glb',
        remoteUrl: null,
        status: 'MISSING_CUSTOM_GLB',
        detail: 'Optional custom GLB slot; using 7-segment palms, branching tropical trees & bougainvillea'
      }
    ];
  }

  notifyHost() {
    if (this.onManifestUpdated) {
      this.onManifestUpdated(JSON.stringify(this.manifest));
    }
  }

  _updateEntry(id, status, detail) {
    const item = this.manifest.find((m) => m.id === id);
    if (item) {
      item.status = status;
      item.detail = detail;
      this.notifyHost();
    }
  }

  _loadGlbUrl(url) {
    return new Promise((resolve, reject) => {
      if (!this.loader || !url) {
        reject(new Error('GLTFLoader unavailable'));
        return;
      }
      this.loader.load(
        url,
        (gltf) => resolve(gltf),
        undefined,
        (err) => reject(err)
      );
    });
  }

  async loadRiggedPlayerCharacter() {
    this.notifyHost();
    if (!this.loader) {
      this._updateEntry(
        'player_rigged_human',
        'SCULPTED_ARTICULATED_RIG',
        'GLTFLoader offline; using sculpted Lathe/Extrude multi-joint human rig'
      );
      return null;
    }

    const entry = this.manifest[0];
    const candidates = [
      `https://vizag.local/game/models/player_arjun.glb`,
      entry.remoteUrl,
      entry.backupUrl
    ].filter(Boolean);

    for (const url of candidates) {
      try {
        const gltf = await this._loadGlbUrl(url);
        if (gltf && gltf.scene) {
          const isSoldier = url.includes('Soldier.glb');
          this._updateEntry(
            'player_rigged_human',
            'LOADED_GLB',
            `Rigged SkinnedMesh active (${gltf.animations ? gltf.animations.length : 0} skeletal clips)`
          );
          return { gltf, facingOffset: isSoldier ? Math.PI : 0 };
        }
      } catch (_) {
        // Try next candidate
      }
    }

    this._updateEntry(
      'player_rigged_human',
      'SCULPTED_ARTICULATED_RIG',
      'Optional .glb offline; active sculpted multi-joint human rig with knee/elbow gait'
    );
    return null;
  }
}
