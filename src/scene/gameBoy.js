import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  matBodyLight, matBezel, matMaroon, matBlack, matMetal, matRubber,
  makeScreenMaterial, makeSilkscreenMaterial,
} from '../utils/materials.js';

/**
 * Construct a Nintendo Game Boy DMG-01 from primitive geometry.
 *
 * Scene convention:
 *   +X right, +Y up, +Z toward camera.
 *   The device lies flat on the desk. Front face points up (+Y).
 *   Long axis runs along Z (screen toward -Z, controls toward +Z).
 *
 * Returns a THREE.Group anchored at the device's geometric center on
 * the table surface so callers can position/rotate it as a single unit.
 */
export function buildGameBoy() {
  const gb = new THREE.Group();
  gb.name = 'gameboy';

  // Real DMG-01 is 90 × 148 × 32 mm. Using 1 unit ≈ 10 cm gives:
  const W = 0.92;          // X — short axis of the front face
  const D = 0.33;          // Y — body depth (thickness)
  const L = 1.48;          // Z — long axis (screen near -Z, speaker near +Z)

  // ---- Body (rounded slab) ----
  const bodyGeo = new RoundedBoxGeometry(W, D, L, 6, 0.045);
  const body = new THREE.Mesh(bodyGeo, matBodyLight);
  body.castShadow = true;
  body.receiveShadow = true;
  body.position.y = D / 2;
  gb.add(body);

  // Front-face Y coordinate: a hair above body top so we don't z-fight
  const frontY = D / 2 + D / 2 + 0.0005;

  // ---- Screen bezel (recessed dark plate covering the upper third) ----
  const bezelW = 0.78;
  const bezelL = 0.66;
  const bezelD = 0.022;
  const bezelGeo = new RoundedBoxGeometry(bezelW, bezelD, bezelL, 4, 0.025);
  const bezel = new THREE.Mesh(bezelGeo, matBezel);
  bezel.position.set(0, frontY - bezelD / 2 + 0.001, -0.30);
  bezel.castShadow = false;
  bezel.receiveShadow = true;
  gb.add(bezel);

  // ---- The LCD itself ----
  const screenGeo = new THREE.PlaneGeometry(0.50, 0.46);
  const screen = new THREE.Mesh(screenGeo, makeScreenMaterial());
  screen.rotation.x = -Math.PI / 2;
  screen.position.set(0, frontY + 0.001, -0.30);
  gb.add(screen);

  // Tiny "BATTERY" indicator dot to the left of the screen (DMG had a hole here)
  const batDot = new THREE.Mesh(
    new THREE.CircleGeometry(0.012, 24),
    new THREE.MeshStandardMaterial({ color: 0x6e6c63, roughness: 0.6 }),
  );
  batDot.rotation.x = -Math.PI / 2;
  batDot.position.set(-0.31, frontY + 0.0009, -0.30);
  gb.add(batDot);

  // ---- "Nintendo® GAME BOY™" silkscreen above the screen ----
  const silkTop = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.085),
    makeSilkscreenMaterial(),
  );
  silkTop.rotation.x = -Math.PI / 2;
  silkTop.position.set(0, frontY + 0.0008, -0.62);
  gb.add(silkTop);

  // ---- "DOT MATRIX WITH STEREO SOUND" tagline below screen on bezel ----
  // (rendered as a separate small canvas plane to keep crisp)
  const taglinePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.05),
    makeTaglineMaterial(),
  );
  taglinePlane.rotation.x = -Math.PI / 2;
  taglinePlane.position.set(0, frontY + 0.0008, -0.04);
  gb.add(taglinePlane);

  // ---- Power LED ----
  const ledGeo = new THREE.CircleGeometry(0.018, 32);
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0xff3838, emissive: 0xff2222, emissiveIntensity: 0.7, roughness: 0.35,
  });
  const led = new THREE.Mesh(ledGeo, ledMat);
  led.rotation.x = -Math.PI / 2;
  led.position.set(-0.31, frontY + 0.001, 0.05);
  gb.add(led);

  // small "BATTERY" label beside LED — built as a tiny canvas texture
  const ledLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.16, 0.025),
    makeMicroLabel('BATTERY', 0x6a6a62),
  );
  ledLabel.rotation.x = -Math.PI / 2;
  ledLabel.position.set(-0.18, frontY + 0.0008, 0.05);
  gb.add(ledLabel);

  // ---- D-Pad (cross of two stretched rounded boxes) ----
  const dpad = new THREE.Group();
  const dpadArmH = 0.018;
  const dpadHGeo = new RoundedBoxGeometry(0.18, dpadArmH, 0.06, 3, 0.012);
  const dpadVGeo = new RoundedBoxGeometry(0.06, dpadArmH, 0.18, 3, 0.012);
  const dpadH = new THREE.Mesh(dpadHGeo, matBlack);
  const dpadV = new THREE.Mesh(dpadVGeo, matBlack);
  dpadH.castShadow = true; dpadV.castShadow = true;
  dpad.add(dpadH);
  dpad.add(dpadV);
  // Center pivot dimple
  const dpadDimpleGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.006, 24);
  const dpadDimple = new THREE.Mesh(dpadDimpleGeo, new THREE.MeshStandardMaterial({
    color: 0x070605, roughness: 0.9, metalness: 0,
  }));
  dpadDimple.position.y = dpadArmH / 2 + 0.0001;
  dpad.add(dpadDimple);
  dpad.position.set(-0.26, frontY + dpadArmH / 2 - 0.0001, 0.34);
  gb.add(dpad);

  // ---- A and B buttons (cylinders, rotated 25° around Y for that cocked look) ----
  const buttonRadius = 0.06;
  const buttonHeight = 0.022;
  const abGroup = new THREE.Group();

  function makeRoundButton(letter) {
    const grp = new THREE.Group();
    const geo = new THREE.CylinderGeometry(buttonRadius, buttonRadius * 0.95, buttonHeight, 32);
    const m = new THREE.Mesh(geo, matMaroon);
    m.castShadow = true;
    m.receiveShadow = true;
    grp.add(m);
    // letter decal on top
    const labelMat = makeMicroLabel(letter, 0xf2d8c8, 'italic 700 220px "Times New Roman", serif');
    const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.07), labelMat);
    lbl.rotation.x = -Math.PI / 2;
    lbl.position.y = buttonHeight / 2 + 0.0005;
    grp.add(lbl);
    return grp;
  }

  const btnB = makeRoundButton('B');
  const btnA = makeRoundButton('A');
  btnB.position.set(-0.085, buttonHeight / 2, 0);
  btnA.position.set(+0.085, buttonHeight / 2, -0.04);
  abGroup.add(btnB);
  abGroup.add(btnA);
  abGroup.position.set(0.21, frontY - 0.0001, 0.36);
  gb.add(abGroup);

  // engraved A and B letters next to (below) buttons
  const letterB = new THREE.Mesh(
    new THREE.PlaneGeometry(0.05, 0.02),
    makeMicroLabel('B', 0x4a4842, 'bold 200px Geist, sans-serif'),
  );
  letterB.rotation.x = -Math.PI / 2;
  letterB.position.set(0.125, frontY + 0.0008, 0.43);
  gb.add(letterB);

  const letterA = new THREE.Mesh(
    new THREE.PlaneGeometry(0.05, 0.02),
    makeMicroLabel('A', 0x4a4842, 'bold 200px Geist, sans-serif'),
  );
  letterA.rotation.x = -Math.PI / 2;
  letterA.position.set(0.295, frontY + 0.0008, 0.39);
  gb.add(letterA);

  // ---- START and SELECT (capsule pills, angled -25° around Y) ----
  const ssGroup = new THREE.Group();
  ssGroup.rotation.y = THREE.MathUtils.degToRad(-25);

  function makePill(text) {
    const grp = new THREE.Group();
    const cap = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.018, 0.10, 6, 16),
      matBlack,
    );
    cap.rotation.z = Math.PI / 2;
    cap.castShadow = true;
    grp.add(cap);
    // label below capsule
    const lbl = new THREE.Mesh(
      new THREE.PlaneGeometry(0.13, 0.022),
      makeMicroLabel(text, 0x4a4842, 'bold 170px Geist, sans-serif'),
    );
    lbl.rotation.x = -Math.PI / 2;
    lbl.position.set(0, -frontY + 0.0008, 0.05);
    // Note: lbl.y here will be re-anchored when we add to scene
    grp.add(lbl);
    return { grp, cap, lbl };
  }

  const pillSelect = makePill('SELECT');
  const pillStart  = makePill('START');
  pillSelect.grp.position.set(-0.09, frontY + 0.018, 0);
  pillStart.grp.position.set(0.09, frontY + 0.018, 0);
  // labels need to sit on the front face plane, not on the pill group local frame
  pillSelect.lbl.position.set(0, -0.018 + 0.0001, 0.045);
  pillStart.lbl.position.set(0, -0.018 + 0.0001, 0.045);
  ssGroup.add(pillSelect.grp);
  ssGroup.add(pillStart.grp);
  ssGroup.position.set(0, 0, 0.62);
  gb.add(ssGroup);

  // ---- Speaker grille (six angled slats, lower-right corner) ----
  const speakerGroup = new THREE.Group();
  speakerGroup.rotation.y = THREE.MathUtils.degToRad(-25);
  const slatGeo = new RoundedBoxGeometry(0.022, 0.012, 0.18, 3, 0.008);
  const slatMat = new THREE.MeshStandardMaterial({
    color: 0x504e47, roughness: 0.55, metalness: 0.15,
  });
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(slatGeo, slatMat);
    s.position.set(i * 0.038 - 0.095, frontY + 0.006, 0);
    s.castShadow = true;
    speakerGroup.add(s);
  }
  speakerGroup.position.set(0.27, 0, 0.62);
  gb.add(speakerGroup);

  // ---- "Phones" tiny label opposite the speaker ----
  const phonesLbl = new THREE.Mesh(
    new THREE.PlaneGeometry(0.08, 0.018),
    makeMicroLabel('PHONES', 0x70706a, 'bold 170px Geist, sans-serif'),
  );
  phonesLbl.rotation.x = -Math.PI / 2;
  phonesLbl.position.set(-0.30, frontY + 0.0008, 0.65);
  gb.add(phonesLbl);

  // =========================================================
  // EDGE DETAILS — top edge has cart slot + power switch
  // =========================================================

  // top edge Y range: 0..D, top Z = -L/2
  const topZ = -L / 2;

  // Cartridge slot (a recessed dark groove on the back side, but DMG had it on the BACK
  // of the device — since we lay it face-up, the cart slot is on the underside.
  // Since we view from above, place a subtle indicator on the top edge instead.)
  const cartSlot = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.012, 0.018),
    new THREE.MeshStandardMaterial({ color: 0x1a1815, roughness: 0.7, metalness: 0.2 }),
  );
  cartSlot.position.set(0, D / 2 + 0.001, topZ - 0.001);
  // actually rotate to nestle into the top edge facing -Z
  cartSlot.position.set(0, D - 0.018, topZ + 0.005);
  gb.add(cartSlot);

  // Power switch slider on top-left edge
  const switchBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.06, 0.04),
    matBezel,
  );
  switchBase.position.set(-W / 2 + 0.13, D - 0.04, topZ + 0.012);
  gb.add(switchBase);

  const switchKnob = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.04, 0.03),
    new THREE.MeshStandardMaterial({ color: 0xb6b1a2, roughness: 0.5, metalness: 0.3 }),
  );
  switchKnob.position.set(-W / 2 + 0.16, D - 0.04, topZ + 0.018);
  gb.add(switchKnob);

  // OFF · ON tiny label on the front face just below the switch
  const swLbl = new THREE.Mesh(
    new THREE.PlaneGeometry(0.18, 0.022),
    makeMicroLabel('◁ OFF · ON ▷', 0x6a6a62, 'bold 140px Geist, sans-serif'),
  );
  swLbl.rotation.x = -Math.PI / 2;
  swLbl.position.set(-W / 2 + 0.16, frontY + 0.0008, -L / 2 + 0.08);
  gb.add(swLbl);

  // =========================================================
  // RIGHT-edge volume wheel
  // =========================================================
  const volWheel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.028, 0.18, 24),
    new THREE.MeshStandardMaterial({ color: 0x2a2722, roughness: 0.55, metalness: 0.4 }),
  );
  volWheel.rotation.x = Math.PI / 2;
  volWheel.position.set(W / 2 - 0.005, D / 2, -0.46);
  gb.add(volWheel);
  // ridges
  for (let i = 0; i < 14; i++) {
    const ang = (i / 14) * Math.PI * 2;
    const r = 0.029;
    const ridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.004, 0.006, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x14110d, roughness: 0.8 }),
    );
    ridge.position.set(W / 2 - 0.005 + Math.cos(ang) * r, D / 2 + Math.sin(ang) * r, -0.46);
    ridge.rotation.x = Math.PI / 2;
    ridge.rotation.z = ang;
    gb.add(ridge);
  }

  return gb;
}

