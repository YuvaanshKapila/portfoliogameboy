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
  // BODY  —  built as multiple boxes so we can leave a REAL hole at
  // the back-top for the cartridge slot. Without CSG, this is the
  // honest way to get an opening that the camera can see into.
  //
  //   bottom slab   = full body footprint, lower 0.17 of height
  //   top-front     = top half ahead of the slot
  //   top-back      = top half behind the slot (thin strip)
  //   top-left      = top half left of the slot
  //   top-right     = top half right of the slot
  // (the area where the slot lives stays empty — that's the hole)
  // ============================================================
  const slotW       = 0.54;          // hole width  (X)
  const slotZ       = 0.10;          // hole depth  (Z)
  const slotCenterZ = -halfL + 0.13; // sits near the back-top edge
  const slotXmin    = -slotW / 2;
  const slotXmax    =  slotW / 2;
  const slotZmin    = slotCenterZ - slotZ / 2;
  const slotZmax    = slotCenterZ + slotZ / 2;
  const bottomH     = 0.17;          // bottom slab height
  const topH        = D - bottomH;   // top slab height
  const topY        = bottomH + topH / 2;

  // bottom slab — keep the rounded look on the visible lower portion
  const bottomSlab = new THREE.Mesh(
    new RoundedBoxGeometry(W, bottomH, L, 10, 0.04),
    matBodyKiwi,
  );
  bottomSlab.position.y = bottomH / 2;
  bottomSlab.castShadow = true;
  bottomSlab.receiveShadow = true;
  gb.add(bottomSlab);

  // top-front (the big slab in front of the slot)
  const topFrontL = halfL - slotZmax;
  const topFrontZ = (slotZmax + halfL) / 2;
  const topFront = new THREE.Mesh(
    new RoundedBoxGeometry(W, topH, topFrontL, 8, 0.04),
    matBodyKiwi,
  );
  topFront.position.set(0, topY, topFrontZ);
  topFront.castShadow = true;
  topFront.receiveShadow = true;
  gb.add(topFront);

  // top-back (thin strip behind the slot)
  const topBackL = slotZmin - (-halfL);
  const topBackZ = ((-halfL) + slotZmin) / 2;
  const topBack = new THREE.Mesh(
    new RoundedBoxGeometry(W, topH, topBackL, 6, 0.03),
    matBodyKiwi,
  );
  topBack.position.set(0, topY, topBackZ);
  topBack.castShadow = true;
  topBack.receiveShadow = true;
  gb.add(topBack);

  // top-left (around the slot)
  const topSideW = (-slotXmin) - (-halfW);   // = halfW - slotW/2
  const topLeftX = (-halfW + slotXmin) / 2;
  const topLeft = new THREE.Mesh(
    new THREE.BoxGeometry(topSideW, topH, slotZ),
    matBodyKiwi,
  );
  topLeft.position.set(topLeftX, topY, slotCenterZ);
  topLeft.castShadow = true;
  topLeft.receiveShadow = true;
  gb.add(topLeft);

  // top-right (mirror)
  const topRight = topLeft.clone();
  topRight.position.x = -topLeftX;
  gb.add(topRight);

  // Slot floor — a dark plane sitting on top of the bottom slab,
  // covering the inside area of the hole. Reads as the cavity floor.
  const slotFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(slotW * 0.96, slotZ * 0.92),
    new THREE.MeshStandardMaterial({
      color: 0x040404, roughness: 0.95, metalness: 0,
    }),
  );
  slotFloor.rotation.x = -Math.PI / 2;
  slotFloor.position.set(0, bottomH + 0.001, slotCenterZ);
  gb.add(slotFloor);

  // Snap anchor sits IN the hole (a bit above the floor) so a snapped
  // cart visibly clips into the slot.
  const cartSlotAnchor = new THREE.Object3D();
  cartSlotAnchor.name = 'cart-slot-anchor';
  cartSlotAnchor.position.set(0, bottomH + 0.06, slotCenterZ);
  gb.add(cartSlotAnchor);

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
  powerInd.rotation.x = -Math.PI / 2;
  powerInd.position.set(-0.265, decalY, bezelZ - 0.18);
  gb.add(powerInd);

  // Power LED — small red dot just above the POWER indicator that
  // lights up when the device is booted.
  const led = new THREE.Mesh(
    new THREE.CircleGeometry(0.012, 32),
    new THREE.MeshStandardMaterial({
      color: 0x551515,
      emissive: 0x220505,
      emissiveIntensity: 0.4,
      roughness: 0.4,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    }),
  );
  led.name = 'led';
  led.rotation.x = -Math.PI / 2;
  led.position.set(-0.265, decalY, bezelZ - 0.30);
  gb.add(led);

  // ---------- "GAME BOY COLOR" wordmark (centered below LCD) ----------
  const gbcLogo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.46, 0.085),
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
    new THREE.PlaneGeometry(0.10, 0.022),
    makeSmallLabel('SELECT'),
  );
  labelSelect.rotation.x = -Math.PI / 2;
  labelSelect.position.set(pillSelectX, frontY, ssZ + 0.05);
  gb.add(labelSelect);

  const labelStart = new THREE.Mesh(
    new THREE.PlaneGeometry(0.10, 0.022),
    makeSmallLabel('START'),
  );
  labelStart.rotation.x = -Math.PI / 2;
  labelStart.position.set(pillStartX, frontY, ssZ + 0.05);
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

  // (cartridge slot now lives in the body construction above — it's
  //  a real geometric hole formed by the gap between the top-front,
  //  top-back, top-left, and top-right slabs.)

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
