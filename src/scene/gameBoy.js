import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  matBodyKiwi, matBezel, matButtonGrey, matRubberMatte, matSwitchKnob,
  makeScreenMaterial,
  makeGameBoyColorLogoMaterial,
  makeNintendoWordmarkMaterial,
  makePowerIndicatorMaterial,
  makeCommIndicatorMaterial,
  makeSelectStartLabelMaterial,
  makeButtonLetterMaterial,
  makeSpeakerGridMaterial,
} from '../utils/materials.js';

/**
 * Nintendo Game Boy Color (Kiwi, 1998).
 *
 * Real-world dimensions: 133.5 × 78 × 27.4 mm (height × width × depth).
 * In scene units (1 ≈ 10 cm) that's 1.335 × 0.78 × 0.274.
 *
 * Geometry conventions:
 *   +X right, +Y up, +Z toward camera.
 *   Device lies flat on the desk. Front face points up (+Y).
 *   Long axis runs along Z. -Z = top edge (link port, power switch),
 *                          +Z = bottom edge.
 *
 * Layout reference (from the user's photo):
 *   - Top edge: small "▲ COMM" silkscreen on the front face near top-left
 *   - Black bezel: large rectangle covering the upper ~55% of the front
 *     - LCD screen centered in the bezel (slightly toward the top)
 *     - LEFT side of bezel: vertical POWER stack (red triangle + 3
 *       white chevrons + "POWER" text)
 *     - BOTTOM of bezel: "GAME BOY COLOR" wordmark
 *       (white italic "GAME BOY", rainbow "CoLoR")
 *   - Below bezel on the green body: red "Nintendo®" wordmark
 *   - D-pad: bottom-left
 *   - A / B buttons: bottom-right (charcoal, engraved letters)
 *   - SELECT / START: tiny dark pills, side-by-side, center-bottom,
 *     with "SELECT . START" silkscreen below
 *   - Speaker: dot-grid of small round holes in the bottom-right corner
 *   - Volume wheel: LEFT SIDE EDGE (not top)
 *   - Cartridge slot: BACK of the device, near the top edge
 */
