// AAA Multi-Part VehicleController:
// ExtrudeGeometry beveled car profiles, wheel-well cutouts, transparent glass + 3D interiors,
// 5-spoke alloy rims + brake calipers + tire tread normal maps, front-wheel steering, suspension roll,
// Bajaj-style Visakhapatnam Auto-Rickshaws & Lathe-tank Motorcycles with articulated helmeted riders.
import { getActiveRoadSegments, getCoastSignedDistance, getTerrainHeight, latLngToWorld } from '../data/VizagGeoData.js';
import { HumanMeshBuilder } from './HumanMeshBuilder.js';

export class VehicleManager {
  constructor(THREE, scene, humanBuilder = null, textureManager = null) {
    this.THREE = THREE;
    this.scene = scene;
    this.humanBuilder = humanBuilder || new HumanMeshBuilder(THREE);
    this.tex = textureManager;
    this.vehicles = [];
    this.drivenVehicle = null;
    this.trafficDensity = 0.75;
    this.lightsActive = false;

    this._initSharedAssets();
    this._spawnSignatureParkedVehicles();
    this._spawnTrafficFleet();
  }

  _initSharedAssets() {
    const THREE = this.THREE;

    const tireMaps = this.tex ? this.tex.getTireTreadMaps() : null;
    this.tireMat = new THREE.MeshStandardMaterial({
      color: 0x171a1f,
      normalMap: tireMaps ? tireMaps.normalMap : null,
      normalScale: new THREE.Vector2(1.2, 1.2),
      roughnessMap: tireMaps ? tireMaps.roughnessMap : null,
      roughness: 0.84,
      metalness: 0.06
    });
    this.rimMat = new THREE.MeshStandardMaterial({
      color: 0xdbe2ea,
      metalness: 0.90,
      roughness: 0.16,
      envMapIntensity: 1.55
    });
    this.brakeDiscMat = new THREE.MeshStandardMaterial({
      color: 0x9aa4b0,
      metalness: 0.85,
      roughness: 0.28
    });
    this.caliperMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      metalness: 0.35,
      roughness: 0.32
    });
    this.interiorMat = new THREE.MeshStandardMaterial({
      color: 0x1c2026,
      roughness: 0.78,
      metalness: 0.08
    });
    this.seatMat = new THREE.MeshStandardMaterial({
      color: 0x2a2421,
      roughness: 0.68,
      metalness: 0.05
    });
    this.chromeMat = new THREE.MeshStandardMaterial({
      color: 0xeff3f8,
      metalness: 0.94,
      roughness: 0.10,
      envMapIntensity: 1.7
    });
    this.trimMat = new THREE.MeshStandardMaterial({
      color: 0x16191f,
      roughness: 0.48,
      metalness: 0.25
    });

    // Transparent tinted automotive glazing revealing sculpted 3D interior while reflecting Vizag sky IBL
    this.glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x152c3f,
      metalness: 0.10,
      roughness: 0.04,
      transparent: true,
      opacity: 0.42,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      envMapIntensity: 1.85
    });

    this.headlightMat = new THREE.MeshBasicMaterial({ color: 0xfff8dc });
    this.taillightIdleMat = new THREE.MeshBasicMaterial({ color: 0x8f1818 });
    this.taillightBrakeMat = new THREE.MeshBasicMaterial({ color: 0xff2828 });
    this.amberSignalMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    this.dashGlowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    this.beamConeMat = new THREE.MeshBasicMaterial({
      color: 0xfff2cc,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    // Indian AP-31 Visakhapatnam License Plate Texture
    const plateCanvas = document.createElement('canvas');
    plateCanvas.width = 256;
    plateCanvas.height = 64;
    const pCtx = plateCanvas.getContext('2d');
    pCtx.fillStyle = '#f1f5f9';
    pCtx.fillRect(0, 0, 256, 64);
    pCtx.fillStyle = '#1d4ed8';
    pCtx.fillRect(0, 0, 26, 64);
    pCtx.fillStyle = '#111827';
    pCtx.font = 'bold 30px sans-serif';
    pCtx.textAlign = 'center';
    pCtx.fillText('AP 31 VK 2026', 142, 42);
    const plateTex = new THREE.CanvasTexture(plateCanvas);
    plateTex.colorSpace = THREE.SRGBColorSpace;
    this.plateMat = new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.35, metalness: 0.1 });

    // Shared Lathe-profiled Tire Geometry Builder helper (rounded shoulder cross-section)
    this.geo = {};
    const makeTireGeo = (rOuter, rInner, halfW) => {
      const pts = [
        new THREE.Vector2(rInner, -halfW * 0.85),
        new THREE.Vector2(rOuter * 0.96, -halfW),
        new THREE.Vector2(rOuter, -halfW * 0.72),
        new THREE.Vector2(rOuter, halfW * 0.72),
        new THREE.Vector2(rOuter * 0.96, halfW),
        new THREE.Vector2(rInner, halfW * 0.85)
      ];
      const g = new THREE.LatheGeometry(pts, 20);
      g.rotateZ(Math.PI / 2);
      g.computeVertexNormals();
      return g;
    };

    this.geo.carTire = makeTireGeo(0.355, 0.215, 0.125);
    this.geo.carBrakeDisc = new THREE.CylinderGeometry(0.18, 0.18, 0.04, 16);
    this.geo.carBrakeDisc.rotateZ(Math.PI / 2);
    this.geo.carSpoke = new THREE.BoxGeometry(0.032, 0.37, 0.042);
    this.geo.carHub = new THREE.CylinderGeometry(0.065, 0.065, 0.08, 12);
    this.geo.carHub.rotateZ(Math.PI / 2);

    this.geo.bikeTire = makeTireGeo(0.34, 0.21, 0.075);
    this.geo.autoTire = makeTireGeo(0.275, 0.145, 0.085);

    // Prebuild aerodynamic Car & Sport Chassis ExtrudeGeometries
    this.geo.sedanBody = this._buildCarBodyGeo(false);
    this.geo.sportBody = this._buildCarBodyGeo(true);
    this.geo.sedanGreenhouse = this._buildCarCabinGeo(false);
    this.geo.sportGreenhouse = this._buildCarCabinGeo(true);
    this.geo.bikeTank = this._buildBikeTankGeo();
  }

  _buildCarBodyGeo(isSport) {
    const THREE = this.THREE;
    // 2D Side profile (x = Z length [-2.28..+2.28], y = height) -> extruded across width 1.84m
    const s = new THREE.Shape();
    const hoodY = isSport ? 0.80 : 0.86;
    const beltY = isSport ? 0.90 : 0.95;
    const deckY = isSport ? 0.92 : 0.96;

    s.moveTo(-2.22, 0.26);
    s.lineTo(-1.82, 0.26);
    // Rear wheel arch cutout
    s.absarc(-1.38, 0.34, 0.42, Math.PI * 1.06, -0.06, true);
    s.lineTo(0.96, 0.25);
    // Front wheel arch cutout
    s.absarc(1.38, 0.34, 0.42, Math.PI * 1.06, -0.06, true);
    s.lineTo(2.16, 0.25);
    s.lineTo(2.28, 0.38);
    s.quadraticCurveTo(2.30, hoodY - 0.12, 2.15, hoodY - 0.04);
    s.quadraticCurveTo(1.65, hoodY + 0.06, 0.92, beltY);
    s.lineTo(-1.45, deckY);
    s.quadraticCurveTo(-2.12, deckY, -2.26, deckY - 0.18);
    s.closePath();

    const width = 1.76;
    const g = new THREE.ExtrudeGeometry(s, {
      depth: width,
      bevelEnabled: true,
      bevelThickness: 0.09,
      bevelSize: 0.06,
      bevelSegments: 2,
      curveSegments: 10
    });
    g.translate(0, 0, -width * 0.5);
    g.rotateY(-Math.PI / 2);
    g.computeVertexNormals();
    return g;
  }

  _buildCarCabinGeo(isSport) {
    const THREE = this.THREE;
    const s = new THREE.Shape();
    const baseY = isSport ? 0.87 : 0.92;
    const roofY = isSport ? 1.35 : 1.44;
    s.moveTo(-1.48, baseY);
    s.lineTo(0.86, baseY);
    s.lineTo(0.28, roofY);
    s.lineTo(isSport ? -0.78 : -0.96, roofY);
    s.closePath();

    const width = 1.48;
    const g = new THREE.ExtrudeGeometry(s, {
      depth: width,
      bevelEnabled: true,
      bevelThickness: 0.045,
      bevelSize: 0.035,
      bevelSegments: 2
    });
    g.translate(0, 0, -width * 0.5);
    g.rotateY(-Math.PI / 2);
    g.computeVertexNormals();
    return g;
  }

  _buildBikeTankGeo() {
    const THREE = this.THREE;
    const pts = [
      new THREE.Vector2(0.01, -0.32),
      new THREE.Vector2(0.11, -0.26),
      new THREE.Vector2(0.16, -0.05),
      new THREE.Vector2(0.19, 0.14),
      new THREE.Vector2(0.14, 0.28),
      new THREE.Vector2(0.01, 0.34)
    ];
    const g = new THREE.LatheGeometry(pts, 14);
    g.rotateX(Math.PI / 2);
    g.scale(0.95, 0.78, 1.0);
    g.computeVertexNormals();
    return g;
  }

  _createCarWheelAssembly(sideSign, isFront) {
    const THREE = this.THREE;
    const steerPivot = new THREE.Group();
    const spinGroup = new THREE.Group();
    steerPivot.add(spinGroup);

    const tire = new THREE.Mesh(this.geo.carTire, this.tireMat);
    tire.castShadow = true;
    spinGroup.add(tire);

    const rotor = new THREE.Mesh(this.geo.carBrakeDisc, this.brakeDiscMat);
    rotor.position.x = -sideSign * 0.03;
    spinGroup.add(rotor);

    // 5-spoke sculpted metallic alloy wheel face
    const rimFace = new THREE.Group();
    rimFace.position.x = sideSign * 0.07;
    const hub = new THREE.Mesh(this.geo.carHub, this.rimMat);
    rimFace.add(hub);
    for (let k = 0; k < 5; k++) {
      const sp = new THREE.Mesh(this.geo.carSpoke, this.rimMat);
      sp.rotation.x = (k / 5) * Math.PI;
      rimFace.add(sp);
    }
    spinGroup.add(rimFace);

    // Stationary brake caliper inside wheel barrel
    const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.08), this.caliperMat);
    caliper.position.set(-sideSign * 0.01, 0.06, isFront ? -0.14 : 0.14);
    steerPivot.add(caliper);

    return { steerPivot, spinGroup };
  }

  setLightsActive(active) {
    if (this.lightsActive === active) return;
    this.lightsActive = active;
    this.beamConeMat.opacity = active ? 0.18 : 0.0;
    this.headlightMat.color.setHex(active ? 0xffffff : 0xfff5d6);
  }

  _createCarMesh(colorHex, isSport = false) {
    const THREE = this.THREE;
    const outer = new THREE.Group();
    const bodyNode = new THREE.Group();
    outer.add(bodyNode);

    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: colorHex,
      metalness: 0.58,
      roughness: 0.20,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      envMapIntensity: 1.55
    });

    // 1. Extruded Aerodynamic Sculpted Chassis
    const chassis = new THREE.Mesh(
      isSport ? this.geo.sportBody : this.geo.sedanBody,
      bodyMat
    );
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    bodyNode.add(chassis);

    // 2. Front Hood Power Bulge + Lower Aero Splitter & Mesh Grille
    const hoodBulge = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.06, 1.15), bodyMat);
    hoodBulge.position.set(0, isSport ? 0.88 : 0.94, 1.48);
    hoodBulge.rotation.x = 0.08;
    bodyNode.add(hoodBulge);

    const frontSplitter = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.08, 0.26), this.trimMat);
    frontSplitter.position.set(0, 0.25, 2.24);
    bodyNode.add(frontSplitter);

    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.22, 0.08), this.trimMat);
    grille.position.set(0, 0.52, 2.29);
    const grilleBar = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.035, 0.09), this.chromeMat);
    grilleBar.position.set(0, 0.55, 2.30);
    bodyNode.add(grille, grilleBar);

    // Side rocker skirts & rear diffuser + twin chrome exhaust tips
    for (const sx of [-0.94, 0.94]) {
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.09, 1.86), this.trimMat);
      skirt.position.set(sx, 0.26, 0);
      bodyNode.add(skirt);
    }

    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.14, 0.14), this.trimMat);
    diffuser.position.set(0, 0.28, -2.26);
    bodyNode.add(diffuser);

    for (const ex of [-0.54, 0.54]) {
      const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.16, 10), this.chromeMat);
      exhaust.rotation.x = Math.PI / 2;
      exhaust.position.set(ex, 0.26, -2.31);
      bodyNode.add(exhaust);
    }

    // 3. Detailed 3D Interior (Dashboard, Infotainment Screen, Steering Wheel, Dual Bucket Seats)
    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.24, 0.42), this.interiorMat);
    dash.position.set(0, 0.96, 0.62);
    const infoScreen = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.04), this.dashGlowMat);
    infoScreen.position.set(0, 1.07, 0.48);
    // Right-hand drive (Indian Vizag standard!)
    const steerCol = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.26, 8), this.trimMat);
    steerCol.rotation.x = 0.75;
    steerCol.position.set(0.36, 0.98, 0.46);
    const steerRim = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.024, 8, 16), this.trimMat);
    steerRim.rotation.x = 0.52;
    steerRim.position.set(0.36, 1.05, 0.37);
    const centerConsole = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 1.05), this.interiorMat);
    centerConsole.position.set(0, 0.72, 0.02);
    bodyNode.add(dash, infoScreen, steerCol, steerRim, centerConsole);

    for (const sx of [-0.36, 0.36]) {
      const seatBase = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.46), this.seatMat);
      seatBase.position.set(sx, 0.68, -0.08);
      const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.56, 0.14), this.seatMat);
      seatBack.position.set(sx, 0.98, -0.28);
      seatBack.rotation.x = -0.18;
      const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.11), this.seatMat);
      headrest.position.set(sx, 1.29, -0.34);
      bodyNode.add(seatBase, seatBack, headrest);
    }

    // 4. Transparent Glazed Greenhouse + Painted Roof Cap & A/B/C Pillars
    const glassCabin = new THREE.Mesh(
      isSport ? this.geo.sportGreenhouse : this.geo.sedanGreenhouse,
      this.glassMat
    );
    glassCabin.castShadow = true;
    bodyNode.add(glassCabin);

    const roofY = isSport ? 1.37 : 1.46;
    const roofCap = new THREE.Mesh(
      new THREE.BoxGeometry(1.42, 0.06, isSport ? 1.16 : 1.32),
      bodyMat
    );
    roofCap.position.set(0, roofY, isSport ? -0.24 : -0.32);
    roofCap.castShadow = true;
    bodyNode.add(roofCap);

    // Side mirrors & chrome door handles
    for (const sx of [-0.98, 0.98]) {
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.10, 0.16), bodyMat);
      mirror.position.set(sx, 0.98, 0.62);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.18), this.chromeMat);
      handle.position.set(sx * 0.95, 0.84, 0.04);
      bodyNode.add(mirror, handle);
    }

    if (isSport) {
      for (const sx of [-0.52, 0.52]) {
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.12), this.trimMat);
        strut.position.set(sx, 1.0, -2.02);
        bodyNode.add(strut);
      }
      const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.05, 0.28), this.trimMat);
      spoiler.position.set(0, 1.10, -2.06);
      spoiler.rotation.x = 0.08;
      bodyNode.add(spoiler);
    }

    // 5. Recessed Headlights + Night Beam Cones + Taillights + AP-31 Plates
    for (const sx of [-0.66, 0.66]) {
      const hlHousing = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.10), this.trimMat);
      hlHousing.position.set(sx, 0.70, 2.24);
      const hlLens = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.09, 0.06), this.headlightMat);
      hlLens.position.set(sx, 0.70, 2.28);
      bodyNode.add(hlHousing, hlLens);
    }

    const beam = new THREE.Mesh(new THREE.ConeGeometry(2.6, 12.5, 12, 1, true), this.beamConeMat);
    beam.rotation.x = -Math.PI / 2;
    beam.position.set(0, 0.56, 8.4);
    bodyNode.add(beam);

    const tlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.13, 0.07), this.taillightIdleMat);
    tlLeft.position.set(-0.66, 0.78, -2.26);
    const tlRight = tlLeft.clone();
    tlRight.position.x = 0.66;
    const tlCenterBar = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.045, 0.06), this.taillightIdleMat);
    tlCenterBar.position.set(0, 0.78, -2.26);
    bodyNode.add(tlLeft, tlRight, tlCenterBar);

    const frontPlate = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.02), this.plateMat);
    frontPlate.position.set(0, 0.38, 2.31);
    const rearPlate = frontPlate.clone();
    rearPlate.position.set(0, 0.52, -2.28);
    bodyNode.add(frontPlate, rearPlate);

    // 6. Four Steerable & Spinning Wheel Assemblies with Brake Calipers
    const wheels = [];
    const frontSteerPivots = [];
    const offsets = [
      [-0.90, 0.355, 1.38, -1, true],
      [0.90, 0.355, 1.38, 1, true],
      [-0.90, 0.355, -1.38, -1, false],
      [0.90, 0.355, -1.38, 1, false]
    ];
    for (const [wx, wy, wz, sideSign, isFront] of offsets) {
      const asm = this._createCarWheelAssembly(sideSign, isFront);
      asm.steerPivot.position.set(wx, wy, wz);
      outer.add(asm.steerPivot);
      wheels.push(asm.spinGroup);
      if (isFront) frontSteerPivots.push(asm.steerPivot);
    }

    return {
      group: outer,
      wheels,
      frontSteerPivots,
      tailLights: [tlLeft, tlRight, tlCenterBar],
      leanNode: bodyNode
    };
  }

  _createAutoRickshawMesh() {
    const THREE = this.THREE;
    const outer = new THREE.Group();
    const bodyNode = new THREE.Group();
    outer.add(bodyNode);

    const yellowMat = new THREE.MeshPhysicalMaterial({
      color: 0xf4b41a,
      roughness: 0.30,
      metalness: 0.25,
      clearcoat: 0.85,
      clearcoatRoughness: 0.12,
      envMapIntensity: 1.35
    });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x1c2026, roughness: 0.82 });

    // Curved Bajaj Auto-Rickshaw nose & passenger tub via ExtrudeGeometry
    const tubShape = new THREE.Shape();
    tubShape.moveTo(-1.30, 0.25);
    tubShape.lineTo(-0.55, 0.25);
    tubShape.lineTo(-0.42, 0.32);
    tubShape.lineTo(0.45, 0.32);
    tubShape.lineTo(0.65, 0.25);
    tubShape.lineTo(1.26, 0.28);
    tubShape.quadraticCurveTo(1.38, 0.65, 1.05, 0.96);
    tubShape.lineTo(0.75, 0.96);
    tubShape.lineTo(0.68, 0.42);
    tubShape.lineTo(-0.35, 0.42);
    tubShape.lineTo(-0.42, 0.92);
    tubShape.lineTo(-1.26, 0.92);
    tubShape.closePath();

    const tubGeo = new THREE.ExtrudeGeometry(tubShape, {
      depth: 1.24,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.04,
      bevelSegments: 2
    });
    tubGeo.translate(0, 0, -0.62);
    tubGeo.rotateY(-Math.PI / 2);
    tubGeo.computeVertexNormals();

    const tub = new THREE.Mesh(tubGeo, yellowMat);
    tub.castShadow = true;
    tub.receiveShadow = true;
    bodyNode.add(tub);

    // Front mudguard & chrome bumper rail
    const mudguard = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.24, 12, 1, false, -0.8, 1.6), yellowMat);
    mudguard.rotation.z = Math.PI / 2;
    mudguard.position.set(0, 0.34, 1.02);
    const chromeBumper = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.18, 8), this.chromeMat);
    chromeBumper.rotation.z = Math.PI / 2;
    chromeBumper.position.set(0, 0.29, 1.32);
    bodyNode.add(mudguard, chromeBumper);

    // Tubular Roof Frame + Driver Saddle + Passenger Bench + Windshield
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.56, 0.05), this.glassMat);
    windshield.position.set(0, 1.22, 0.96);
    windshield.rotation.x = -0.18;
    bodyNode.add(windshield);

    const framePosts = [
      [-0.58, 1.24, 0.88],
      [0.58, 1.24, 0.88],
      [-0.60, 1.24, -1.16],
      [0.60, 1.24, -1.16]
    ];
    for (const [px, py, pz] of framePosts) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.72, 6), this.trimMat);
      post.position.set(px, py, pz);
      bodyNode.add(post);
    }

    const driverSeat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.38), this.seatMat);
    driverSeat.position.set(0, 0.62, 0.38);
    const passBench = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.16, 0.48), this.seatMat);
    passBench.position.set(0, 0.64, -0.78);
    const passBack = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.52, 0.14), this.seatMat);
    passBack.position.set(0, 0.94, -1.04);
    const handlebar = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.04, 0.04), this.chromeMat);
    handlebar.position.set(0, 1.00, 0.78);
    bodyNode.add(driverSeat, passBench, passBack, handlebar);

    const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.14, 2.24), canopyMat);
    canopy.position.set(0, 1.56, -0.16);
    canopy.castShadow = true;
    const canopyBack = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.66, 0.08), canopyMat);
    canopyBack.position.set(0, 1.22, -1.24);
    bodyNode.add(canopy, canopyBack);

    const hlRing = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 12), this.chromeMat);
    hlRing.rotation.x = Math.PI / 2;
    hlRing.position.set(0, 0.72, 1.28);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), this.headlightMat);
    hl.position.set(0, 0.72, 1.30);

    const tlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.11, 0.07), this.taillightIdleMat);
    tlLeft.position.set(-0.44, 0.58, -1.32);
    const tlRight = tlLeft.clone();
    tlRight.position.x = 0.44;
    const rearPlate = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.11, 0.02), this.plateMat);
    rearPlate.position.set(0, 0.44, -1.32);
    bodyNode.add(hlRing, hl, tlLeft, tlRight, rearPlate);

    const wheels = [];
    const frontSteerPivots = [];
    for (const [wx, wz, isFront] of [[0, 1.02, true], [-0.64, -0.94, false], [0.64, -0.94, false]]) {
      const steerPivot = new THREE.Group();
      steerPivot.position.set(wx, 0.275, wz);
      const spinGroup = new THREE.Group();
      steerPivot.add(spinGroup);

      const tire = new THREE.Mesh(this.geo.autoTire, this.tireMat);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.14, 10), this.rimMat);
      hub.rotation.z = Math.PI / 2;
      spinGroup.add(tire, hub);
      outer.add(steerPivot);
      wheels.push(spinGroup);
      if (isFront) frontSteerPivots.push(steerPivot);
    }

    return {
      group: outer,
      wheels,
      frontSteerPivots,
      tailLights: [tlLeft, tlRight],
      leanNode: bodyNode
    };
  }

  _createBikeMesh(colorHex) {
    const THREE = this.THREE;
    const outer = new THREE.Group();
    const leanNode = new THREE.Group();
    outer.add(leanNode);

    const paintMat = new THREE.MeshPhysicalMaterial({
      color: colorHex,
      metalness: 0.68,
      roughness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      envMapIntensity: 1.6
    });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x262b33, metalness: 0.80, roughness: 0.30 });

    // Sculpted Teardrop Fuel Tank + Stepped Quilted Seat + Crankcase + Chrome Muffler
    const tank = new THREE.Mesh(this.geo.bikeTank, paintMat);
    tank.position.set(0, 0.90, 0.22);
    tank.rotation.x = -0.14;
    tank.castShadow = true;

    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.12, 0.68), this.seatMat);
    saddle.position.set(0, 0.82, -0.32);
    saddle.rotation.x = 0.06;

    const engineBlock = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.44), frameMat);
    engineBlock.position.set(0, 0.52, 0.08);
    const tailCowl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.42), paintMat);
    tailCowl.position.set(0, 0.86, -0.68);
    tailCowl.rotation.x = 0.18;

    const muffler = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.048, 0.85, 10), this.chromeMat);
    muffler.rotation.x = Math.PI / 2 - 0.10;
    muffler.position.set(0.18, 0.42, -0.36);

    leanNode.add(tank, saddle, engineBlock, tailCowl, muffler);

    // Twin Telescopic Front Forks + Chrome Retro Headlamp + Flyscreen + Wide Handlebars
    const steerGroup = new THREE.Group();
    for (const fx of [-0.11, 0.11]) {
      const forkTube = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.88, 8), this.chromeMat);
      forkTube.position.set(fx, 0.72, 0.68);
      forkTube.rotation.x = -0.30;
      steerGroup.add(forkTube);
    }
    const bars = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.036, 0.036), this.chromeMat);
    bars.position.set(0, 1.09, 0.50);
    const hlBody = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.10, 0.14, 12), this.chromeMat);
    hlBody.rotation.x = Math.PI / 2;
    hlBody.position.set(0, 0.94, 0.74);
    const headlight = new THREE.Mesh(new THREE.SphereGeometry(0.105, 10, 8), this.headlightMat);
    headlight.position.set(0, 0.94, 0.80);
    const flyscreen = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.03), this.glassMat);
    flyscreen.position.set(0, 1.12, 0.66);
    flyscreen.rotation.x = -0.45;
    steerGroup.add(bars, hlBody, headlight, flyscreen);
    leanNode.add(steerGroup);

    const beam = new THREE.Mesh(new THREE.ConeGeometry(1.7, 9.5, 10, 1, true), this.beamConeMat);
    beam.rotation.x = -Math.PI / 2;
    beam.position.set(0, 0.55, 5.6);
    leanNode.add(beam);

    const tailLight = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.08, 0.07), this.taillightIdleMat);
    tailLight.position.set(0, 0.88, -0.89);
    leanNode.add(tailLight);

    // Full Articulated Sculpted Human Rider with Glossy Visor Helmet (seated pose)
    const riderRig = this.humanBuilder.createSculptedHuman({
      skinColor: 0xc2835a,
      shirtColor: 0x0f172a,
      jacketColor: 0x1e3a5f,
      trouserColor: 0x1e293b,
      shoeColor: 0x18181b,
      hasJacket: true,
      withHelmet: true,
      helmetColor: 0xf59e0b,
      scale: 0.94
    });
    riderRig.root.position.set(0, 0.28, -0.22);
    riderRig.spineJoint.rotation.x = 0.28;
    riderRig.leftArm.shoulderJoint.rotation.x = -0.85;
    riderRig.leftArm.elbowJoint.rotation.x = -0.45;
    riderRig.rightArm.shoulderJoint.rotation.x = -0.85;
    riderRig.rightArm.elbowJoint.rotation.x = -0.45;
    riderRig.leftLeg.hipJoint.rotation.x = -1.05;
    riderRig.leftLeg.kneeJoint.rotation.x = 1.25;
    riderRig.leftLeg.hipJoint.rotation.z = -0.18;
    riderRig.rightLeg.hipJoint.rotation.x = -1.05;
    riderRig.rightLeg.kneeJoint.rotation.x = 1.25;
    riderRig.rightLeg.hipJoint.rotation.z = 0.18;
    riderRig.root.visible = false;
    leanNode.add(riderRig.root);

    const wheels = [];
    for (const wz of [0.84, -0.76]) {
      const wGroup = new THREE.Group();
      wGroup.position.set(0, 0.34, wz);
      const tire = new THREE.Mesh(this.geo.bikeTire, this.tireMat);
      tire.castShadow = true;
      const rim = new THREE.Mesh(this.geo.carBrakeDisc, this.rimMat);
      wGroup.add(tire, rim);
      leanNode.add(wGroup);
      wheels.push(wGroup);
    }

    return {
      group: outer,
      wheels,
      frontSteerPivots: [],
      tailLights: [tailLight],
      leanNode,
      riderGroup: riderRig.root
    };
  }

  _spawnSignatureParkedVehicles() {
    const coupePt = latLngToWorld(17.7140, 83.3222);
    const bikePt = latLngToWorld(17.7147, 83.3230);
    const autoPt = latLngToWorld(17.7131, 83.3212);

    this._addVehicle({
      id: 'gt_coupe',
      name: 'Vizag GT Coupe',
      type: 'CAR',
      x: coupePt.x,
      z: coupePt.z,
      yaw: 0.72,
      color: 0x1d70ff,
      isSport: true,
      maxSpeed: 30.0,
      accel: 17.0,
      aiTraffic: false
    });

    this._addVehicle({
      id: 'coastal_bike',
      name: 'Coastal 350 Bike',
      type: 'BIKE',
      x: bikePt.x,
      z: bikePt.z,
      yaw: 0.72,
      color: 0xdc2626,
      isSport: false,
      maxSpeed: 26.8,
      accel: 19.5,
      aiTraffic: false
    });

    this._addVehicle({
      id: 'vizag_auto',
      name: 'Vizag City Auto',
      type: 'AUTO',
      x: autoPt.x,
      z: autoPt.z,
      yaw: 0.72 + Math.PI,
      color: 0xf4b41a,
      isSport: false,
      maxSpeed: 18.5,
      accel: 12.5,
      aiTraffic: false
    });
  }

  _spawnTrafficFleet() {
    const trafficPalette = [0xe2e8f0, 0x2563eb, 0xd97706, 0xdc2626, 0x059669, 0x475569];
    const roadSegs = getActiveRoadSegments();
    if (!roadSegs || roadSegs.length === 0) return;

    const count = Math.min(16, Math.max(8, roadSegs.length));
    for (let i = 0; i < count; i++) {
      const seg = roadSegs[i % roadSegs.length];
      const t = ((i * 0.23) % 0.76) + 0.12;
      const dir = i % 2 === 0 ? 1 : -1;
      const kind = i % 4 === 2 ? 'AUTO' : (i % 4 === 3 ? 'BIKE' : 'CAR');

      const vx = seg.x2 - seg.x1;
      const vz = seg.z2 - seg.z1;
      const segYaw = Math.atan2(vx, vz);
      const laneOffset = dir * 3.8;
      const perpX = Math.cos(segYaw) * laneOffset;
      const perpZ = -Math.sin(segYaw) * laneOffset;

      const sx = seg.x1 + vx * t + perpX;
      const sz = seg.z1 + vz * t + perpZ;

      const v = this._addVehicle({
        id: `traffic_${i}`,
        name: kind === 'AUTO' ? 'Vizag Auto-Rickshaw' : (kind === 'BIKE' ? 'Commuter Bike' : 'Coastal Sedan'),
        type: kind,
        x: sx,
        z: sz,
        yaw: dir === 1 ? segYaw : segYaw + Math.PI,
        color: trafficPalette[i % trafficPalette.length],
        isSport: false,
        maxSpeed: kind === 'AUTO' ? 18.0 : 24.5,
        accel: 14.0,
        aiTraffic: true
      });
      v.roadSeg = seg;
      v.roadProgress = t;
      v.roadDir = dir;
    }
  }

  respawnTrafficOnActiveRoads() {
    const roadSegs = getActiveRoadSegments();
    if (!roadSegs || roadSegs.length === 0) return;
    let idx = 0;
    for (const tv of this.vehicles) {
      if (!tv.aiTraffic) continue;
      const seg = roadSegs[idx % roadSegs.length];
      tv.roadSeg = seg;
      tv.roadProgress = ((idx * 0.23) % 0.76) + 0.12;
      tv.roadDir = idx % 2 === 0 ? 1 : -1;
      idx++;
    }
  }

  _addVehicle(cfg) {
    let built;
    if (cfg.type === 'BIKE') built = this._createBikeMesh(cfg.color);
    else if (cfg.type === 'AUTO') built = this._createAutoRickshawMesh();
    else built = this._createCarMesh(cfg.color, cfg.isSport);

    const y = getTerrainHeight(cfg.x, cfg.z);
    built.group.position.set(cfg.x, y, cfg.z);
    built.group.rotation.y = cfg.yaw;
    this.scene.add(built.group);

    const vehicle = {
      id: cfg.id,
      name: cfg.name,
      type: cfg.type,
      mesh: built.group,
      wheels: built.wheels,
      frontSteerPivots: built.frontSteerPivots || [],
      tailLights: built.tailLights,
      leanNode: built.leanNode,
      riderGroup: built.riderGroup || null,
      x: cfg.x,
      y,
      z: cfg.z,
      yaw: cfg.yaw,
      speed: 0,
      maxSpeed: cfg.maxSpeed,
      accel: cfg.accel,
      condition: 100,
      radius: cfg.type === 'BIKE' ? 0.95 : (cfg.type === 'AUTO' ? 1.35 : 1.85),
      aiTraffic: cfg.aiTraffic,
      roadSeg: null,
      roadProgress: 0,
      roadDir: 1
    };
    this.vehicles.push(vehicle);
    return vehicle;
  }

  getActiveHeadlightPose() {
    if (!this.drivenVehicle) return null;
    const v = this.drivenVehicle;
    return {
      x: v.x + Math.sin(v.yaw) * 11.0,
      y: v.y,
      z: v.z + Math.cos(v.yaw) * 11.0
    };
  }

  spawnGarageVehicleNearPlayer(vehicleKey, playerController) {
    if (this.drivenVehicle) {
      this.tryEnterOrExit(playerController);
    }
    const target =
      this.vehicles.find((v) => v.id === vehicleKey) || this.vehicles[0];
    const sx = playerController.position.x - 3.2;
    const sz = playerController.position.z - 2.0;
    target.aiTraffic = false;
    target.x = sx;
    target.z = sz;
    target.y = getTerrainHeight(sx, sz);
    target.yaw = playerController.yaw;
    target.speed = 0;
    target.condition = 100;
    target.mesh.position.set(target.x, target.y, target.z);
    target.mesh.rotation.y = target.yaw;
    return target.name;
  }

  findNearestVehicle(px, pz) {
    let nearest = null;
    let bestDist = Infinity;
    for (const v of this.vehicles) {
      if (!v.mesh.visible) continue;
      const d = Math.hypot(v.x - px, v.z - pz);
      if (d < bestDist) {
        bestDist = d;
        nearest = v;
      }
    }
    return { vehicle: nearest, distance: bestDist };
  }

  tryEnterOrExit(playerController) {
    if (this.drivenVehicle) {
      const v = this.drivenVehicle;
      v.speed = 0;
      if (v.riderGroup) v.riderGroup.visible = false;
      v.leanNode.rotation.set(0, 0, 0);
      for (const p of v.frontSteerPivots) p.rotation.y = 0;

      const exitX = v.x - Math.cos(v.yaw) * 2.3;
      const exitZ = v.z + Math.sin(v.yaw) * 2.3;
      playerController.setInVehicle(false);
      playerController.teleport(exitX, exitZ, v.yaw);
      this.drivenVehicle = null;
      return { entered: false, message: `Exited ${v.name}` };
    }

    const { vehicle, distance } = this.findNearestVehicle(
      playerController.position.x,
      playerController.position.z
    );

    if (vehicle && distance <= 15.0) {
      vehicle.aiTraffic = false;
      this.drivenVehicle = vehicle;
      if (vehicle.riderGroup) vehicle.riderGroup.visible = true;
      playerController.setInVehicle(true);
      playerController.position.set(vehicle.x, vehicle.y, vehicle.z);
      return { entered: true, message: `Driving ${vehicle.name}` };
    }

    return {
      entered: false,
      message: `Move closer to a vehicle (${Math.round(distance)}m away)`
    };
  }

  update(dt, steerX, throttle, brake, reverse, handbrake, playerController, colliders) {
    if (this.drivenVehicle) {
      const v = this.drivenVehicle;

      if (handbrake > 0.1) {
        v.speed *= Math.max(0, 1 - dt * 6.5);
        if (Math.abs(v.speed) < 0.2) v.speed = 0;
      } else if (throttle > 0.05) {
        v.speed += v.accel * throttle * dt;
      } else if (reverse > 0.05) {
        if (v.speed > 0.8) {
          v.speed -= 26.0 * dt;
        } else {
          v.speed -= 10.5 * reverse * dt;
        }
      } else if (brake > 0.05) {
        if (v.speed > 0.4) {
          v.speed -= 28.0 * brake * dt;
        } else if (v.speed < -0.4) {
          v.speed += 24.0 * brake * dt;
        } else {
          v.speed = 0;
        }
      } else {
        v.speed *= Math.max(0, 1 - dt * 1.75);
        if (Math.abs(v.speed) < 0.08) v.speed = 0;
      }

      v.speed = Math.max(-11.0, Math.min(v.maxSpeed, v.speed));

      const brakingGlow = brake > 0.05 || handbrake > 0.1 || reverse > 0.05;
      const tailMat = brakingGlow ? this.taillightBrakeMat : this.taillightIdleMat;
      for (const tl of v.tailLights) tl.material = tailMat;

      // Animate visible front wheel steering angle
      const targetSteerAngle = -steerX * 0.42;
      for (const p of v.frontSteerPivots) {
        p.rotation.y += (targetSteerAngle - p.rotation.y) * Math.min(1, dt * 12);
      }

      if (Math.abs(v.speed) > 0.35) {
        const dirSign = v.speed >= 0 ? 1 : -1;
        const turnRate = v.type === 'BIKE' ? 2.5 : (v.type === 'AUTO' ? 2.35 : 1.95);
        const driftBoost = handbrake > 0.1 ? 1.35 : 1.0;
        const speedFactor = Math.min(1.0, Math.abs(v.speed) / 6.0);
        v.yaw -= steerX * turnRate * driftBoost * speedFactor * dirSign * dt;
      }

      const targetPitch = throttle > 0.05 ? -0.025 : (brakingGlow && Math.abs(v.speed) > 2 ? 0.035 : 0);
      const targetRoll =
        v.type === 'BIKE'
          ? -steerX * Math.min(0.42, Math.abs(v.speed) * 0.022)
          : steerX * Math.min(0.052, Math.abs(v.speed) * 0.0032);
      v.leanNode.rotation.x += (targetPitch - v.leanNode.rotation.x) * Math.min(1, dt * 8);
      v.leanNode.rotation.z += (targetRoll - v.leanNode.rotation.z) * Math.min(1, dt * 9);

      let nextX = v.x + Math.sin(v.yaw) * v.speed * dt;
      let nextZ = v.z + Math.cos(v.yaw) * v.speed * dt;

      const nextSurf =
        colliders && typeof colliders.getSurfaceInfo === 'function'
          ? colliders.getSurfaceInfo(nextX, v.y, nextZ)
          : null;
      const onBridgeOrFlyover = nextSurf && nextSurf.groundY > getTerrainHeight(nextX, nextZ) + 0.45;
      if (!onBridgeOrFlyover && getCoastSignedDistance(nextX, nextZ) < -1.8) {
        nextX = v.x;
        nextZ = v.z;
        v.speed *= -0.25;
      }

      if (colliders && typeof colliders.resolveCircleXZ === 'function') {
        const res = colliders.resolveCircleXZ(nextX, v.y, nextZ, v.radius, true);
        if (res.collided) {
          nextX = res.x;
          nextZ = res.z;
          if (Math.abs(v.speed) > 6) {
            v.condition = Math.max(20, v.condition - Math.round(Math.abs(v.speed) * 0.5));
          }
          v.speed *= -0.25;
        }
      }

      v.x = nextX;
      v.z = nextZ;
      if (colliders && typeof colliders.getSurfaceInfo === 'function') {
        v.y = colliders.getSurfaceInfo(v.x, v.y, v.z).groundY;
      } else {
        v.y = getTerrainHeight(v.x, v.z);
      }

      const ax = v.x + Math.sin(v.yaw) * 2.0;
      const az = v.z + Math.cos(v.yaw) * 2.0;
      const aheadY =
        colliders && typeof colliders.getSurfaceInfo === 'function'
          ? colliders.getSurfaceInfo(ax, v.y, az).groundY
          : getTerrainHeight(ax, az);
      const slopePitch = -Math.atan2(aheadY - v.y, 2.0);

      v.mesh.rotation.order = 'YXZ';
      v.mesh.position.set(v.x, v.y, v.z);
      v.mesh.rotation.y = v.yaw;
      v.mesh.rotation.x = slopePitch;

      for (const w of v.wheels) {
        w.rotation.x += (v.speed * dt) / 0.35;
      }

      playerController.position.set(v.x, v.y, v.z);
      playerController.yaw = v.yaw;
    }

    const px = playerController.position.x;
    const pz = playerController.position.z;

    for (let idx = 0; idx < this.vehicles.length; idx++) {
      const tv = this.vehicles[idx];
      if (!tv.aiTraffic || !tv.roadSeg) continue;

      const distPlayer = Math.hypot(px - tv.x, pz - tv.z);
      tv.mesh.visible = distPlayer < 250;
      if (!tv.mesh.visible) continue;

      const seg = tv.roadSeg;
      const segLen = Math.hypot(seg.x2 - seg.x1, seg.z2 - seg.z1);
      const fwdDot =
        ((px - tv.x) * Math.sin(tv.yaw) + (pz - tv.z) * Math.cos(tv.yaw)) / (distPlayer || 1);

      const shouldYield = distPlayer < 10.5 && fwdDot > 0.62;
      const targetAiSpeed = shouldYield ? 0 : 11.2;
      tv.speed += (targetAiSpeed - tv.speed) * Math.min(1, dt * 5);

      tv.roadProgress += (tv.roadDir * tv.speed * dt) / segLen;
      if (tv.roadProgress > 0.95) {
        tv.roadProgress = 0.95;
        tv.roadDir = -1;
      } else if (tv.roadProgress < 0.05) {
        tv.roadProgress = 0.05;
        tv.roadDir = 1;
      }

      const vx = seg.x2 - seg.x1;
      const vz = seg.z2 - seg.z1;
      const segYaw = Math.atan2(vx, vz);
      const laneOffset = tv.roadDir * 3.8;
      const perpX = Math.cos(segYaw) * laneOffset;
      const perpZ = -Math.sin(segYaw) * laneOffset;

      tv.x = seg.x1 + vx * tv.roadProgress + perpX;
      tv.z = seg.z1 + vz * tv.roadProgress + perpZ;
      tv.y =
        colliders && typeof colliders.getSurfaceInfo === 'function'
          ? colliders.getSurfaceInfo(tv.x, tv.y, tv.z).groundY
          : getTerrainHeight(tv.x, tv.z);
      tv.yaw = tv.roadDir === 1 ? segYaw : segYaw + Math.PI;

      tv.mesh.position.set(tv.x, tv.y, tv.z);
      tv.mesh.rotation.y = tv.yaw;
      for (const w of tv.wheels) {
        w.rotation.x += (tv.speed * dt) / 0.35;
      }
    }
  }

  getActiveSpeedKmh() {
    if (!this.drivenVehicle) return 0;
    return Math.round(Math.abs(this.drivenVehicle.speed) * 3.6);
  }
}
