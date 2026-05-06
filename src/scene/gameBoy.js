import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  matBodyKiwi, matBezel, matButtonGrey, matRubberMatte,
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
 * Atomic Purple Game Boy Color, with Yuvaansh's name etched into the
 * body in place of the Nintendo wordmark.
 *
 * Conventions:
 *   +X right, +Y up, +Z toward camera.
 *   Device lies flat on the desk. Front face faces +Y.
 *   -Z = top edge, +Z = bottom edge.
 *
 * Y-layer separation (each plane lives at a distinct height + every
 * decal material uses polygonOffset so opaque/transparent layers stop
 * z-fighting from any camera angle):
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
  // BODY  —  high-poly rounded box for smooth corners
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
  // BEZEL
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

  // ---------- LCD ----------
  const lcdSize = 0.42;
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(lcdSize, lcdSize),
    makeScreenMaterial(),
  );
  screen.rotation.x = -Math.PI / 2;
  screen.position.set(0, lcdY, bezelZ - 0.08);
  gb.add(screen);

  // ---------- POWER indicator (left of bezel) ----------
  const powerInd = new THREE.Mesh(
    new THREE.PlaneGeometry(0.06, 0.14),
    makePowerIndicatorMaterial(),
  );
  powerInd.rotation.x = -Math.PI / 2;
  powerInd.position.set(-0.255, decalY, bezelZ - 0.18);
  gb.add(powerInd);

  // ---------- "GAME BOY COLOR" wordmark ----------
  const gbcLogo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.10),
    makeGameBoyColorLogoMaterial(),
  );
  gbcLogo.rotation.x = -Math.PI / 2;
  gbcLogo.position.set(0, decalY, bezelZ + 0.26);
  gb.add(gbcLogo);

  // ---------- "▲ COMM" silkscreen ----------
  const commLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.20, 0.055),
    makeCommIndicatorMaterial(),
  );
  commLabel.rotation.x = -Math.PI / 2;
  commLabel.position.set(-0.18, frontY, -halfL + 0.06);
  gb.add(commLabel);

  // ---------- "Yuvaansh" engraved wordmark ----------
  const yuvaansh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.32, 0.05),
    makeNintendoWordmarkMaterial('Yuvaansh'),
  );
  yuvaansh.rotation.x = -Math.PI / 2;
  yuvaansh.position.set(0, frontY, bezelZ + bezelL / 2 + 0.06);
  gb.add(yuvaansh);

  // ============================================================
  // D-PAD  —  higher-poly rounded box arms, lots of corner segs
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
  abGroup.add(btnB); abGroup.add(btnA);
  abGroup.position.set(0.22, frontY - 0.001, 0.30);
  gb.add(abGroup);

  // ============================================================
  // SELECT / START — centered horizontally
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
  const ssGroup = new THREE.Group();
  const sel = makePill();
  const sta = makePill();
  sel.position.set(-0.07, frontY + 0.012, 0);
  sta.position.set(+0.07, frontY + 0.012, 0);
  ssGroup.add(sel); ssGroup.add(sta);
  ssGroup.position.set(0, 0, 0.50);
  gb.add(ssGroup);

  const ssLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.30, 0.025),
    makeSelectStartLabelMaterial(),
  );
  ssLabel.rotation.x = -Math.PI / 2;
  ssLabel.position.set(0, frontY, 0.555);
  gb.add(ssLabel);

  // ============================================================
  // SPEAKER (square area, sparse dot grid)
  // ============================================================
  const speaker = new THREE.Mesh(
    new THREE.PlaneGeometry(0.18, 0.18),
    makeSpeakerGridMaterial(),
  );
  speaker.rotation.x = -Math.PI / 2;
  speaker.position.set(0.24, frontY, 0.50);
  gb.add(speaker);

  // ============================================================
  // SIDE / EDGE DETAILS
  // (no cart slot rectangle — kept the top edge clean per request)
  // ============================================================

  // Volume wheel — LEFT side edge
  const volWheel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.026, 0.16, 64),
    new THREE.MeshStandardMaterial({ color: 0x2a2722, roughness: 0.55, metalness: 0.4 }),
  );
  volWheel.rotation.z = Math.PI / 2;
  volWheel.position.set(-halfW + 0.005, D / 2, -0.30);
  gb.add(volWheel);

  // ridges around the volume wheel
  const ridgeMat = new THREE.MeshStandardMaterial({ color: 0x14110d, roughness: 0.85 });
  for (let i = 0; i < 24; i++) {
    const ang = (i / 24) * Math.PI * 2;
    const r = 0.027;
    const ridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.005, 0.003),
      ridgeMat,
    );
    ridge.position.set(
      -halfW + 0.005,
      D / 2 + Math.sin(ang) * r,
      -0.30 + Math.cos(ang) * r,
    );
    ridge.rotation.x = ang;
    gb.add(ridge);
  }

  // Headphone jack — small dark hole on bottom edge
  const headphoneJack = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.05, 48),
    matBezel,
  );
  headphoneJack.rotation.x = Math.PI / 2;
  headphoneJack.position.set(0.18, D / 2, halfL - 0.02);
  gb.add(headphoneJack);

  // Subtle case-half seam line — a slim dark band running around the
  // perimeter at midline, faking the join between front and back shells.
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
