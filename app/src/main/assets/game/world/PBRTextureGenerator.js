// High-Resolution Procedural PBR Albedo, Bump, Roughness, Emissive Glow & IBL Sky Environment Generator
// Designed for GTA V-grade surface response with minimal WebGL memory overhead on Android tablets.

export class PBRTextureGenerator {
  constructor(THREE) {
    this.THREE = THREE;
    this.textures = [];
  }

  setAnisotropy(level) {
    for (const tex of this.textures) {
      tex.anisotropy = level;
      tex.needsUpdate = true;
    }
  }

  _register(tex, repeatX = 1, repeatY = 1) {
    const THREE = this.THREE;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    this.textures.push(tex);
    return tex;
  }

  createIndianRoadTextures() {
    const THREE = this.THREE;
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');

    // Weathered dark Indian bitumen asphalt base
    ctx.fillStyle = '#21262e';
    ctx.fillRect(0, 0, 512, 512);

    // Dual tyre-wear polished tracks per carriageway
    for (const xStart of [56, 288]) {
      const wearGrad = ctx.createLinearGradient(xStart, 0, xStart + 168, 0);
      wearGrad.addColorStop(0, 'rgba(18,20,24,0)');
      wearGrad.addColorStop(0.28, 'rgba(14,16,20,0.42)');
      wearGrad.addColorStop(0.5, 'rgba(28,31,38,0.12)');
      wearGrad.addColorStop(0.72, 'rgba(14,16,20,0.42)');
      wearGrad.addColorStop(1, 'rgba(18,20,24,0)');
      ctx.fillStyle = wearGrad;
      ctx.fillRect(xStart, 0, 168, 512);
    }

    // Crisp bitumen aggregate micro-speckle
    for (let i = 0; i < 4200; i++) {
      ctx.fillStyle = i % 3 === 0 ? '#323844' : (i % 5 === 0 ? '#2b303a' : '#181b21');
      ctx.fillRect((i * 73) % 512, (i * 137 + (i >> 3) * 19) % 512, 2, 2);
    }

    // Authentic Indian Yellow-and-Black concrete kerbs & central divider median
    const kerbBlockH = 64;
    for (let y = 0; y < 512; y += kerbBlockH) {
      const isYellow = (y / kerbBlockH) % 2 === 0;
      ctx.fillStyle = isYellow ? '#f4b41a' : '#16181d';
      ctx.fillRect(0, y, 16, kerbBlockH);
      ctx.fillRect(496, y, 16, kerbBlockH);
      ctx.fillRect(246, y, 20, kerbBlockH);
    }

    // White edge lines & median borders
    ctx.fillStyle = '#e7ebf2';
    ctx.fillRect(20, 0, 5, 512);
    ctx.fillRect(487, 0, 5, 512);
    ctx.fillRect(238, 0, 4, 512);
    ctx.fillRect(270, 0, 4, 512);

    // Dual-carriageway dashed lane dividers + cat-eye reflectors
    for (let y = 24; y < 512; y += 96) {
      ctx.fillStyle = '#dce1e8';
      ctx.fillRect(128, y, 6, 52);
      ctx.fillRect(378, y, 6, 52);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(127, y + 22, 8, 8);
      ctx.fillRect(377, y + 22, 8, 8);
    }

    // Micro-bump map for crisp grazing sunlight specular grain
    const b = document.createElement('canvas');
    b.width = 256;
    b.height = 256;
    const bctx = b.getContext('2d');
    bctx.fillStyle = '#808080';
    bctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 3200; i++) {
      bctx.fillStyle = i % 2 === 0 ? '#b2b2b2' : '#4e4e4e';
      bctx.fillRect((i * 59) % 256, (i * 113 + (i >> 2) * 11) % 256, 2, 2);
    }

    // Dry & Wet-Rain Puddle Roughness Map (dark areas = glossy puddle mirror reflections)
    const rDry = document.createElement('canvas');
    rDry.width = 256;
    rDry.height = 256;
    const rdCtx = rDry.getContext('2d');
    rdCtx.fillStyle = '#c4c4c4';
    rdCtx.fillRect(0, 0, 256, 256);
    // Tyre polish slightly smoother
    rdCtx.fillStyle = '#a4a4a4';
    rdCtx.fillRect(36, 0, 64, 256);
    rdCtx.fillRect(156, 0, 64, 256);

