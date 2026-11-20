// Procedural PBR TextureManager generating Albedo, Sobel Normal, Roughness, Metallic, AO & Height maps
// Covers all 11 realistic surface types: asphalt, concrete, brick, glass, metal, wood, soil, grass, leaves, water, paint.

export class TextureManager {
  constructor(THREE) {
    this.THREE = THREE;
    this.textures = [];
    this.sets = {};
  }

  setAnisotropy(level) {
    for (const tex of this.textures) {
      tex.anisotropy = level;
      tex.needsUpdate = true;
    }
  }

  _register(tex, repeatX = 1, repeatY = 1, isSrgb = false) {
    const THREE = this.THREE;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    if (isSrgb) {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    this.textures.push(tex);
    return tex;
  }

  // Converts grayscale height canvas into tangent-space RGB Normal Map using 3x3 Sobel operator
  _heightCanvasToNormalMap(heightCanvas, strength = 2.4, repeatX = 1, repeatY = 1) {
    const w = heightCanvas.width;
    const h = heightCanvas.height;
    const hCtx = heightCanvas.getContext('2d');
    const src = hCtx.getImageData(0, 0, w, h).data;

    const normCanvas = document.createElement('canvas');
    normCanvas.width = w;
    normCanvas.height = h;
    const nCtx = normCanvas.getContext('2d');
    const dst = nCtx.createImageData(w, h);
    const out = dst.data;

    const sample = (x, y) => {
      const wx = ((x % w) + w) % w;
      const wy = ((y % h) + h) % h;
      return src[(wy * w + wx) * 4] / 255.0;
    };

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const tl = sample(x - 1, y - 1);
        const t  = sample(x,     y - 1);
        const tr = sample(x + 1, y - 1);
        const l  = sample(x - 1, y);
        const r  = sample(x + 1, y);
        const bl = sample(x - 1, y + 1);
        const b  = sample(x,     y + 1);
        const br = sample(x + 1, y + 1);

        const dX = (tr + 2.0 * r + br) - (tl + 2.0 * l + bl);
        const dY = (bl + 2.0 * b + br) - (tl + 2.0 * t + tr);

        let nx = -dX * strength;
        let ny = -dY * strength;
        let nz = 1.0;
        const len = Math.hypot(nx, ny, nz) || 1.0;
        nx /= len;
        ny /= len;
        nz /= len;

        const idx = (y * w + x) * 4;
        out[idx] = Math.round((nx * 0.5 + 0.5) * 255);
        out[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
        out[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
        out[idx + 3] = 255;
      }
    }
    nCtx.putImageData(dst, 0, 0);
    return this._register(new this.THREE.CanvasTexture(normCanvas), repeatX, repeatY, false);
  }

  _makeUniformMap(hexValue, repeatX = 1, repeatY = 1, isAo = false) {
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 16;
    const ctx = c.getContext('2d');
    ctx.fillStyle = hexValue;
    ctx.fillRect(0, 0, 16, 16);
    const tex = this._register(new this.THREE.CanvasTexture(c), repeatX, repeatY, false);
    if (isAo && 'channel' in tex) tex.channel = 0;
    return tex;
  }

  _buildCanvas(size, drawFn) {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    drawFn(c.getContext('2d'), size);
    return c;
  }

  // 1. ASPHALT (1024x1024 Indian dual-carriageway road with aggregate grain, wear tracks, tar cracks, puddles, kerbs)
  getAsphaltMaps() {
    if (this.sets.asphalt) return this.sets.asphalt;
    const THREE = this.THREE;

    const albedoCanvas = this._buildCanvas(1024, (ctx) => {
      ctx.fillStyle = '#22272f';
      ctx.fillRect(0, 0, 1024, 1024);

      // Dual tyre-wear polished tracks
      for (const xStart of [112, 576]) {
        const g = ctx.createLinearGradient(xStart, 0, xStart + 336, 0);
        g.addColorStop(0, 'rgba(15,18,22,0)');
        g.addColorStop(0.28, 'rgba(12,15,19,0.46)');
        g.addColorStop(0.5, 'rgba(28,33,40,0.14)');
        g.addColorStop(0.72, 'rgba(12,15,19,0.46)');
        g.addColorStop(1, 'rgba(15,18,22,0)');
        ctx.fillStyle = g;
        ctx.fillRect(xStart, 0, 336, 1024);
      }

      // Multi-scale mineral aggregate grain
      for (let i = 0; i < 22000; i++) {
        ctx.fillStyle = i % 3 === 0 ? '#323945' : (i % 5 === 0 ? '#2a303b' : '#161a20');
        const px = (i * 149 + (i >> 4) * 31) % 1024;
        const py = (i * 271 + (i >> 3) * 43) % 1024;
        ctx.fillRect(px, py, (i % 4 === 0) ? 3 : 2, 2);
      }

      // Bitumen crack repair tar seams
      ctx.strokeStyle = 'rgba(10, 12, 15, 0.72)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(96, 160);
      ctx.lineTo(264, 328);
      ctx.lineTo(380, 420);
      ctx.moveTo(620, 620);
      ctx.lineTo(840, 830);
      ctx.moveTo(180, 740);
      ctx.lineTo(290, 910);
      ctx.stroke();

      // Authentic Indian yellow-black edge markings & central median strip
      const kerbBlockH = 128;
      for (let y = 0; y < 1024; y += kerbBlockH) {
        const isYellow = (y / kerbBlockH) % 2 === 0;
        ctx.fillStyle = isYellow ? '#e8aa24' : '#16191e';
        ctx.fillRect(0, y, 28, kerbBlockH);
        ctx.fillRect(996, y, 28, kerbBlockH);
        ctx.fillRect(492, y, 40, kerbBlockH);
      }

      // Crisp road markings & reflective cat-eye studs
      ctx.fillStyle = '#dde3ec';
      ctx.fillRect(36, 0, 9, 1024);
      ctx.fillRect(979, 0, 9, 1024);
      ctx.fillRect(476, 0, 8, 1024);
      ctx.fillRect(540, 0, 8, 1024);

      for (let y = 48; y < 1024; y += 192) {
        ctx.fillStyle = '#d4dae2';
        ctx.fillRect(256, y, 12, 104);
        ctx.fillRect(756, y, 12, 104);
        ctx.fillStyle = '#f5c451';
        ctx.fillRect(254, y + 44, 16, 16);
        ctx.fillRect(754, y + 44, 16, 16);
      }
    });

    const heightCanvas = this._buildCanvas(512, (ctx) => {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 14000; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#b2b2b2' : '#4e4e4e';
        ctx.fillRect((i * 103) % 512, (i * 197 + (i >> 2) * 17) % 512, 2, 2);
      }
      ctx.fillStyle = '#bebebe';
      ctx.fillRect(0, 0, 14, 512);
      ctx.fillRect(498, 0, 14, 512);
      ctx.fillRect(246, 0, 20, 512);
    });

    const dryRoughCanvas = this._buildCanvas(256, (ctx) => {
      ctx.fillStyle = '#cccece';
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = '#a2a2a2';
      ctx.fillRect(36, 0, 64, 256);
      ctx.fillRect(156, 0, 64, 256);
    });

    const wetRoughCanvas = this._buildCanvas(256, (ctx) => {
      ctx.fillStyle = '#4a4a4a';
      ctx.fillRect(0, 0, 256, 256);
      const puddles = [
        [70, 56, 38, 54],
        [188, 128, 36, 62],
        [82, 198, 44, 48],
        [174, 34, 32, 40]
      ];
      for (const [px, py, rx, ry] of puddles) {
        const pg = ctx.createRadialGradient(px, py, 3, px, py, Math.max(rx, ry));
        pg.addColorStop(0, '#080808');
        pg.addColorStop(0.65, '#181818');
        pg.addColorStop(1, 'rgba(74,74,74,0)');
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.ellipse(px, py, rx, ry, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    const aoCanvas = this._buildCanvas(256, (ctx) => {
      ctx.fillStyle = '#f2f2f2';
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = '#9e9e9e';
      ctx.fillRect(8, 0, 5, 256);
      ctx.fillRect(243, 0, 5, 256);
      ctx.fillRect(118, 0, 4, 256);
      ctx.fillRect(134, 0, 4, 256);
    });

    const aoMap = this._register(new THREE.CanvasTexture(aoCanvas), 1, 3, false);
    if ('channel' in aoMap) aoMap.channel = 0;

    this.sets.asphalt = {
      map: this._register(new THREE.CanvasTexture(albedoCanvas), 1, 3, true),
      normalMap: this._heightCanvasToNormalMap(heightCanvas, 2.8, 2, 6),
      bumpMap: this._register(new THREE.CanvasTexture(heightCanvas), 2, 6, false),
      dryRoughnessMap: this._register(new THREE.CanvasTexture(dryRoughCanvas), 1, 3, false),
      wetRoughnessMap: this._register(new THREE.CanvasTexture(wetRoughCanvas), 1, 3, false),
      metalnessMap: this._makeUniformMap('#161616', 1, 3),
      aoMap
    };
    return this.sets.asphalt;
  }

  // 2. CONCRETE (Coastal seawalls, chajjas, kerbs & walkways)
  getConcreteMaps() {
    if (this.sets.concrete) return this.sets.concrete;
    const THREE = this.THREE;

    const albedoC = this._buildCanvas(512, (ctx) => {
      ctx.fillStyle = '#cfc9be';
      ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 6500; i++) {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(65,60,54,0.12)';
        ctx.fillRect((i * 107) % 512, (i * 197 + (i >> 3) * 19) % 512, 3, 2);
      }
      ctx.strokeStyle = 'rgba(85,80,74,0.38)';
      ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, 508, 254);
      ctx.strokeRect(2, 256, 508, 254);
    });

    const heightC = this._buildCanvas(256, (ctx) => {
      ctx.fillStyle = '#888888';
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 3200; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#a8a8a8' : '#646464';
        ctx.fillRect((i * 53) % 256, (i * 97) % 256, 2, 2);
      }
      ctx.strokeStyle = '#383838';
      ctx.lineWidth = 3;
      ctx.strokeRect(1, 1, 254, 127);
    });

    const roughC = this._buildCanvas(256, (ctx) => {
      ctx.fillStyle = '#d4d4d4';
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 900; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#e4e4e4' : '#b2b2b2';
        ctx.fillRect((i * 71) % 256, (i * 113) % 256, 4, 4);
      }
    });

    const aoMap = this._makeUniformMap('#e8e8e8', 2, 2, true);
    this.sets.concrete = {
      map: this._register(new THREE.CanvasTexture(albedoC), 2, 2, true),
      normalMap: this._heightCanvasToNormalMap(heightC, 2.4, 2, 2),
      roughnessMap: this._register(new THREE.CanvasTexture(roughC), 2, 2, false),
      metalnessMap: this._makeUniformMap('#080808', 2, 2),
      aoMap
    };
    return this.sets.concrete;
  }

