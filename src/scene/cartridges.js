import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * A small wooden basket with four real-looking GBC cartridges inside.
 * Each cartridge has a printed sticker label naming a portfolio
 * section: PROJECTS, ABOUT ME, HOBBIES, EXPERIENCE.
 *
 * Cartridges are draggable in 3D — the basket stays put.
 *
 * Returns:
 *   group       — the THREE.Group to add to the scene
 *   cartridges  — flat array of cartridge meshes (DragControls input)
 */

// Alphabetical order: ABOUT ME, CONTACT, EXPERIENCE, HOBBIES, PROJECTS
const CART_TITLES = [
  { title: 'ABOUT ME',   accent: '#2c5fce' },
  { title: 'CONTACT',    accent: '#9d3bd1' },
  { title: 'EXPERIENCE', accent: '#ee7e2e' },
  { title: 'HOBBIES',    accent: '#2eb748' },
  { title: 'PROJECTS',   accent: '#e7332e' },
];

export function buildCartridgeBasket() {
  const group = new THREE.Group();
  group.name = 'cart-basket';

  // ============================================================
  // BASKET — wooden open-top tray that holds the cartridges
  // ============================================================
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

  // Sized so all FIVE cartridges sit flat inside with no overlap.
  const inW = 0.46;
  const inL = 1.95;       // longer to fit 5 carts
  const wallH = 0.10;
  const wallT = 0.024;
  const baseT = 0.020;
  const outW = inW + wallT * 2;
  const outL = inL + wallT * 2;

  const base = new THREE.Mesh(
    new RoundedBoxGeometry(outW, baseT, outL, 4, 0.008),
    basketMat,
  );
  base.position.y = baseT / 2;
  base.receiveShadow = true;
  base.castShadow = true;
  group.add(base);

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

  // ============================================================
  // CARTRIDGES — proper GBC shape: dark gray plastic with a printed
  // white label sticker on the front face.
  // ============================================================
  const cartridges = [];

  // Cartridges scaled up ~1.4x so they read well at any zoom level.
  const cartW = 0.40;
  const cartH = 0.085;
  const cartL = 0.38;
  const labelMargin = 0.05;
  const cartBodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x1d1d1d,
    roughness: 0.55,
    clearcoat: 0.45,
    clearcoatRoughness: 0.35,
  });

  for (let i = 0; i < CART_TITLES.length; i++) {
    const { title, accent } = CART_TITLES[i];

    // The cart is a single MESH (the body) with all the decoration
    // attached as children. This is critical for DragControls — we
    // pass an array of meshes (not groups), so when one is hit, the
    // mesh + its children all move together.
    const cart = new THREE.Mesh(
      new RoundedBoxGeometry(cartW, cartH, cartL, 6, 0.014),
      cartBodyMat,
    );
    cart.name = `cartridge-${title.toLowerCase().replace(/\s+/g, '-')}`;
    cart.castShadow = true;
    cart.receiveShadow = true;
    cart.userData.draggable = true;
    cart.userData.kind = 'cartridge';
    cart.userData.title = title;

    // CRITICAL: every child mesh below has raycast disabled. Without
    // this, the labels/ridges sit slightly above the cart body and
    // get hit by the raycaster FIRST. DragControls then picks up
    // the child mesh, drags only that, and the cart visibly 'splits'
    // — the body stays put while the label/ridge moves. With
    // raycast disabled, only the cart body itself is hittable, so
    // DragControls picks up the body and the children follow as
    // its children automatically.
    const noRaycast = function () { /* skip in raycast */ };

    // Side ridges (molded "fins")
    const ridgeMat = new THREE.MeshStandardMaterial({
      color: 0x131313, roughness: 0.6,
    });
    for (let r = 0; r < 4; r++) {
      const ridge = new THREE.Mesh(
        new THREE.BoxGeometry(cartW + 0.002, 0.005, 0.008),
        ridgeMat,
      );
      ridge.position.set(0, cartH / 2 - 0.006, -cartL / 2 + 0.04 + r * 0.02);
      ridge.raycast = noRaycast;
      cart.add(ridge);
    }

    // Top embossed oval
    const embossOval = new THREE.Mesh(
      new RoundedBoxGeometry(cartW * 0.7, 0.005, 0.07, 4, 0.018),
      ridgeMat,
    );
    embossOval.position.set(0, cartH / 2 - 0.001, -cartL / 2 + 0.10);
    embossOval.raycast = noRaycast;
    cart.add(embossOval);

    // Sticker labels on BOTH +Y and -Y faces — readable flat in the
    // basket and standing in the slot (cart rotates -90° X to stand).
    const labelTex = makeCartridgeLabel(title, accent);
    const labelMat = new THREE.MeshStandardMaterial({
      map: labelTex,
      roughness: 0.55,
      metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const labelGeo = new THREE.PlaneGeometry(cartW - labelMargin * 0.6, cartL * 0.62);

    const labelTop = new THREE.Mesh(labelGeo, labelMat);
    labelTop.rotation.x = -Math.PI / 2;
    labelTop.position.y = cartH / 2 + 0.001;
    labelTop.position.z = cartL * 0.06;
    labelTop.raycast = noRaycast;
    cart.add(labelTop);

    const labelBottom = new THREE.Mesh(labelGeo, labelMat);
    labelBottom.rotation.x = Math.PI / 2;
    labelBottom.position.y = -cartH / 2 - 0.001;
    labelBottom.position.z = cartL * 0.06;
    labelBottom.raycast = noRaycast;
    cart.add(labelBottom);

    // Laid flat in the basket, lined up along Z with a small gap
    // between each so every label is readable.
    const n = CART_TITLES.length;
    const gap = (inL - cartL * n) / Math.max(1, n - 1);
    cart.position.set(
      0,
      baseT + cartH / 2,
      -inL / 2 + cartL / 2 + i * (cartL + gap),
    );

    // Remember the cart's home position in the basket so it can be
    // animated back when a different cart replaces it in the slot.
    cart.userData.basketHome = cart.position.clone();

    group.add(cart);
    cartridges.push(cart);
  }

  return { group, cartridges };
}

/* ------------------------------------------------------------------
   Cartridge label texture — white sticker with a vertical
   "GAME BOY COLOR" stripe on the left and a big project-name title
   in the middle. Mimics a real GBC cart label.
   ------------------------------------------------------------------ */
function makeCartridgeLabel(title, accent) {
  const W = 1024, H = 1024;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  // Off-white sticker
  ctx.fillStyle = '#f4ede0';
  ctx.fillRect(0, 0, W, H);

  // tiny paper-grain noise
  const img = ctx.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 8;
    img.data[i]     += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);

  // Left vertical stripe — deep purple like the real GBC cart labels
  ctx.fillStyle = '#3d2b8c';
  ctx.fillRect(0, 0, 130, H);

  // "GAME BOY COLOR" rotated text on the stripe — letters in their
  // canonical rainbow palette
  ctx.save();
  ctx.translate(72, H / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = `400 84px "Lilita One", "Bowlby One", "Arial Black", sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  const word = 'GAME BOY ';
  const colorWord = 'CoLoR';
  const colorWordCols = ['#e7332e', '#ee7e2e', '#f5d11a', '#2eb748', '#2c5fce'];

  // measure
  let totalW = ctx.measureText(word).width;
  for (const ch of colorWord) totalW += ctx.measureText(ch).width;
  let xx = -totalW / 2;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(word, xx, 0);
  xx += ctx.measureText(word).width;
  for (let i = 0; i < colorWord.length; i++) {
    ctx.fillStyle = colorWordCols[i];
    ctx.fillText(colorWord[i], xx, 0);
    xx += ctx.measureText(colorWord[i]).width;
  }
  ctx.restore();

  // Tiny copyright line in the upper-right
  ctx.fillStyle = '#222';
  ctx.font = '600 36px "Jost", "Futura", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('© 2026 YUVAANSH', 170, 30);
  ctx.fillText('CGB-XXX-USA', 170, 80);

  // Title — large bold, with accent-colored shadow
  ctx.save();
  ctx.translate((W + 130) / 2, H / 2 + 40);
  ctx.font = `800 140px "Bowlby One", "Lilita One", "Arial Black", sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.transform(1, 0, -0.10, 1, 0, 0);

  // word-wrap on space if too wide
  const lines = wrapTitle(title, ctx, 700);
  const lineH = 150;
  const startY = -((lines.length - 1) * lineH) / 2;
  for (let i = 0; i < lines.length; i++) {
    const y = startY + i * lineH;
    // accent shadow
    ctx.fillStyle = accent;
    ctx.fillText(lines[i], 6, y + 8);
    // dark fill
    ctx.fillStyle = '#1a1a1a';
    ctx.fillText(lines[i], 0, y);
  }
  ctx.restore();

  // small accent pill bottom-right
  ctx.fillStyle = accent;
  ctx.beginPath();
  const pillX = W - 230, pillY = H - 110, pillW = 180, pillH = 56;
  ctx.roundRect(pillX, pillY, pillW, pillH, 28);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 32px "Jost", "Futura", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PLAY GAME', pillX + pillW / 2, pillY + pillH / 2);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function wrapTitle(text, ctx, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return [text];
  const words = text.split(/\s+/);
  if (words.length === 1) return [text];
  const lines = [];
  let cur = words[0];
  for (let i = 1; i < words.length; i++) {
    const test = cur + ' ' + words[i];
    if (ctx.measureText(test).width > maxWidth) {
      lines.push(cur);
      cur = words[i];
    } else {
      cur = test;
    }
  }
  lines.push(cur);
  return lines;
}
