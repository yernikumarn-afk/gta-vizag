// Sculpted Anatomical Human Mesh & Multi-Joint Skeletal Hierarchy Builder
// Eliminates stick-figure / block silhouettes with lathe-profiled anatomy, tailored clothing,
// cranial head/face/hair geometry, articulated hands/feet, and realistic knee/elbow/spine rig.

export class HumanMeshBuilder {
  constructor(THREE) {
    this.THREE = THREE;
    this.geo = {};
    this.textures = {};
    this._buildSharedTextures();
    this._buildSharedGeometries();
  }

  _buildSharedTextures() {
    const THREE = this.THREE;

    // Fabric & Denim Micro-Weave Normal/Bump Texture
    const weaveCanvas = document.createElement('canvas');
    weaveCanvas.width = 128;
    weaveCanvas.height = 128;
    const wCtx = weaveCanvas.getContext('2d');
    wCtx.fillStyle = '#808080';
    wCtx.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 2) {
      for (let x = 0; x < 128; x += 2) {
        const checker = ((x + y) / 2) % 2 === 0;
        wCtx.fillStyle = checker ? '#9c9c9c' : '#646464';
        wCtx.fillRect(x, y, 2, 2);
      }
    }
    const clothBump = new THREE.CanvasTexture(weaveCanvas);
    clothBump.wrapS = THREE.RepeatWrapping;
    clothBump.wrapT = THREE.RepeatWrapping;
    clothBump.repeat.set(6, 6);
    this.textures.clothBump = clothBump;

    // Subtle Human Face Details Albedo Overlay (eyes, brows, subtle nose/lip tone)
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = 256;
    faceCanvas.height = 256;
    const fCtx = faceCanvas.getContext('2d');
    fCtx.fillStyle = '#ffffff';
    fCtx.fillRect(0, 0, 256, 256);
    // Gentle jaw & cheek warmth shading
    const cheekGrad = fCtx.createRadialGradient(128, 138, 18, 128, 138, 96);
    cheekGrad.addColorStop(0, 'rgba(255,255,255,1)');
    cheekGrad.addColorStop(1, 'rgba(220,195,180,0.92)');
    fCtx.fillStyle = cheekGrad;
    fCtx.fillRect(0, 0, 256, 256);

    // Eyes & eyebrows positioned on front (+Z UV center around x=128)
    fCtx.fillStyle = '#1b1411';
    // Brows
    fCtx.fillRect(92, 102, 26, 5);
    fCtx.fillRect(138, 102, 26, 5);
    // Sclera & Iris
    fCtx.fillStyle = '#f4f1ea';
    fCtx.beginPath();
    fCtx.ellipse(105, 117, 10, 5.5, 0, 0, Math.PI * 2);
    fCtx.ellipse(151, 117, 10, 5.5, 0, 0, Math.PI * 2);
    fCtx.fill();
    fCtx.fillStyle = '#241812';
    fCtx.beginPath();
    fCtx.arc(105, 117, 4.2, 0, Math.PI * 2);
    fCtx.arc(151, 117, 4.2, 0, Math.PI * 2);
    fCtx.fill();
    // Subtle lips / mouth line
    fCtx.fillStyle = 'rgba(130, 68, 58, 0.72)';
    fCtx.fillRect(116, 160, 24, 3.5);