  // 2B. INTERLOCKING SIDEWALK PAVERS, CURBS & STORMWATER DRAIN GRATES
  getSidewalkPaverMaps() {
    if (this.sets.sidewalk) return this.sets.sidewalk;
    const THREE = this.THREE;

    const albedoC = this._buildCanvas(512, (ctx) => {
      ctx.fillStyle = '#757b82';
      ctx.fillRect(0, 0, 512, 512);
      const pw = 64;
      const ph = 32;
      for (let r = 0; r < 16; r++) {
        const off = (r % 2) * 32;
        for (let c = -1; c < 9; c++) {
          const v = (r * 7 + c * 5) % 4;
          ctx.fillStyle = v === 0 ? '#b6bbc2' : (v === 1 ? '#a4aab2' : (v === 2 ? '#989ea6' : '#c0c4ca'));
          ctx.fillRect(c * pw + off + 2, r * ph + 2, pw - 4, ph - 4);
        }
      }
      // Subtle concrete wear speckles
      for (let i = 0; i < 2500; i++) {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(30,34,40,0.08)';
        ctx.fillRect((i * 83) % 512, (i * 179) % 512, 2, 2);
      }
    });

    const heightC = this._buildCanvas(256, (ctx) => {
      ctx.fillStyle = '#383838';
      ctx.fillRect(0, 0, 256, 256);
      for (let r = 0; r < 16; r++) {
        const off = (r % 2) * 16;
        for (let c = -1; c < 9; c++) {
          ctx.fillStyle = (r + c) % 2 === 0 ? '#dcdcdc' : '#c4c4c4';
          ctx.fillRect(c * 32 + off + 1, r * 16 + 1, 30, 14);
        }
      }
    });

    const aoMap = this._register(new THREE.CanvasTexture(heightC), 1, 6, false);
    if ('channel' in aoMap) aoMap.channel = 0;

    this.sets.sidewalk = {
      map: this._register(new THREE.CanvasTexture(albedoC), 1, 6, true),
      normalMap: this._heightCanvasToNormalMap(heightC, 2.6, 1, 6),
      roughnessMap: this._makeUniformMap('#c8c8c8', 1, 6),
      aoMap
    };
    return this.sets.sidewalk;
  }