    const rWet = document.createElement('canvas');
    rWet.width = 256;
    rWet.height = 256;
    const rwCtx = rWet.getContext('2d');
    rwCtx.fillStyle = '#5a5a5a'; // damp bitumen sheen
    rwCtx.fillRect(0, 0, 256, 256);
    const puddles = [
      [70, 56, 36, 52],
      [188, 128, 34, 60],
      [82, 198, 42, 46],
      [174, 34, 30, 38]
    ];
    for (const [px, py, rx, ry] of puddles) {
      const pg = rwCtx.createRadialGradient(px, py, 4, px, py, Math.max(rx, ry));
      pg.addColorStop(0, '#0c0c0c');
      pg.addColorStop(0.65, '#1e1e1e');
      pg.addColorStop(1, 'rgba(90,90,90,0)');
      rwCtx.fillStyle = pg;
      rwCtx.beginPath();
      rwCtx.ellipse(px, py, rx, ry, 0.2, 0, Math.PI * 2);
      rwCtx.fill();
    }

    const map = this._register(new THREE.CanvasTexture(c), 1, 3);
    map.colorSpace = THREE.SRGBColorSpace;
    const bumpMap = this._register(new THREE.CanvasTexture(b), 2, 6);
    const dryRoughnessMap = this._register(new THREE.CanvasTexture(rDry), 1, 3);
    const wetRoughnessMap = this._register(new THREE.CanvasTexture(rWet), 1, 3);
    return { map, bumpMap, dryRoughnessMap, wetRoughnessMap };
  }

  createPromenadePaverTextures() {
    const THREE = this.THREE;
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#99553e';
    ctx.fillRect(0, 0, 256, 256);

    const brickW = 32;
    const brickH = 16;
    for (let row = 0; row < 16; row++) {
      const offset = (row % 2) * 16;
      for (let col = -1; col < 9; col++) {
        const bx = col * brickW + offset;
        const by = row * brickH;
        const shade = (row * 5 + col * 3) % 3;
        ctx.fillStyle = shade === 0 ? '#c4745a' : (shade === 1 ? '#ad6048' : '#cb8369');
        ctx.fillRect(bx + 1, by + 1, brickW - 2, brickH - 2);
      }
    }

    ctx.fillStyle = '#e0a82e';
    ctx.fillRect(14, 0, 12, 256);

    const tex = this._register(new THREE.CanvasTexture(c), 2, 24);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // Returns Albedo (day/night), Emissive Mask, RoughnessMap (mirror glass vs matte plaster) & BumpMap
  createBuildingFacadeMaps() {
    const THREE = this.THREE;

    const makeCanvas = (mode) => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 512;
      const ctx = c.getContext('2d');

      if (mode === 'roughness') {
        ctx.fillStyle = '#dedede'; // Matte architectural concrete/stucco
      } else if (mode === 'bump') {
        ctx.fillStyle = '#b4b4b4';
      } else if (mode === 'emissive') {
        ctx.fillStyle = '#000000';
      } else if (mode === 'night') {
        ctx.fillStyle = '#2b3644';
      } else {
        ctx.fillStyle = '#ebe6dc';
      }
      ctx.fillRect(0, 0, 256, 512);

      for (let y = 0; y < 512; y += 64) {
        if (mode === 'day' || mode === 'night') {
          ctx.fillStyle = mode === 'night' ? '#1c2430' : '#ccc4b8';
          ctx.fillRect(0, y, 256, 8);
        } else if (mode === 'bump') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, y, 256, 8);
        }

        for (let x = 18; x < 230; x += 56) {
          if (mode === 'bump') {
            ctx.fillStyle = '#606060';
            ctx.fillRect(x - 2, y + 14, 38, 36);
            ctx.fillStyle = '#383838';
            ctx.fillRect(x, y + 16, 34, 32);
            continue;
          }
          if (mode === 'roughness') {
            ctx.fillStyle = '#707070';
            ctx.fillRect(x - 2, y + 14, 38, 36);
            // Glossy architectural glass reflects sky/sun IBL!
            ctx.fillStyle = '#181818';
            ctx.fillRect(x, y + 16, 34, 32);
            continue;
          }

          const roomLit = (x * 7 + y * 13) % 5 !== 0 && (x + y) % 3 !== 0;
          if (mode === 'emissive') {
            if (roomLit) {
              ctx.fillStyle = '#ffd584';
              ctx.fillRect(x + 2, y + 18, 30, 28);
            }
            continue;
          }

          // Albedo frames & glass gradient
          ctx.fillStyle = '#38414c';
          ctx.fillRect(x - 2, y + 14, 38, 36);

          if (mode === 'night' && roomLit) {
            const g = ctx.createLinearGradient(x, y + 16, x, y + 48);
            g.addColorStop(0, '#ffe3a8');
            g.addColorStop(1, '#e8a84a');
            ctx.fillStyle = g;
          } else {
            const g = ctx.createLinearGradient(x, y + 16, x + 34, y + 48);
            g.addColorStop(0, '#1a354d');
            g.addColorStop(0.55, '#345c7d');
            g.addColorStop(1, '#5885a8');
            ctx.fillStyle = g;
          }
          ctx.fillRect(x, y + 16, 34, 32);

          // Window mullions
          ctx.fillStyle = '#293038';
          ctx.fillRect(x + 16, y + 16, 2, 32);
          ctx.fillRect(x, y + 31, 34, 2);
        }
      }
      return c;
    };

    const dayMap = this._register(new THREE.CanvasTexture(makeCanvas('day')), 1, 1);
    dayMap.colorSpace = THREE.SRGBColorSpace;
    const nightMap = this._register(new THREE.CanvasTexture(makeCanvas('night')), 1, 1);
    nightMap.colorSpace = THREE.SRGBColorSpace;
    const emissiveMap = this._register(new THREE.CanvasTexture(makeCanvas('emissive')), 1, 1);
    emissiveMap.colorSpace = THREE.SRGBColorSpace;
    const roughnessMap = this._register(new THREE.CanvasTexture(makeCanvas('roughness')), 1, 1);
    const bumpMap = this._register(new THREE.CanvasTexture(makeCanvas('bump')), 1, 1);

    return { dayMap, nightMap, emissiveMap, roughnessMap, bumpMap };
  }

  createTerrainDetailTexture() {
    const THREE = this.THREE;
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 4800; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.16)' : 'rgba(95,90,82,0.14)';
      const px = (i * 67) % 256;
      const py = (i * 131 + (i >> 3) * 17) % 256;
      ctx.fillRect(px, py, 3, 2);
    }

    const tex = this._register(new THREE.CanvasTexture(c), 12, 12);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  createLightGlowTexture() {
    const THREE = this.THREE;
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
    g.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    g.addColorStop(0.2, 'rgba(255, 240, 200, 0.72)');
    g.addColorStop(0.52, 'rgba(255, 205, 130, 0.22)');
    g.addColorStop(1.0, 'rgba(255, 180, 90, 0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.textures.push(tex);
    return tex;
  }

  createContactShadowTexture() {
    const THREE = this.THREE;
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
    g.addColorStop(0, 'rgba(0, 0, 0, 0.52)');
    g.addColorStop(0.65, 'rgba(0, 0, 0, 0.22)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    this.textures.push(tex);
    return tex;
  }

  createRoadSignTexture(line1, line2) {
    const THREE = this.THREE;
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

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.textures.push(tex);
    return tex;
  }

  // Equirectangular Sky + Sun + Sea Bounce Texture for zero-lag PBR IBL Reflections
  createSkyEquirectangularTexture(topColor, horizonColor, groundColor, sunColor) {
    const THREE = this.THREE;
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

    // Warm sunlit specular hotspot in sky hemisphere for crisp car/glass glints
    const sg = ctx.createRadialGradient(178, 40, 2, 178, 40, 44);
    sg.addColorStop(0.0, '#ffffff');
    sg.addColorStop(0.28, `#${sunColor.getHexString()}`);
    sg.addColorStop(1.0, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(120, 0, 120, 88);

    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
}
