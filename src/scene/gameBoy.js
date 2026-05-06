import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  matBodyLight, matBezel, matMaroon, matBlackPlastic,
  matSwitchKnob, matRubberMatte,
  makeScreenMaterial, makeSilkscreenMaterial, makeTaglineMaterial,
  makeButtonLetterMaterial, makeMicroLabel,
} from '../utils/materials.js';

/**
 * Nintendo Game Boy DMG-01 (1989).
 *
 * Geometry conventions:
 *   +X right, +Y up, +Z toward camera.
 *   Device lies flat on the desk. Front face points up (+Y).
 *   Long axis runs along Z. -Z = top edge (cart slot, power switch),
 *                          +Z = bottom edge.
 *
 * Reference notes (from photos and DMG-01 specs):
 *   - Outer dims: 90 × 148 × 32 mm
 *   - Power switch: top-left edge, slides L→R, three molded grip ridges
 *   - Speaker: bottom-right corner, six diagonal slots cut at ~-25°
 *   - Wordmark "Nintendo® GAME BOY™" sits centered above the screen
 *   - Tagline "DOT MATRIX WITH STEREO SOUND" centered below the screen,
 *     with a mustard-yellow "WITH"
 *   - "BATTERY" label + red LED to the left of the screen
 *   - "PHONES" label on the lower-left front face
 */