/* ----------------------------------------------------------------
   Helpers — small canvas-texture builders for crisp 2D bits.
   ---------------------------------------------------------------- */
function makeTaglineMaterial() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 96;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 1024, 96);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'italic 600 50px "Times New Roman", serif';

  const baseY = 48;
  // measure to lay out three colored runs
  const left  = 'DOT MATRIX ';
  const mid   = 'WITH';
  const right = ' STEREO SOUND';
  const lw = ctx.measureText(left).width;
  const mw = ctx.measureText(mid).width;
  const rw = ctx.measureText(right).width;
  const total = lw + mw + rw;
  let x = 512 - total / 2;
  ctx.textAlign = 'left';

  ctx.fillStyle = '#cfcabd';
  ctx.fillText(left, x, baseY);
  x += lw;
  ctx.fillStyle = '#d8c54a';
  ctx.fillText(mid, x, baseY);
  x += mw;
  ctx.fillStyle = '#cfcabd';
  ctx.fillText(right, x, baseY);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return new THREE.MeshStandardMaterial({
    map: tex, transparent: true, depthWrite: false, roughness: 0.7,
  });
}

function makeMicroLabel(text, color = 0x4a4842, font = 'bold 220px Geist, sans-serif') {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 512, 128);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = font;
  ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
  ctx.fillText(text, 256, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return new THREE.MeshStandardMaterial({
    map: tex, transparent: true, depthWrite: false, roughness: 0.75,
  });
}
