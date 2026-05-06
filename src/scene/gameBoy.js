import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  matBodyKiwi, matBezel, matButtonGrey, matRubberMatte,
  makeScreenMaterial,
  makeGameBoyColorLogoMaterial,
  makePowerIndicatorMaterial,
  makeButtonLetterMaterial,
  makeSpeakerGridMaterial,
  makeSmallLabel,
} from '../utils/materials.js';

/**
 * Atomic Purple Game Boy Color.
 *
 * Conventions:
 *   +X right, +Y up, +Z toward camera.
 *   Device lies flat. Front face faces +Y.
 *   -Z = top edge, +Z = bottom edge.
 *
 * Y-layer separation + polygonOffset on every decal prevents flicker
 * across all camera angles:
 *
 *   body top     = D
 *   bezel top    = D + 0.001
 *   LCD plane    = D + 0.005
 *   bezel decals = D + 0.008
 *   front decals = D + 0.007
 */
export function buildGameBoy() {
  const gb = new THREE.Group();
  gb.name = 'gameboy-color';

  const W = 0.78;
  const D = 0.27;
  const L = 1.335;
  const halfW = W / 2;
  const halfL = L / 2;

  // ============================================================
  // BODY
  // ============================================================
  const body = new THREE.Mesh(
    new RoundedBoxGeometry(W, D, L, 14, 0.04),
    matBodyKiwi,
  );
  body.castShadow = true;
  body.receiveShadow = true;
  body.position.y = D / 2;
  gb.add(body);

  // ============================================================
  // BEZEL  +  LCD  (LCD enlarged to match reference proportions)
  // ============================================================
  const bezelW = 0.62;
  const bezelL = 0.70;
  const bezelD = 0.020;
  const bezelZ = -0.22;

  const bezelTopY = D + 0.001;
  const lcdY      = D + 0.005;
  const decalY    = D + 0.008;
  const frontY    = D + 0.007;

  const bezel = new THREE.Mesh(
    new RoundedBoxGeometry(bezelW, bezelD, bezelL, 10, 0.03),
    matBezel,
  );
  bezel.position.set(0, D - bezelD / 2 + 0.0015, bezelZ);
  bezel.receiveShadow = true;
  gb.add(bezel);

  // LCD — centered horizontally on the bezel
  const lcdSize = 0.46;
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(lcdSize, lcdSize),
    makeScreenMaterial(),
  );
  screen.name = 'lcd';
  screen.rotation.x = -Math.PI / 2;
  screen.position.set(0, lcdY, bezelZ - 0.06);
  gb.add(screen);

  // ---------- POWER indicator (left of bezel) ----------
  const powerInd = new THREE.Mesh(
    new THREE.PlaneGeometry(0.07, 0.16),
    makePowerIndicatorMaterial(),
  );
  powerInd.name = 'power-indicator';
  powerInd.rotation.x = -Math.PI / 2;
  powerInd.position.set(-0.265, decalY, bezelZ - 0.18);
  gb.add(powerInd);

  // (No separate LED — the red triangle on the POWER indicator
  //  decal already serves as the power-light visual.)

  // ---------- "GAME BOY COLOR" wordmark (centered below LCD) ----------
  const gbcLogo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.10),
    makeGameBoyColorLogoMaterial(),
  );
  gbcLogo.rotation.x = -Math.PI / 2;
  gbcLogo.position.set(0, decalY, bezelZ + 0.27);
  gb.add(gbcLogo);

  // (NOTE: COMM mark removed per request, Yuvaansh wordmark removed per request)

  // ============================================================
  // D-PAD
  // ============================================================
  const dpadArmH = 0.022;
  const dpadGroup = new THREE.Group();

  const dpadH = new THREE.Mesh(
    new RoundedBoxGeometry(0.21, dpadArmH, 0.072, 8, 0.012),
    matButtonGrey,
  );
  const dpadV = new THREE.Mesh(
    new RoundedBoxGeometry(0.072, dpadArmH, 0.21, 8, 0.012),
    matButtonGrey,
  );
  dpadH.castShadow = true; dpadV.castShadow = true;
  dpadGroup.add(dpadH); dpadGroup.add(dpadV);

  const dimple = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.005, 48),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.85 }),
  );
  dimple.position.y = dpadArmH / 2 - 0.001;
  dpadGroup.add(dimple);
  dpadGroup.position.set(-0.22, frontY + dpadArmH / 2 - 0.0015, 0.30);
  dpadGroup.userData.button = 'dpad';
  dpadH.userData.button = 'dpad';
  dpadV.userData.button = 'dpad';
  dpadGroup.name = 'btn-dpad';
  gb.add(dpadGroup);

  // ============================================================
  // A / B BUTTONS
  // ============================================================
  const buttonRadius = 0.062;
  const buttonHeight = 0.024;

  function makeFaceButton(letter) {
    const grp = new THREE.Group();
    const cyl = new THREE.Mesh(
      new THREE.CylinderGeometry(buttonRadius, buttonRadius * 0.93, buttonHeight, 64),
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
  btnB.position.set(-0.078, buttonHeight / 2, +0.022);
  btnA.position.set(+0.078, buttonHeight / 2, -0.022);
  btnB.userData.button = 'b';
  btnA.userData.button = 'a';
  btnB.name = 'btn-b';
  btnA.name = 'btn-a';
  // tag children too so raycast hits register
  btnB.traverse(o => o.userData.button = 'b');
  btnA.traverse(o => o.userData.button = 'a');
  abGroup.add(btnB); abGroup.add(btnA);
  abGroup.position.set(0.22, frontY - 0.001, 0.30);
  gb.add(abGroup);

  // ============================================================
  // SELECT / START — individual labels under each pill
  // ============================================================
  function makePill() {
    const cap = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.018, 0.07, 12, 32),
      matRubberMatte,
    );
    cap.rotation.z = Math.PI / 2;
    cap.castShadow = true;
    return cap;
  }
  const pillSelectX = -0.07;
  const pillStartX  = +0.07;
  const ssZ = 0.50;

  const sel = makePill();
  const sta = makePill();
  sel.position.set(pillSelectX, frontY + 0.012, ssZ);
  sta.position.set(pillStartX,  frontY + 0.012, ssZ);
  sel.userData.button = 'select';
  sta.userData.button = 'start';
  sel.name = 'btn-select';
  sta.name = 'btn-start';
  gb.add(sel);
  gb.add(sta);

  // separate "SELECT" and "START" labels — each directly under its pill
  const labelSelect = new THREE.Mesh(
    new THREE.PlaneGeometry(0.13, 0.030),
    makeSmallLabel('SELECT'),
  );
  labelSelect.rotation.x = -Math.PI / 2;
  labelSelect.position.set(pillSelectX, frontY, ssZ + 0.055);
  gb.add(labelSelect);

  const labelStart = new THREE.Mesh(
    new THREE.PlaneGeometry(0.13, 0.030),
    makeSmallLabel('START'),
  );
  labelStart.rotation.x = -Math.PI / 2;
  labelStart.position.set(pillStartX, frontY, ssZ + 0.055);
  gb.add(labelStart);

  // ============================================================
  // SPEAKER (small, bottom-right)
  // ============================================================
  const speaker = new THREE.Mesh(
    new THREE.PlaneGeometry(0.18, 0.18),
    makeSpeakerGridMaterial(),
  );
  speaker.rotation.x = -Math.PI / 2;
  speaker.position.set(0.24, frontY, 0.50);
  gb.add(speaker);

  // ============================================================
  // SIDE PORTS / HOLES
  // (no protruding volume knob — just flush dark recesses indicating
  //  where the real ports/wheels sit)
  // ============================================================

  const portMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a0a, roughness: 0.85, metalness: 0.0,
  });
  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x14110d, roughness: 0.6, metalness: 0.3,
  });

  // Left edge: power switch slot — bigger, with a visible knob
  const powerSlot = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, 0.06, 0.10),
    portMat,
  );
  powerSlot.position.set(-halfW + 0.001, D / 2 + 0.02, -halfL + 0.20);
  gb.add(powerSlot);

  const powerKnob = new THREE.Mesh(
    new RoundedBoxGeometry(0.008, 0.04, 0.05, 4, 0.005),
    new THREE.MeshPhysicalMaterial({ color: 0xb6b3a8, roughness: 0.55, clearcoat: 0.25 }),
  );
  powerKnob.position.set(-halfW + 0.005, D / 2 + 0.02, -halfL + 0.18);
  gb.add(powerKnob);

  // Left edge: link cable port — clearly visible dark slot
  const linkPort = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, 0.055, 0.075),
    portMat,
  );
  linkPort.position.set(-halfW + 0.001, D / 2, 0.05);
  gb.add(linkPort);

  // Right edge: volume wheel cutout (small flush slot with ridges)
  const volSlot = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, 0.05, 0.10),
    wheelMat,
  );
  volSlot.position.set(halfW - 0.005, D / 2, -0.40);
  gb.add(volSlot);
  // ridges to suggest a wheel
  for (let i = 0; i < 6; i++) {
    const ridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.006, 0.035, 0.005),
      new THREE.MeshStandardMaterial({ color: 0x2a2722, roughness: 0.6 }),
    );
    ridge.position.set(halfW - 0.001, D / 2, -0.43 + i * 0.012);
    gb.add(ridge);
  }

  // Bottom edge: headphone jack (small dark hole)
  const headphoneJack = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.05, 48),
    portMat,
  );
  headphoneJack.rotation.x = Math.PI / 2;
  headphoneJack.position.set(0.18, D / 2, halfL - 0.02);
  gb.add(headphoneJack);

  // Bottom edge: external power port (small flush rectangle)
  const powerPort = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.04, 0.005),
    portMat,
  );
  powerPort.position.set(-0.18, D / 2, halfL - 0.003);
  gb.add(powerPort);

  // ============================================================
  // CARTRIDGE SLOT — on the BACK face (-Z, "north")
  //
  // Larger, lower, centered on the back face. Cart slides in here
  // and stands tall above the device.
  // ============================================================
  const slotW = 0.62;     // bigger
  const slotH = 0.13;     // bigger
  const slotY = D / 2;    // CENTERED on the back face (was: high up)

  // Outer dark plane on the back face
  const slotOuter = new THREE.Mesh(
    new THREE.PlaneGeometry(slotW, slotH),
    new THREE.MeshStandardMaterial({
      color: 0x0a0a0a, roughness: 0.9, metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    }),
  );
  slotOuter.rotation.y = Math.PI;
  slotOuter.position.set(0, slotY, -halfL - 0.0005);
  gb.add(slotOuter);

  // Inner darker recess plane — depth cue
  const slotInner = new THREE.Mesh(
    new THREE.PlaneGeometry(slotW * 0.92, slotH * 0.72),
    new THREE.MeshStandardMaterial({
      color: 0x020202, roughness: 0.95, metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    }),
  );
  slotInner.rotation.y = Math.PI;
  slotInner.position.set(0, slotY, -halfL - 0.001);
  gb.add(slotInner);

  // Snap anchor — cart bottom enters at slot opening level
  const cartSlotAnchor = new THREE.Object3D();
  cartSlotAnchor.name = 'cart-slot-anchor';
  cartSlotAnchor.position.set(0, slotY + 0.05, -halfL);
  gb.add(cartSlotAnchor);

  // ============================================================
  // CASE-HALF SEAM LINE (subtle, around perimeter at midline)
  // ============================================================
  const seamMat = new THREE.MeshStandardMaterial({
    color: 0x6a5e84, roughness: 0.7,
  });
  const seamH = 0.003;
  const seamY = D / 2;
  const seamFront = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.98, seamH, 0.005),
    seamMat,
  );
  seamFront.position.set(0, seamY, halfL - 0.005);
  gb.add(seamFront);
  const seamBack = seamFront.clone();
  seamBack.position.z = -halfL + 0.005;
  gb.add(seamBack);
  const seamLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.005, seamH, L * 0.98),
    seamMat,
  );
  seamLeft.position.set(-halfW + 0.005, seamY, 0);
  gb.add(seamLeft);
  const seamRight = seamLeft.clone();
  seamRight.position.x = halfW - 0.005;
  gb.add(seamRight);

  return gb;
}