  getCurbMaps() {
    if (this.sets.curb) return this.sets.curb;
    const THREE = this.THREE;

    const albedoC = this._buildCanvas(512, (ctx) => {
      for (let x = 0; x < 512; x += 128) {
        ctx.fillStyle = (x / 128) % 2 === 0 ? '#eab308' : '#1b1f26';
        ctx.fillRect(x, 0, 128, 512);
        ctx.fillStyle = 'rgba(0,0,0,0.24)';
        ctx.fillRect(x, 0, 5, 512);
      }
      for (let i = 0; i < 1800; i++) {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)';
        ctx.fillRect((i * 97) % 512, (i * 151) % 512, 3, 3);
      }
    });
    const heightC = this._buildCanvas(256, (ctx) => {
      ctx.fillStyle = '#c8c8c8';
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = '#4c4c4c';
      for (let x = 0; x < 256; x += 64) {
        ctx.fillRect(x, 0, 3, 256);
      }
    });
    this.sets.curb = {
      map: this._register(new THREE.CanvasTexture(albedoC), 4, 1, true),
      normalMap: this._heightCanvasToNormalMap(heightC, 2.4, 4, 1),
      roughnessMap: this._makeUniformMap('#bebebe', 4, 1)
    };
    return this.sets.curb;
  }

  getDrainGrateMaps() {
    if (this.sets.drain) return this.sets.drain;
    const THREE = this.THREE;

    const albedoC = this._buildCanvas(128, (ctx) => {
      ctx.fillStyle = '#252a32';
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#090b0f';
      for (let y = 14; y < 114; y += 14) {
        ctx.fillRect(14, y, 100, 7);
      }
      ctx.strokeStyle = '#3d4552';
      ctx.lineWidth = 6;
      ctx.strokeRect(4, 4, 120, 120);
    });
    const heightC = this._buildCanvas(128, (ctx) => {
      ctx.fillStyle = '#dcdcdc';
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#181818';
      for (let y = 14; y < 114; y += 14) {
        ctx.fillRect(14, y, 100, 7);
      }
    });

    this.sets.drain = {
      map: this._register(new THREE.CanvasTexture(albedoC), 1, 1, true),
      normalMap: this._heightCanvasToNormalMap(heightC, 3.2, 1, 1),
      roughnessMap: this._makeUniformMap('#707070', 1, 1)
    };
    return this.sets.drain;
  }

  getTireTreadMaps() {
    if (this.sets.tire) return this.sets.tire;
    const THREE = this.THREE;
    const heightC = this._buildCanvas(256, (ctx) => {
      ctx.fillStyle = '#303030';
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = '#dadada';
      for (let y = 0; y < 256; y += 16) {
        ctx.fillRect(16, y + 2, 64, 10);
        ctx.fillRect(96, y + 6, 64, 10);
        ctx.fillRect(176, y + 2, 64, 10);
      }
    });
    this.sets.tire = {
      normalMap: this._heightCanvasToNormalMap(heightC, 3.4, 1, 4),
      roughnessMap: this._makeUniformMap('#b4b4b4', 1, 4)
    };
    return this.sets.tire;
  }

  // 3. BRICK / TERRACOTTA PAVERS (RK Beach walkway + Indian masonry)
  getBrickMaps() {
    if (this.sets.brick) return this.sets.brick;
    const THREE = this.THREE;

    const albedoC = this._buildCanvas(512, (ctx) => {
      ctx.fillStyle = '#7e4a38';
      ctx.fillRect(0, 0, 512, 512);
      const bw = 64;
      const bh = 32;
      for (let r = 0; r < 16; r++) {
        const off = (r % 2) * 32;
        for (let c = -1; c < 9; c++) {
          const shade = (r * 5 + c * 3) % 3;
          ctx.fillStyle = shade === 0 ? '#be6e53' : (shade === 1 ? '#a95c44' : '#c67d64');
          ctx.fillRect(c * bw + off + 2, r * bh + 2, bw - 4, bh - 4);
        }
      }
      ctx.fillStyle = '#d9a432';
      ctx.fillRect(28, 0, 24, 512);
    });

    const heightC = this._buildCanvas(256, (ctx) => {
      ctx.fillStyle = '#404040';
      ctx.fillRect(0, 0, 256, 256);
      const bw = 32;
      const bh = 16;
      for (let r = 0; r < 16; r++) {
        const off = (r % 2) * 16;
        for (let c = -1; c < 9; c++) {
          ctx.fillStyle = (r + c) % 2 === 0 ? '#d8d8d8' : '#c4c4c4';
          ctx.fillRect(c * bw + off + 2, r * bh + 2, bw - 4, bh - 4);
        }
      }
    });

    const roughC = this._buildCanvas(256, (ctx) => {
      ctx.fillStyle = '#e0e0e0';
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = '#b8b8b8';
      for (let r = 0; r < 16; r++) {
        const off = (r % 2) * 16;
        for (let c = -1; c < 9; c++) {
          ctx.fillRect(c * 32 + off + 2, r * 16 + 2, 28, 12);
        }
      }
    });

    const aoMap = this._register(new THREE.CanvasTexture(heightC), 2, 24, false);
    if ('channel' in aoMap) aoMap.channel = 0;

    this.sets.brick = {
      map: this._register(new THREE.CanvasTexture(albedoC), 2, 24, true),
      normalMap: this._heightCanvasToNormalMap(heightC, 2.8, 2, 24),
      roughnessMap: this._register(new THREE.CanvasTexture(roughC), 2, 24, false),
      metalnessMap: this._makeUniformMap('#050505', 2, 24),
      aoMap
    };
    return this.sets.brick;
  }

  // 4 & 11. PAINTED BUILDING FACADES + ARCHITECTURAL GLASS (512x1024 Day, Night, Emissive, Normal, Roughness, Metalness, AO)
  getBuildingFacadeAndGlassMaps() {
    if (this.sets.facade) return this.sets.facade;
    const THREE = this.THREE;

    const makeC = (mode) => {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 1024;
      const ctx = c.getContext('2d');

      if (mode === 'roughness') ctx.fillStyle = '#d4d4d4';
      else if (mode === 'metalness') ctx.fillStyle = '#080808';
      else if (mode === 'height') ctx.fillStyle = '#bcbcbc';
      else if (mode === 'ao') ctx.fillStyle = '#f0f0f0';
      else if (mode === 'emissive') ctx.fillStyle = '#000000';
      else if (mode === 'night') ctx.fillStyle = '#242d3a';
      else ctx.fillStyle = '#e7e1d7';

      ctx.fillRect(0, 0, 512, 1024);

      if (mode === 'day' || mode === 'height') {
        for (let i = 0; i < 4200; i++) {
          ctx.fillStyle = mode === 'height'
            ? (i % 2 === 0 ? '#cacaca' : '#aeaeb0')
            : 'rgba(105,95,85,0.07)';
          ctx.fillRect((i * 97) % 512, (i * 173) % 1024, 3, 2);
        }
      }

      for (let y = 0; y < 1024; y += 128) {
        if (mode === 'day' || mode === 'night') {
          ctx.fillStyle = mode === 'night' ? '#171f29' : '#c4bcb0';
          ctx.fillRect(0, y, 512, 14);
        } else if (mode === 'height') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, y, 512, 14);
        } else if (mode === 'ao') {
          ctx.fillStyle = '#a8a8a8';
          ctx.fillRect(0, y + 14, 512, 8);
        }

        for (let x = 32; x < 460; x += 112) {
          if (mode === 'height') {
            ctx.fillStyle = '#707070';
            ctx.fillRect(x - 4, y + 26, 80, 74);
            ctx.fillStyle = '#323232';
            ctx.fillRect(x, y + 30, 72, 66);
            continue;
          }
          if (mode === 'ao') {
            ctx.fillStyle = '#929292';
            ctx.fillRect(x - 4, y + 26, 80, 74);
            ctx.fillStyle = '#d4d4d4';
            ctx.fillRect(x, y + 30, 72, 66);
            continue;
          }
          if (mode === 'metalness') {
            ctx.fillStyle = '#929292';
            ctx.fillRect(x - 4, y + 26, 80, 74);
            ctx.fillStyle = '#343434';
            ctx.fillRect(x, y + 30, 72, 66);
            continue;
          }
          if (mode === 'roughness') {
            ctx.fillStyle = '#626262';
            ctx.fillRect(x - 4, y + 26, 80, 74);
            ctx.fillStyle = '#101010';
            ctx.fillRect(x, y + 30, 72, 66);
            continue;
          }

          const roomLit = (x * 7 + y * 13) % 5 !== 0 && (x + y) % 3 !== 0;
          if (mode === 'emissive') {
            if (roomLit) {
              ctx.fillStyle = '#ffd584';
              ctx.fillRect(x + 4, y + 34, 64, 58);
            }
            continue;
          }

          ctx.fillStyle = '#333c47';
          ctx.fillRect(x - 4, y + 26, 80, 74);

          if (mode === 'night' && roomLit) {
            const g = ctx.createLinearGradient(x, y + 30, x, y + 96);
            g.addColorStop(0, '#ffe3a8');
            g.addColorStop(1, '#e8a84a');
            ctx.fillStyle = g;
          } else {
            const g = ctx.createLinearGradient(x, y + 30, x + 72, y + 96);
            g.addColorStop(0, '#142c42');
            g.addColorStop(0.55, '#2b5273');
            g.addColorStop(1, '#5480a2');
            ctx.fillStyle = g;
          }
          ctx.fillRect(x, y + 30, 72, 66);

          // Mullion & curtain crossbars
          ctx.fillStyle = '#242b33';
          ctx.fillRect(x + 34, y + 30, 4, 66);
          ctx.fillRect(x, y + 60, 72, 4);
        }
      }
      return c;
    };

    const heightC = makeC('height');
    const aoMap = this._register(new THREE.CanvasTexture(makeC('ao')), 1, 1, false);
    if ('channel' in aoMap) aoMap.channel = 0;

    this.sets.facade = {
      dayMap: this._register(new THREE.CanvasTexture(makeC('day')), 1, 1, true),
      nightMap: this._register(new THREE.CanvasTexture(makeC('night')), 1, 1, true),
      emissiveMap: this._register(new THREE.CanvasTexture(makeC('emissive')), 1, 1, true),
      roughnessMap: this._register(new THREE.CanvasTexture(makeC('roughness')), 1, 1, false),
      metalnessMap: this._register(new THREE.CanvasTexture(makeC('metalness')), 1, 1, false),
      normalMap: this._heightCanvasToNormalMap(heightC, 3.0, 1, 1),
      bumpMap: this._register(new THREE.CanvasTexture(heightC), 1, 1, false),
      aoMap
    };
    return this.sets.facade;
  }

  // 5. METAL (Brushed aluminum / coastal streetlamp poles, railings, harbor cranes)
  getMetalMaps() {
    if (this.sets.metal) return this.sets.metal;
    const THREE = this.THREE;

    const albedoC = this._buildCanvas(128, (ctx) => {
      ctx.fillStyle = '#adb6c0';
      ctx.fillRect(0, 0, 128, 128);
      for (let y = 0; y < 128; y += 2) {
        ctx.fillStyle = y % 4 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(20,25,30,0.08)';
        ctx.fillRect(0, y, 128, 1);
      }
    });
    const heightC = this._buildCanvas(128, (ctx) => {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, 128, 128);
      for (let y = 0; y < 128; y += 2) {
        ctx.fillStyle = y % 4 === 0 ? '#949494' : '#6c6c6c';
        ctx.fillRect(0, y, 128, 1);
      }
    });
    const roughC = this._buildCanvas(128, (ctx) => {
      ctx.fillStyle = '#484848';
      ctx.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 240; i++) {
        ctx.fillStyle = '#686868';
        ctx.fillRect((i * 37) % 128, (i * 73) % 128, 6, 1);
      }
    });

    this.sets.metal = {
      map: this._register(new THREE.CanvasTexture(albedoC), 1, 1, true),
      normalMap: this._heightCanvasToNormalMap(heightC, 1.4, 1, 1),
      roughnessMap: this._register(new THREE.CanvasTexture(roughC), 1, 1, false),
      metalnessMap: this._makeUniformMap('#e2e2e2', 1, 1)
    };
    return this.sets.metal;
  }

  // 6. WOOD (Coastal boardwalk benches, boat dock decking & palm bark)
  getWoodMaps() {
    if (this.sets.wood) return this.sets.wood;
    const THREE = this.THREE;

    const albedoC = this._buildCanvas(128, (ctx) => {
      ctx.fillStyle = '#6c503a';
      ctx.fillRect(0, 0, 128, 128);
      for (let y = 0; y < 128; y += 16) {
        ctx.fillStyle = (y / 16) % 2 === 0 ? '#765740' : '#634834';
        ctx.fillRect(0, y + 1, 128, 14);
        ctx.fillStyle = '#463223';
        ctx.fillRect(0, y, 128, 1);
      }
      for (let i = 0; i < 400; i++) {
        ctx.fillStyle = 'rgba(35,20,10,0.18)';
        ctx.fillRect((i * 29) % 128, (i * 11) % 128, 12, 1);
      }
    });
    const heightC = this._buildCanvas(128, (ctx) => {
      ctx.fillStyle = '#909090';
      ctx.fillRect(0, 0, 128, 128);
      for (let y = 0; y < 128; y += 16) {
        ctx.fillStyle = '#383838';
        ctx.fillRect(0, y, 128, 2);
      }
    });

    this.sets.wood = {
      map: this._register(new THREE.CanvasTexture(albedoC), 1, 2, true),
      normalMap: this._heightCanvasToNormalMap(heightC, 2.1, 1, 2),
      roughnessMap: this._makeUniformMap('#dcdcdc', 1, 2)
    };
    return this.sets.wood;
  }

  // 7 & 8. SOIL & GRASS TERRAIN DETAIL (Micro grain + pebble soil & turf normal response)
  getSoilAndGrassMaps() {
    if (this.sets.terrain) return this.sets.terrain;
    const THREE = this.THREE;

    const albedoC = this._buildCanvas(256, (ctx) => {
      ctx.fillStyle = '#e2e2e2';
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 4600; i++) {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.18)' : 'rgba(85,78,66,0.16)';
        ctx.fillRect((i * 67) % 256, (i * 131 + (i >> 3) * 17) % 256, 3, 2);
      }
    });
    const heightC = this._buildCanvas(256, (ctx) => {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 4600; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#a8a8a8' : '#565656';
        ctx.fillRect((i * 67) % 256, (i * 131) % 256, 2, 2);
      }
    });

    this.sets.terrain = {
      map: this._register(new THREE.CanvasTexture(albedoC), 12, 12, true),
      normalMap: this._heightCanvasToNormalMap(heightC, 2.1, 12, 12),
      roughnessMap: this._makeUniformMap('#e5e5e5', 12, 12)
    };
    return this.sets.terrain;
  }

  // 9. LEAVES (Coconut palm & tropical Eastern Ghats foliage venation)
  getLeavesMaps() {
    if (this.sets.leaves) return this.sets.leaves;
    const THREE = this.THREE;

    const albedoC = this._buildCanvas(128, (ctx) => {
      ctx.fillStyle = '#2d6e38';
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#4c8e4b';
      ctx.fillRect(61, 0, 6, 128);
      for (let y = 4; y < 128; y += 7) {
        ctx.strokeStyle = y % 14 === 0 ? '#3a8444' : '#245c2d';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(64, y);
        ctx.lineTo(6, y + 6);
        ctx.moveTo(64, y);
        ctx.lineTo(122, y + 6);
        ctx.stroke();
      }
    });
    const heightC = this._buildCanvas(128, (ctx) => {
      ctx.fillStyle = '#707070';
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#d4d4d4';
      ctx.fillRect(61, 0, 6, 128);
      for (let y = 4; y < 128; y += 7) {
        ctx.strokeStyle = '#a8a8a8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(64, y);
        ctx.lineTo(6, y + 6);
        ctx.moveTo(64, y);
        ctx.lineTo(122, y + 6);
        ctx.stroke();
      }
    });

    this.sets.leaves = {
      map: this._register(new THREE.CanvasTexture(albedoC), 1, 2, true),
      normalMap: this._heightCanvasToNormalMap(heightC, 1.9, 1, 2),
      roughnessMap: this._makeUniformMap('#8a8a8a', 1, 2)
    };
    return this.sets.leaves;
  }

  // 10. WATER DETAIL (Capillary normal texture for Bay of Bengal wave reflections)
  getWaterDetailNormalMap() {
    if (this.sets.waterNormal) return this.sets.waterNormal;
    const heightC = this._buildCanvas(128, (ctx) => {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, 128, 128);
      for (let y = 0; y < 128; y++) {
        for (let x = 0; x < 128; x += 2) {
          const v =
            128 +
            Math.sin(x * 0.24 + y * 0.14) * 32 +
            Math.cos(y * 0.34 - x * 0.19) * 28;
          const c = Math.max(0, Math.min(255, Math.round(v)));
          ctx.fillStyle = `rgb(${c},${c},${c})`;
          ctx.fillRect(x, y, 2, 1);
        }
      }
    });
    this.sets.waterNormal = this._heightCanvasToNormalMap(heightC, 1.6, 8, 8);
    return this.sets.waterNormal;
  }

  createLightGlowTexture() {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
    g.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    g.addColorStop(0.22, 'rgba(255, 240, 200, 0.72)');
    g.addColorStop(0.55, 'rgba(255, 205, 130, 0.22)');
    g.addColorStop(1.0, 'rgba(255, 180, 90, 0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new this.THREE.CanvasTexture(c);
    tex.colorSpace = this.THREE.SRGBColorSpace;
    this.textures.push(tex);
    return tex;
  }

  createContactShadowTexture() {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
    g.addColorStop(0, 'rgba(0, 0, 0, 0.50)');
    g.addColorStop(0.65, 'rgba(0, 0, 0, 0.20)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new this.THREE.CanvasTexture(c);
    this.textures.push(tex);
    return tex;
  }

  createRoadSignTexture(line1, line2) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 160;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#0b6b3a';
    ctx.fillRect(0, 0, 512, 160);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 496, 144);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(line1, 256, 68);
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(line2, 256, 118);
    const tex = new this.THREE.CanvasTexture(c);
    tex.colorSpace = this.THREE.SRGBColorSpace;
    this.textures.push(tex);
    return tex;
  }

  createSkyEquirectangularTexture(topColor, horizonColor, groundColor, sunColor) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0.0, `#${topColor.getHexString()}`);
    grad.addColorStop(0.47, `#${horizonColor.getHexString()}`);
    grad.addColorStop(0.53, `#${horizonColor.getHexString()}`);
    grad.addColorStop(1.0, `#${groundColor.getHexString()}`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 128);

    const sg = ctx.createRadialGradient(178, 40, 2, 178, 40, 44);
    sg.addColorStop(0.0, '#ffffff');
    sg.addColorStop(0.28, `#${sunColor.getHexString()}`);
    sg.addColorStop(1.0, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(120, 0, 120, 88);

    const tex = new this.THREE.CanvasTexture(c);
    tex.mapping = this.THREE.EquirectangularReflectionMapping;
    tex.colorSpace = this.THREE.SRGBColorSpace;
    return tex;
  }

  createCrosswalkTexture() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 256, 128);
    ctx.fillStyle = 'rgba(241, 245, 249, 0.90)';
    for (let x = 14; x < 240; x += 34) {
      ctx.fillRect(x, 12, 18, 104);
      // Slight tire wear breaks
      ctx.clearRect(x, 42, 18, 5);
    }
    const tex = new this.THREE.CanvasTexture(c);
    tex.colorSpace = this.THREE.SRGBColorSpace;
    this.textures.push(tex);
    return tex;
  }
}