export function buildGameBoy() {
  const gb = new THREE.Group();
  gb.name = 'gameboy';

  // Scene units: 1 ≈ 10 cm.
  const W = 0.92;          // X — short axis
  const D = 0.33;          // Y — body depth
  const L = 1.48;          // Z — long axis
  const halfL = L / 2;

  // ---------- BODY ----------
  const body = new THREE.Mesh(
    new RoundedBoxGeometry(W, D, L, 6, 0.045),
    matBodyLight,
  );
  body.castShadow = true;
  body.receiveShadow = true;
  body.position.y = D / 2;
  gb.add(body);

  // Front-face Y plane (just above the body's top to avoid z-fighting)
  const frontY = D + 0.0008;

  // ---------- BEZEL (recessed dark plate around the screen) ----------
  const bezelW = 0.78;
  const bezelL = 0.66;
  const bezelD = 0.022;
  const bezel = new THREE.Mesh(
    new RoundedBoxGeometry(bezelW, bezelD, bezelL, 4, 0.025),
    matBezel,
  );
  bezel.position.set(0, D + bezelD / 2 - 0.018, -0.30);
  bezel.castShadow = false;
  bezel.receiveShadow = true;
  gb.add(bezel);

  // The actual LCD pane
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.50, 0.46),
    makeScreenMaterial(),
  );
  screen.rotation.x = -Math.PI / 2;
  screen.position.set(0, D + bezelD / 2 - 0.006, -0.30);
  gb.add(screen);

  // tiny "BATTERY" indicator hole on the bezel, left of the screen
  const batHole = new THREE.Mesh(
    new THREE.CircleGeometry(0.012, 24),
    new THREE.MeshStandardMaterial({ color: 0x05050a, roughness: 0.5 }),
  );
  batHole.rotation.x = -Math.PI / 2;
  batHole.position.set(-0.32, D + bezelD / 2 - 0.005, -0.30);
  gb.add(batHole);

  // ---------- WORDMARK on the bezel above the screen ----------
  const wordmark = new THREE.Mesh(
    new THREE.PlaneGeometry(0.66, 0.08),
    makeSilkscreenMaterial(),
  );
  wordmark.rotation.x = -Math.PI / 2;
  wordmark.position.set(0, D + bezelD / 2 - 0.005, -0.59);
  gb.add(wordmark);

  // ---------- TAGLINE on the bezel below the screen ----------
  const tagline = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.045),
    makeTaglineMaterial(),
  );
  tagline.rotation.x = -Math.PI / 2;
  tagline.position.set(0, D + bezelD / 2 - 0.005, -0.04);
  gb.add(tagline);

  // ---------- POWER LED + "BATTERY" silkscreen ----------
  const led = new THREE.Mesh(
    new THREE.CircleGeometry(0.018, 32),
    new THREE.MeshStandardMaterial({
      color: 0xff3838, emissive: 0xff2222, emissiveIntensity: 0.7, roughness: 0.35,
    }),
  );
  led.rotation.x = -Math.PI / 2;
  led.position.set(-0.32, frontY, 0.04);
  gb.add(led);

  const batteryLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.16, 0.026),
    makeMicroLabel('BATTERY', { color: '#5e5b53', size: 200, letterSpacing: 8 }),
  );
  batteryLabel.rotation.x = -Math.PI / 2;
  batteryLabel.position.set(-0.21, frontY, 0.04);
  gb.add(batteryLabel);

  // =========================================================
  // CONTROLS
  // =========================================================

  // ---------- D-Pad ----------
  const dpadArmH = 0.020;
  const dpad = new THREE.Group();

  const dpadH = new THREE.Mesh(
    new RoundedBoxGeometry(0.20, dpadArmH, 0.066, 3, 0.012),
    matBlackPlastic,
  );
  const dpadV = new THREE.Mesh(
    new RoundedBoxGeometry(0.066, dpadArmH, 0.20, 3, 0.012),
    matBlackPlastic,
  );
  dpadH.castShadow = true; dpadV.castShadow = true;
  dpadH.receiveShadow = true; dpadV.receiveShadow = true;
  dpad.add(dpadH);
  dpad.add(dpadV);

  // center dimple (debossed circle)
  const dpadDimple = new THREE.Mesh(
    new THREE.CylinderGeometry(0.020, 0.020, 0.005, 24),
    new THREE.MeshStandardMaterial({ color: 0x070605, roughness: 0.85 }),
  );
  dpadDimple.position.y = dpadArmH / 2 - 0.001;
  dpad.add(dpadDimple);

  dpad.position.set(-0.26, frontY + dpadArmH / 2 - 0.0015, 0.34);
  gb.add(dpad);

  // ---------- A / B buttons ----------
  const buttonRadius = 0.062;
  const buttonHeight = 0.024;

  function makeFaceButton(letter, dx, dz) {
    const grp = new THREE.Group();

    const cyl = new THREE.Mesh(
      new THREE.CylinderGeometry(buttonRadius, buttonRadius * 0.93, buttonHeight, 48),
      matMaroon,
    );
    cyl.castShadow = true;
    cyl.receiveShadow = true;
    grp.add(cyl);

    // Italic letter molded into the top — engraved canvas decal
    const letterPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(buttonRadius * 1.4, buttonRadius * 1.4),
      makeButtonLetterMaterial(letter),
    );
    letterPlane.rotation.x = -Math.PI / 2;
    letterPlane.position.y = buttonHeight / 2 + 0.0006;
    grp.add(letterPlane);

    grp.position.set(dx, buttonHeight / 2, dz);
    return grp;
  }

  const abGroup = new THREE.Group();
  abGroup.add(makeFaceButton('B', -0.085, +0.020));
  abGroup.add(makeFaceButton('A', +0.085, -0.020));
  abGroup.position.set(0.21, frontY - 0.001, 0.36);
  gb.add(abGroup);

  // engraved A / B labels next to (below-right of) the buttons
  const abLetterMat = (l) => makeMicroLabel(l, {
    color: '#5a574e', size: 220, weight: 700, italic: true, width: 256, height: 256,
  });
  const lblB = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.05), abLetterMat('B'));
  lblB.rotation.x = -Math.PI / 2;
  lblB.position.set(0.135, frontY, 0.45);
  gb.add(lblB);

  const lblA = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.05), abLetterMat('A'));
  lblA.rotation.x = -Math.PI / 2;
  lblA.position.set(0.305, frontY, 0.41);
  gb.add(lblA);

  // ---------- START / SELECT (rubber pills, cocked at -25°) ----------
  const ssGroup = new THREE.Group();
  ssGroup.rotation.y = THREE.MathUtils.degToRad(-25);
  ssGroup.position.set(0, 0, 0.62);

  function makePill(label, x) {
    const grp = new THREE.Group();
    const cap = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.020, 0.10, 6, 16),
      matRubberMatte,
    );
    cap.rotation.z = Math.PI / 2;
    cap.castShadow = true;
    cap.receiveShadow = true;
    grp.add(cap);

    const lbl = new THREE.Mesh(
      new THREE.PlaneGeometry(0.13, 0.022),
      makeMicroLabel(label, { color: '#5a574e', size: 200, weight: 600, letterSpacing: 6 }),
    );
    lbl.rotation.x = -Math.PI / 2;
    lbl.position.set(0, -0.020 + 0.0005, 0.044);
    grp.add(lbl);

    grp.position.set(x, frontY + 0.020 - D, 0);
    return grp;
  }
  ssGroup.add(makePill('SELECT', -0.09));
  ssGroup.add(makePill('START',  +0.09));
  gb.add(ssGroup);

  // ---------- Speaker (six diagonal slots cut into the case) ----------
  const speakerGroup = new THREE.Group();
  speakerGroup.rotation.y = THREE.MathUtils.degToRad(-25);
  speakerGroup.position.set(0.27, 0, 0.62);

  // slat geometry — long thin grooves with a darker insert visible inside
  for (let i = 0; i < 6; i++) {
    const slot = new THREE.Group();

    // outer raised case wall (the molded ridge between slots)
    // we represent each slot as a recessed dark insert sitting just
    // below the front face, with the surrounding case forming the gap
    const insert = new THREE.Mesh(
      new RoundedBoxGeometry(0.024, 0.012, 0.18, 3, 0.006),
      matBlackPlastic,
    );
    insert.position.set(i * 0.040 - 0.10, frontY - 0.006, 0);
    slot.add(insert);

    speakerGroup.add(slot);
  }
  gb.add(speakerGroup);

  // ---------- "PHONES" label on the lower-left front face ----------
  const phonesLbl = new THREE.Mesh(
    new THREE.PlaneGeometry(0.12, 0.022),
    makeMicroLabel('PHONES', { color: '#5e5b53', size: 200, letterSpacing: 8 }),
  );
  phonesLbl.rotation.x = -Math.PI / 2;
  phonesLbl.position.set(-0.32, frontY, 0.62);
  gb.add(phonesLbl);

  // =========================================================
  // POWER SWITCH (top-left edge of the unit)
  // =========================================================
  // The DMG power switch is a horizontal slider with three molded
  // grip ridges. It sits in a recessed slot on the top edge of the
  // case, near the left corner. We tilt the device slightly so this
  // is visible from the top-down camera.

  const powerGroup = new THREE.Group();
  powerGroup.position.set(-W / 2 + 0.16, D - 0.005, -halfL + 0.012);

  // Recessed slot (dark cavity)
  const slot = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.022, 0.05),
    matBezel,
  );
  slot.position.set(0, 0.011, 0);
  powerGroup.add(slot);

  // The slider knob — sits inside the slot, slid toward "OFF" (left)
  const knob = new THREE.Mesh(
    new RoundedBoxGeometry(0.066, 0.030, 0.038, 3, 0.005),
    matSwitchKnob,
  );
  knob.position.set(-0.030, 0.025, 0);
  knob.castShadow = true;
  powerGroup.add(knob);

  // Three molded grip ridges across the top of the knob
  for (let i = 0; i < 3; i++) {
    const ridge = new THREE.Mesh(
      new RoundedBoxGeometry(0.005, 0.005, 0.03, 2, 0.002),
      new THREE.MeshStandardMaterial({ color: 0x5a574e, roughness: 0.6 }),
    );
    ridge.position.set(-0.030 + (i - 1) * 0.014, 0.041, 0);
    powerGroup.add(ridge);
  }

  gb.add(powerGroup);

  // OFF / ON silkscreen on the front face just below the switch slot
  const offLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.05, 0.022),
    makeMicroLabel('OFF', { color: '#5e5b53', size: 200, letterSpacing: 4 }),
  );
  offLabel.rotation.x = -Math.PI / 2;
  offLabel.position.set(-W / 2 + 0.075, frontY, -halfL + 0.06);
  gb.add(offLabel);

  const onLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.04, 0.022),
    makeMicroLabel('ON', { color: '#5e5b53', size: 200, letterSpacing: 4 }),
  );
  onLabel.rotation.x = -Math.PI / 2;
  onLabel.position.set(-W / 2 + 0.235, frontY, -halfL + 0.06);
  gb.add(onLabel);

  // tiny tick marks between OFF · ON
  const tickMat = new THREE.MeshStandardMaterial({ color: 0x6a675f });
  for (let i = 0; i < 5; i++) {
    const tick = new THREE.Mesh(
      new THREE.PlaneGeometry(0.004, 0.012),
      tickMat,
    );
    tick.rotation.x = -Math.PI / 2;
    tick.position.set(-W / 2 + 0.115 + i * 0.02, frontY, -halfL + 0.06);
    gb.add(tick);
  }

  // =========================================================
  // RIGHT EDGE: ridged volume wheel
  // =========================================================
  const volWheel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.030, 0.030, 0.18, 28),
    new THREE.MeshStandardMaterial({ color: 0x2a2722, roughness: 0.55, metalness: 0.4 }),
  );
  volWheel.rotation.x = Math.PI / 2;
  volWheel.position.set(W / 2 - 0.005, D / 2, -0.46);
  gb.add(volWheel);
  for (let i = 0; i < 18; i++) {
    const ang = (i / 18) * Math.PI * 2;
    const r = 0.031;
    const ridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.003, 0.005, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x14110d, roughness: 0.85 }),
    );
    ridge.position.set(
      W / 2 - 0.005 + Math.cos(ang) * r,
      D / 2 + Math.sin(ang) * r,
      -0.46,
    );
    ridge.rotation.z = ang;
    gb.add(ridge);
  }

  return gb;
}
