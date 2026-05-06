import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * A small wooden basket on the desk holding four cartridge "prisms".
 * The basket itself is static; each cartridge is a draggable mesh.
 *
 * Returns:
 *   group       — the THREE.Group to add to the scene
 *   cartridges  — flat array of cartridge meshes (DragControls input)
 */
export function buildCartridgeBasket() {
  const group = new THREE.Group();
  group.name = 'cart-basket';

  // ---------- basket (open-top tray) ----------
  const basketColor = 0x3a2616;
  const basketMat = new THREE.MeshPhysicalMaterial({
    color: basketColor,
    roughness: 0.78,
    clearcoat: 0.18,
    clearcoatRoughness: 0.6,
    sheen: 0.2,
    sheenRoughness: 0.85,
    sheenColor: new THREE.Color(0x4a2a14),
  });

  const wallH = 0.10;
  const wallT = 0.022;
  const inW = 0.34;     // interior width
  const inL = 0.46;     // interior length
  const outW = inW + wallT * 2;
  const outL = inL + wallT * 2;
  const baseT = 0.018;

  // base
  const base = new THREE.Mesh(
    new RoundedBoxGeometry(outW, baseT, outL, 4, 0.008),
    basketMat,
  );
  base.position.y = baseT / 2;
  base.receiveShadow = true;
  base.castShadow = true;
  group.add(base);

  // four walls
  const wallY = baseT + wallH / 2;
  const wallFront = new THREE.Mesh(
    new RoundedBoxGeometry(outW, wallH, wallT, 3, 0.006),
    basketMat,
  );
  wallFront.position.set(0, wallY, outL / 2 - wallT / 2);
  wallFront.castShadow = true; wallFront.receiveShadow = true;
  group.add(wallFront);

  const wallBack = wallFront.clone();
  wallBack.position.z = -outL / 2 + wallT / 2;
  group.add(wallBack);

  const wallLeft = new THREE.Mesh(
    new RoundedBoxGeometry(wallT, wallH, outL, 3, 0.006),
    basketMat,
  );
  wallLeft.position.set(-outW / 2 + wallT / 2, wallY, 0);
  wallLeft.castShadow = true; wallLeft.receiveShadow = true;
  group.add(wallLeft);

  const wallRight = wallLeft.clone();
  wallRight.position.x = outW / 2 - wallT / 2;
  group.add(wallRight);

  // ---------- cartridges ----------
  const cartridges = [];
  // Game Boy cartridge proportions: 57×65×8 mm. In our units (1 ≈ 10cm):
  // 0.57 × 0.65 × 0.08 → too big for the basket. Scale down to a friendly
  // miniature: 0.16 × 0.04 × 0.20.
  const cartW = 0.16;
  const cartH = 0.045;
  const cartL = 0.21;

  // distinct cartridge colors so they're recognizable as separate
  const palette = [
    { body: 0xc7c4b8, label: 0xb73e3e }, // gray + red label (Pokemon Red feel)
    { body: 0xdcd6c5, label: 0x2d6ea8 }, // off-white + blue (Pokemon Blue)
    { body: 0xefe8c8, label: 0xd4a01a }, // cream + gold (Pokemon Yellow)
    { body: 0x444a52, label: 0x4caa6f }, // gray + green (Wario Land)
  ];

  for (let i = 0; i < palette.length; i++) {
    const p = palette[i];

    const cart = new THREE.Group();
    cart.name = `cartridge-${i}`;
    cart.userData.draggable = true;

    // body
    const body = new THREE.Mesh(
      new RoundedBoxGeometry(cartW, cartH, cartL, 4, 0.008),
      new THREE.MeshPhysicalMaterial({
        color: p.body, roughness: 0.45, clearcoat: 0.3, clearcoatRoughness: 0.4,
      }),
    );
    body.castShadow = true;
    body.receiveShadow = true;
    cart.add(body);

    // colored label sticker (top face, slightly inset)
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(cartW * 0.84, cartL * 0.66),
      new THREE.MeshStandardMaterial({
        color: p.label,
        roughness: 0.5,
        metalness: 0.0,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    );
    label.rotation.x = -Math.PI / 2;
    label.position.y = cartH / 2 + 0.001;
    label.position.z = -cartL * 0.1;  // slightly toward the top end
    cart.add(label);

    // Cartridges stand on edge inside the basket, leaning slightly
    cart.position.set(
      -outW / 2 + wallT + 0.04 + i * 0.07,
      baseT + cartH / 2,
      -0.02,
    );
    cart.rotation.y = THREE.MathUtils.degToRad(8);

    group.add(cart);
    cartridges.push(cart);
  }

  return { group, cartridges };
}