    const faceTex = new THREE.CanvasTexture(faceCanvas);
    faceTex.colorSpace = THREE.SRGBColorSpace;
    this.textures.faceOverlay = faceTex;
  }

  _latheProfile(points, segments = 14) {
    const THREE = this.THREE;
    const vecs = points.map(([r, y]) => new THREE.Vector2(Math.max(0.001, r), y));
    const g = new THREE.LatheGeometry(vecs, segments);
    g.computeVertexNormals();
    return g;
  }

  _buildSharedGeometries() {
    const THREE = this.THREE;

    // 1. Sculpted Male/Athletic Torso (waist -> obliques -> lat/ribcage -> broad shoulders -> collar)
    this.geo.torso = this._latheProfile([
      [0.01, -0.24],
      [0.145, -0.22],
      [0.138, -0.10],
      [0.155, 0.02],
      [0.182, 0.14],
      [0.192, 0.22],
      [0.165, 0.27],
      [0.085, 0.30],
      [0.01, 0.31]
    ], 16);

    // 2. Sculpted Pelvis & Hip Block
    this.geo.pelvis = this._latheProfile([
      [0.01, -0.11],
      [0.142, -0.09],
      [0.162, 0.0],
      [0.148, 0.10],
      [0.01, 0.12]
    ], 14);

    // 3. Cranial Head (egg-shaped skull with jaw taper) + Sculpted Nose & Ears
    this.geo.head = this._latheProfile([
      [0.01, -0.125],
      [0.068, -0.11],
      [0.095, -0.06],
      [0.108, 0.01],
      [0.112, 0.065],
      [0.095, 0.11],
      [0.055, 0.135],
      [0.005, 0.142]
    ], 16);

    this.geo.nose = new THREE.ConeGeometry(0.019, 0.048, 6);
    this.geo.ear = new THREE.SphereGeometry(0.022, 8, 6);
    this.geo.neck = this._latheProfile([
      [0.062, -0.06],
      [0.054, 0.0],
      [0.058, 0.06]
    ], 12);

    // Sculpted Hair Volume (crown cap + fringe/back)
    this.geo.hairCap = new THREE.SphereGeometry(0.117, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62);
    this.geo.hairBack = new THREE.SphereGeometry(0.108, 12, 8, Math.PI * 0.65, Math.PI * 1.7, Math.PI * 0.2, Math.PI * 0.55);

    // 4. Anatomical Upper Arm (Deltoid cap -> Bicep bulge -> Elbow joint)
    this.geo.upperArm = this._latheProfile([
      [0.01, 0.02],
      [0.062, 0.0],
      [0.058, -0.08],
      [0.052, -0.18],
      [0.044, -0.27],
      [0.01, -0.29]
    ], 12);

    // 5. Anatomical Forearm (Elbow -> Forearm extensor muscle -> Wrist)
    this.geo.forearm = this._latheProfile([
      [0.01, 0.02],
      [0.044, 0.0],
      [0.047, -0.06],
      [0.036, -0.18],
      [0.028, -0.25],
      [0.01, -0.26]
    ], 12);

    // 6. Sculpted Hand (Palm + curved fingers mass + thumb)
    const handShape = new THREE.Shape();
    handShape.moveTo(-0.026, 0);
    handShape.lineTo(0.026, 0);
    handShape.lineTo(0.028, -0.07);
    handShape.quadraticCurveTo(0.022, -0.135, 0.0, -0.145);
    handShape.quadraticCurveTo(-0.024, -0.135, -0.028, -0.07);
    handShape.closePath();
    this.geo.hand = new THREE.ExtrudeGeometry(handShape, {
      depth: 0.022,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.006,
      bevelSegments: 2
    });
    this.geo.hand.translate(0, 0, -0.011);

    // 7. Anatomical Thigh (Hip -> Quadriceps curve -> Knee)
    this.geo.thigh = this._latheProfile([
      [0.01, 0.03],
      [0.088, 0.0],
      [0.092, -0.12],
      [0.078, -0.26],
      [0.064, -0.39],
      [0.01, -0.42]
    ], 12);

    // 8. Anatomical Calf / Shin (Knee -> Gastrocnemius muscle -> Tapered Ankle)
    this.geo.calf = this._latheProfile([
      [0.01, 0.025],
      [0.064, 0.0],
      [0.069, -0.11],
      [0.052, -0.26],
      [0.041, -0.38],
      [0.01, -0.40]
    ], 12);

    // 9. Sculpted Low-Top Sneaker / Shoe (extruded curved sneaker silhouette + sole)
    const shoeShape = new THREE.Shape();
    shoeShape.moveTo(-0.05, -0.09);
    shoeShape.lineTo(0.05, -0.09);
    shoeShape.quadraticCurveTo(0.058, 0.05, 0.044, 0.14);
    shoeShape.quadraticCurveTo(0.0, 0.175, -0.044, 0.14);
    shoeShape.quadraticCurveTo(-0.058, 0.05, -0.05, -0.09);
    this.geo.shoeUpper = new THREE.ExtrudeGeometry(shoeShape, {
      depth: 0.058,
      bevelEnabled: true,
      bevelThickness: 0.014,
      bevelSize: 0.012,
      bevelSegments: 2
    });
    this.geo.shoeUpper.rotateX(-Math.PI / 2);

    this.geo.shoeSole = new THREE.ExtrudeGeometry(shoeShape, {
      depth: 0.026,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.008,
      bevelSegments: 2
    });
    this.geo.shoeSole.rotateX(-Math.PI / 2);

    // 10. Jacket Lapel / Collar Accent & Cached Joint Caps
    this.geo.collar = new THREE.TorusGeometry(0.076, 0.022, 8, 14, Math.PI * 1.65);
    this.geo.belt = this._latheProfile([
      [0.144, -0.025],
      [0.146, 0.025]
    ], 14);
    this.geo.innerShirt = new THREE.CylinderGeometry(0.11, 0.08, 0.44, 10);
    this.geo.shoulderCap = new THREE.SphereGeometry(0.068, 10, 8);
    this.geo.elbowCap = new THREE.SphereGeometry(0.045, 8, 8);
    this.geo.kneeCap = new THREE.SphereGeometry(0.063, 8, 8);
    this.geo.helmetShell = new THREE.SphereGeometry(0.165, 16, 14);
    this.geo.helmetVisor = new THREE.CylinderGeometry(0.155, 0.158, 0.095, 14, 1, true, -Math.PI * 0.42, Math.PI * 0.84);
  }

  /**
   * Builds a complete articulated sculpted human character (~1.78m height).
   * Returns bone joints for natural inverse-pendulum & knee/elbow animation blending.
   */
  createSculptedHuman(options = {}) {
    const THREE = this.THREE;
    const {
      skinColor = 0xc68860,
      shirtColor = 0x1e4e68,
      jacketColor = 0x26384d,
      trouserColor = 0x222c3c,
      shoeColor = 0xdfe6ee,
      hairColor = 0x17181d,
      hasJacket = true,
      withHelmet = false,
      helmetColor = 0xf59e0b,
      scale = 1.0
    } = options;

    const skinMat = new THREE.MeshStandardMaterial({
      color: skinColor,
      roughness: 0.56,
      metalness: 0.02,
      envMapIntensity: 0.9
    });
    const faceMat = new THREE.MeshStandardMaterial({
      color: skinColor,
      map: this.textures.faceOverlay,
      roughness: 0.54,
      metalness: 0.02,
      envMapIntensity: 0.95
    });
    const shirtMat = new THREE.MeshStandardMaterial({
      color: shirtColor,
      bumpMap: this.textures.clothBump,
      bumpScale: 0.008,
      roughness: 0.78,
      metalness: 0.04
    });
    const jacketMat = new THREE.MeshStandardMaterial({
      color: jacketColor,
      bumpMap: this.textures.clothBump,
      bumpScale: 0.012,
      roughness: 0.62,
      metalness: 0.08,
      envMapIntensity: 1.15
    });
    const trouserMat = new THREE.MeshStandardMaterial({
      color: trouserColor,
      bumpMap: this.textures.clothBump,
      bumpScale: 0.010,
      roughness: 0.84,
      metalness: 0.02
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: hairColor,
      roughness: 0.85,
      metalness: 0.04
    });
    const shoeMat = new THREE.MeshStandardMaterial({
      color: shoeColor,
      roughness: 0.44,
      metalness: 0.08
    });
    const soleMat = new THREE.MeshStandardMaterial({
      color: 0xf4f6f8,
      roughness: 0.58
    });
    const beltMat = new THREE.MeshStandardMaterial({
      color: 0x2c2019,
      roughness: 0.42,
      metalness: 0.25
    });

    const root = new THREE.Group();
    root.scale.setScalar(scale);

    // Pelvis Root (sits at y ~ 0.88m: thigh 0.40m + calf 0.38m + shoe 0.10m)
    const pelvisJoint = new THREE.Group();
    pelvisJoint.position.y = 0.88;
    root.add(pelvisJoint);

    const pelvisMesh = new THREE.Mesh(this.geo.pelvis, trouserMat);
    pelvisMesh.scale.set(1.06, 1.0, 0.78);
    pelvisMesh.castShadow = true;
    pelvisMesh.receiveShadow = true;
    pelvisJoint.add(pelvisMesh);

    const beltMesh = new THREE.Mesh(this.geo.belt, beltMat);
    beltMesh.scale.set(1.06, 1.0, 0.79);
    beltMesh.position.y = 0.095;
    pelvisJoint.add(beltMesh);

    // Spine / Upper Torso Joint
    const spineJoint = new THREE.Group();
    spineJoint.position.y = 0.28;
    pelvisJoint.add(spineJoint);

    const upperMat = hasJacket ? jacketMat : shirtMat;
    const torsoMesh = new THREE.Mesh(this.geo.torso, upperMat);
    torsoMesh.scale.set(1.16, 1.04, 0.78);
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    spineJoint.add(torsoMesh);

    // Inner T-shirt V-panel when wearing open coastal jacket
    if (hasJacket) {
      const innerShirt = new THREE.Mesh(this.geo.innerShirt, shirtMat);
      innerShirt.scale.set(0.95, 1.0, 0.42);
      innerShirt.position.set(0, 0.03, 0.095);
      spineJoint.add(innerShirt);
    }

    const collar = new THREE.Mesh(this.geo.collar, upperMat);
    collar.rotation.x = Math.PI / 2;
    collar.rotation.z = -Math.PI * 0.32;
    collar.position.set(0, 0.295, -0.005);
    spineJoint.add(collar);

    // Neck & Head Joint
    const headJoint = new THREE.Group();
    headJoint.position.y = 0.33;
    spineJoint.add(headJoint);

    const neckMesh = new THREE.Mesh(this.geo.neck, skinMat);
    neckMesh.position.y = 0.03;
    headJoint.add(neckMesh);

    if (withHelmet) {
      const helmetMat = new THREE.MeshPhysicalMaterial({
        color: helmetColor,
        metalness: 0.42,
        roughness: 0.16,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        envMapIntensity: 1.55
      });
      const visorMat = new THREE.MeshPhysicalMaterial({
        color: 0x0b121b,
        metalness: 0.25,
        roughness: 0.04,
        clearcoat: 1.0,
        envMapIntensity: 1.7
      });
      const shell = new THREE.Mesh(this.geo.helmetShell, helmetMat);
      shell.scale.set(0.95, 1.04, 1.12);
      shell.position.set(0, 0.17, 0);
      shell.castShadow = true;
      const visor = new THREE.Mesh(this.geo.helmetVisor, visorMat);
      visor.position.set(0, 0.165, 0.025);
      headJoint.add(shell, visor);
    } else {
      const headMesh = new THREE.Mesh(this.geo.head, faceMat);
      headMesh.scale.set(0.92, 1.04, 0.98);
      headMesh.position.y = 0.16;
      headMesh.rotation.y = -Math.PI / 2;
      headMesh.castShadow = true;
      headJoint.add(headMesh);

      const noseMesh = new THREE.Mesh(this.geo.nose, skinMat);
      noseMesh.rotation.x = Math.PI * 0.42;
      noseMesh.position.set(0, 0.152, 0.105);
      headJoint.add(noseMesh);

      for (const sx of [-0.098, 0.098]) {
        const ear = new THREE.Mesh(this.geo.ear, skinMat);
        ear.scale.set(0.48, 1.15, 0.72);
        ear.position.set(sx, 0.155, -0.005);
        headJoint.add(ear);
      }

      const hairCap = new THREE.Mesh(this.geo.hairCap, hairMat);
      hairCap.scale.set(0.95, 1.02, 1.02);
      hairCap.position.set(0, 0.175, -0.012);
      hairCap.rotation.x = -0.22;
      hairCap.castShadow = true;
      headJoint.add(hairCap);

      const hairBack = new THREE.Mesh(this.geo.hairBack, hairMat);
      hairBack.position.set(0, 0.155, -0.015);
      headJoint.add(hairBack);
    }

    // Left & Right Articulated Arms (Shoulder -> UpperArm -> Elbow -> Forearm -> Hand)
    const buildArm = (sideSign) => {
      const shoulderJoint = new THREE.Group();
      shoulderJoint.position.set(sideSign * 0.245, 0.245, 0);
      spineJoint.add(shoulderJoint);

      const shoulderCap = new THREE.Mesh(this.geo.shoulderCap, upperMat);
      shoulderCap.castShadow = true;
      shoulderJoint.add(shoulderCap);

      const upperArmMesh = new THREE.Mesh(this.geo.upperArm, upperMat);
      upperArmMesh.castShadow = true;
      shoulderJoint.add(upperArmMesh);

      const elbowJoint = new THREE.Group();
      elbowJoint.position.y = -0.275;
      shoulderJoint.add(elbowJoint);

      const elbowCap = new THREE.Mesh(this.geo.elbowCap, skinMat);
      elbowJoint.add(elbowCap);

      const forearmMesh = new THREE.Mesh(this.geo.forearm, skinMat);
      forearmMesh.castShadow = true;
      elbowJoint.add(forearmMesh);

      const handMesh = new THREE.Mesh(this.geo.hand, skinMat);
      handMesh.position.set(0, -0.245, 0.005);
      handMesh.rotation.y = Math.PI / 2;
      elbowJoint.add(handMesh);

      return { shoulderJoint, elbowJoint };
    };

    const leftArm = buildArm(-1);
    const rightArm = buildArm(1);

    // Left & Right Articulated Legs (Hip -> Thigh -> Knee -> Calf -> Ankle/Sneaker)
    const buildLeg = (sideSign) => {
      const hipJoint = new THREE.Group();
      hipJoint.position.set(sideSign * 0.095, -0.04, 0);
      pelvisJoint.add(hipJoint);

      const thighMesh = new THREE.Mesh(this.geo.thigh, trouserMat);
      thighMesh.castShadow = true;
      thighMesh.receiveShadow = true;
      hipJoint.add(thighMesh);

      const kneeJoint = new THREE.Group();
      kneeJoint.position.y = -0.395;
      hipJoint.add(kneeJoint);

      const kneeCap = new THREE.Mesh(this.geo.kneeCap, trouserMat);
      kneeJoint.add(kneeCap);

      const calfMesh = new THREE.Mesh(this.geo.calf, trouserMat);
      calfMesh.castShadow = true;
      kneeJoint.add(calfMesh);

      const ankleJoint = new THREE.Group();
      ankleJoint.position.y = -0.38;
      kneeJoint.add(ankleJoint);

      const sole = new THREE.Mesh(this.geo.shoeSole, soleMat);
      sole.position.set(0, -0.065, 0.02);
      ankleJoint.add(sole);

      const upper = new THREE.Mesh(this.geo.shoeUpper, shoeMat);
      upper.position.set(0, -0.04, 0.02);
      upper.castShadow = true;
      ankleJoint.add(upper);

      return { hipJoint, kneeJoint, ankleJoint };
    };

    const leftLeg = buildLeg(-1);
    const rightLeg = buildLeg(1);

    return {
      root,
      pelvisJoint,
      spineJoint,
      headJoint,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg
    };
  }
}