export function buildGameBoy() {
  const gb = new THREE.Group();
  gb.name = 'gameboy-color';

  const W = 0.78;          // X — short axis
  const D = 0.27;          // Y — body depth
  const L = 1.335;         // Z — long axis
  const halfW = W / 2;
  const halfL = L / 2;

  // ---------- BODY ----------
  const body = new THREE.Mesh(
    new RoundedBoxGeometry(W, D, L, 6, 0.04),
    matBodyKiwi,
  );
  body.castShadow = true;
  body.receiveShadow = true;
  body.position.y = D / 2;
  gb.add(body);

  // Front-face Y plane
  const frontY = D + 0.0008;

  // ============================================================
  // BEZEL (matte black, covers upper 55% of front face)
  // ============================================================
  const bezelW = 0.70;
  const bezelL = 0.78;
  const bezelD = 0.020;
  // bezel center: shifted toward the top edge
  const bezelZ = -0.20;

  const bezel = new THREE.Mesh(
    new RoundedBoxGeometry(bezelW, bezelD, bezelL, 4, 0.025),
    matBezel,
  );
  bezel.position.set(0, D - bezelD / 2 + 0.001, bezelZ);
  bezel.receiveShadow = true;
  gb.add(bezel);

  const bezelTopY = D + 0.001;

  // ---------- LCD ----------
  // sits in the upper portion of the bezel
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.50, 0.50),
    makeScreenMaterial(),
  );
  screen.rotation.x = -Math.PI / 2;
  screen.position.set(0.04, bezelTopY, bezelZ - 0.10);
  gb.add(screen);

  // ---------- POWER indicator (left side of bezel, vertical) ----------
  const powerInd = new THREE.Mesh(
    new THREE.PlaneGeometry(0.07, 0.18),
    makePowerIndicatorMaterial(),
  );
  powerInd.rotation.x = -Math.PI / 2;
  powerInd.position.set(-0.28, bezelTopY, bezelZ - 0.18);
  gb.add(powerInd);

  // ---------- "GAME BOY COLOR" wordmark (bottom of bezel) ----------
  const gbcLogo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.08),
    makeGameBoyColorLogoMaterial(),
  );
  gbcLogo.rotation.x = -Math.PI / 2;
  gbcLogo.position.set(0.04, bezelTopY, bezelZ + 0.30);
  gb.add(gbcLogo);

  // ---------- "▲ COMM" silkscreen (front face, near top-left) ----------
  const commLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.18, 0.034),
    makeCommIndicatorMaterial(),
  );
  commLabel.rotation.x = -Math.PI / 2;
  commLabel.position.set(-0.08, frontY, -halfL + 0.045);
  gb.add(commLabel);

  // ---------- "Nintendo®" wordmark (green body, below bezel) ----------
  const nintendo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.32, 0.06),
    makeNintendoWordmarkMaterial(),
  );
  nintendo.rotation.x = -Math.PI / 2;
  nintendo.position.set(0, frontY, bezelZ + bezelL / 2 + 0.06);
  gb.add(nintendo);

  // ============================================================
  // D-PAD (bottom-left, dark gray)
  // ============================================================
  const dpadArmH = 0.022;
  const dpadGroup = new THREE.Group();

  const dpadH = new THREE.Mesh(
    new RoundedBoxGeometry(0.21, dpadArmH, 0.07, 3, 0.012),
    matButtonGrey,
  );
  const dpadV = new THREE.Mesh(
    new RoundedBoxGeometry(0.07, dpadArmH, 0.21, 3, 0.012),
    matButtonGrey,
  );
  dpadH.castShadow = true; dpadV.castShadow = true;
  dpadGroup.add(dpadH);
  dpadGroup.add(dpadV);

  // center dimple
  const dimple = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.005, 24),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.85 }),
  );
  dimple.position.y = dpadArmH / 2 - 0.001;
  dpadGroup.add(dimple);

  dpadGroup.position.set(-0.22, frontY + dpadArmH / 2 - 0.0015, 0.34);
  gb.add(dpadGroup);

  // ============================================================
  // A / B BUTTONS (bottom-right, charcoal, engraved letters)
  // No duplicate side labels — letters live on the buttons themselves.
  // ============================================================
  const buttonRadius = 0.06;
  const buttonHeight = 0.024;

  function makeFaceButton(letter) {
    const grp = new THREE.Group();
    const cyl = new THREE.Mesh(
      new THREE.CylinderGeometry(buttonRadius, buttonRadius * 0.93, buttonHeight, 48),
      matButtonGrey,
    );
    cyl.castShadow = true;
    cyl.receiveShadow = true;
    grp.add(cyl);

    const lbl = new THREE.Mesh(
      new THREE.PlaneGeometry(buttonRadius * 1.5, buttonRadius * 1.5),
      makeButtonLetterMaterial(letter),
    );
    lbl.rotation.x = -Math.PI / 2;
    lbl.position.y = buttonHeight / 2 + 0.0008;
    grp.add(lbl);

    return grp;
  }

  const abGroup = new THREE.Group();
  const btnB = makeFaceButton('B');
  const btnA = makeFaceButton('A');
  btnB.position.set(-0.075, buttonHeight / 2, 0.020);
  btnA.position.set(+0.075, buttonHeight / 2, -0.020);
  abGroup.add(btnB);
  abGroup.add(btnA);
  abGroup.position.set(0.22, frontY - 0.001, 0.36);
  gb.add(abGroup);

  // ============================================================
  // SELECT / START pills (center-bottom, side-by-side)
  // ============================================================
  function makePill() {
    const cap = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.018, 0.07, 6, 16),
      matRubberMatte,
    );
    cap.rotation.z = Math.PI / 2;
    cap.castShadow = true;
    return cap;
  }
  const ssGroup = new THREE.Group();
  const sel = makePill();
  const sta = makePill();
  sel.position.set(-0.07, frontY + 0.012, 0);
  sta.position.set(+0.07, frontY + 0.012, 0);
  ssGroup.add(sel);
  ssGroup.add(sta);
  ssGroup.position.set(-0.10, 0, 0.55);
  gb.add(ssGroup);

  // SELECT . START silkscreen below the pills
  const ssLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.30, 0.025),
    makeSelectStartLabelMaterial(),
  );
  ssLabel.rotation.x = -Math.PI / 2;
  ssLabel.position.set(-0.10, frontY, 0.605);
  gb.add(ssLabel);

  // ============================================================
  // SPEAKER (dot-grid in bottom-right corner)
  // ============================================================
  const speaker = new THREE.Mesh(
    new THREE.PlaneGeometry(0.26, 0.26),
    makeSpeakerGridMaterial(),
  );
  speaker.rotation.x = -Math.PI / 2;
  speaker.position.set(0.22, frontY, 0.55);
  gb.add(speaker);

  // ============================================================
  // POWER SWITCH (top edge, left side)
  // Tiny but present so the device is "complete" at the back/top.
  // ============================================================
  const switchSlot = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.02, 0.05),
    matBezel,
  );
  switchSlot.position.set(-halfW + 0.16, D - 0.005, -halfL + 0.012);
  gb.add(switchSlot);

  const switchKnob = new THREE.Mesh(
    new RoundedBoxGeometry(0.06, 0.022, 0.038, 3, 0.005),
    matSwitchKnob,
  );
  switchKnob.position.set(-halfW + 0.13, D + 0.005, -halfL + 0.012);
  switchKnob.castShadow = true;
  gb.add(switchKnob);
  for (let i = 0; i < 3; i++) {
    const ridge = new THREE.Mesh(
      new RoundedBoxGeometry(0.005, 0.005, 0.030, 2, 0.002),
      new THREE.MeshStandardMaterial({ color: 0x5a574e, roughness: 0.6 }),
    );
    ridge.position.set(-halfW + 0.13 + (i - 1) * 0.013, D + 0.018, -halfL + 0.012);
    gb.add(ridge);
  }

  // Link cable port — small dark slot on top edge, right of the switch
  const linkPort = new THREE.Mesh(
    new THREE.BoxGeometry(0.10, 0.04, 0.025),
    matBezel,
  );
  linkPort.position.set(halfW - 0.16, D - 0.014, -halfL + 0.005);
  gb.add(linkPort);

  // ============================================================
  // VOLUME WHEEL — LEFT side edge (not top)
  // ============================================================
  const volWheel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.026, 0.16, 28),
    new THREE.MeshStandardMaterial({ color: 0x2a2722, roughness: 0.55, metalness: 0.4 }),
  );
  volWheel.rotation.z = Math.PI / 2; // axis along X (so wheel rolls along Z)
  volWheel.position.set(-halfW + 0.005, D / 2, -0.30);
  gb.add(volWheel);
  for (let i = 0; i < 18; i++) {
    const ang = (i / 18) * Math.PI * 2;
    const r = 0.027;
    const ridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.005, 0.003),
      new THREE.MeshStandardMaterial({ color: 0x14110d, roughness: 0.85 }),
    );
    ridge.position.set(
      -halfW + 0.005,
      D / 2 + Math.sin(ang) * r,
      -0.30 + Math.cos(ang) * r,
    );
    ridge.rotation.x = ang;
    gb.add(ridge);
  }

  // ============================================================
  // CARTRIDGE SLOT — BACK of the device, near the top edge
  // ============================================================
  // The back face is at Y=0 (lying on table) — but lifting the device
  // off the table for visibility, we cut a slot that's visible if the
  // user orbits to a back-side view.
  const cartSlot = new THREE.Mesh(
    new THREE.BoxGeometry(0.50, 0.02, 0.06),
    matBezel,
  );
  cartSlot.position.set(0, 0.005, -halfL + 0.20);
  gb.add(cartSlot);

  // Cart-slot framing rim
  const cartRim = new THREE.Mesh(
    new RoundedBoxGeometry(0.54, 0.012, 0.10, 3, 0.005),
    matBodyKiwi,
  );
  cartRim.position.set(0, 0.0001, -halfL + 0.20);
  gb.add(cartRim);
  cartRim.visible = false; // the body already provides framing — disable for now

  return gb;
}
