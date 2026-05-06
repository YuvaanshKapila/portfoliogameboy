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

const CART_TITLES = [
  { title: 'PROJECTS',   accent: '#e7332e' },
  { title: 'ABOUT ME',   accent: '#2c5fce' },
  { title: 'HOBBIES',    accent: '#2eb748' },
  { title: 'EXPERIENCE', accent: '#ee7e2e' },
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

  // sized to fit four upright cartridges side by side
  const inW = 0.42;
  const inL = 0.50;
  const wallH = 0.16;
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

  // Real GBC cartridge proportions ~58×65×8mm. In our units (1=10cm)
  // that's about 0.30 × 0.06 × 0.34. Slightly chunkier than spec so
  // the labels read well at any zoom level.
  const cartW = 0.30;
  const cartH = 0.064;
  const cartL = 0.34;
  const labelMargin = 0.05;
  const cartBodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x1d1d1d,
    roughness: 0.55,
    clearcoat: 0.45,
    clearcoatRoughness: 0.35,
  });

  for (let i = 0; i < CART_TITLES.length; i++) {
    const { title, accent } = CART_TITLES[i];

    const cart = new THREE.Group();
    cart.name = `cartridge-${title.toLowerCase().replace(/\s+/g, '-')}`;
    cart.userData.draggable = true;
    cart.userData.kind = 'cartridge';
    cart.userData.title = title;

    // Body — dark gray rounded prism
    const body = new THREE.Mesh(
      new RoundedBoxGeometry(cartW, cartH, cartL, 6, 0.014),
      cartBodyMat,
    );
    body.castShadow = true;
    body.receiveShadow = true;
    cart.add(body);

    // Side ridges (the molded "fins" on a real GBC cart)
    const ridgeMat = new THREE.MeshStandardMaterial({
      color: 0x131313, roughness: 0.6,
    });
    for (let r = 0; r < 4; r++) {
      const ridge = new THREE.Mesh(
        new THREE.BoxGeometry(cartW + 0.002, 0.005, 0.008),
        ridgeMat,
      );
      ridge.position.set(0, cartH / 2 - 0.006, -cartL / 2 + 0.04 + r * 0.02);
      cart.add(ridge);
    }

    // Top "Nintendo GAME BOY™" embossed area — a slight raised oval
    const embossOval = new THREE.Mesh(
      new RoundedBoxGeometry(cartW * 0.7, 0.005, 0.07, 4, 0.018),
      ridgeMat,
    );
    embossOval.position.set(0, cartH / 2 - 0.001, -cartL / 2 + 0.10);
    cart.add(embossOval);

    // Front sticker label
    const labelTex = makeCartridgeLabel(title, accent);
    const labelMat = new THREE.MeshStandardMaterial({
      map: labelTex,
      roughness: 0.55,
      metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(cartW - labelMargin * 0.6, cartL * 0.62),
      labelMat,
    );
    label.rotation.x = -Math.PI / 2;
    label.position.y = cartH / 2 + 0.001;
    label.position.z = cartL * 0.06;  // shifted toward the bottom of the cart
    cart.add(label);

    // Stand the cart upright (label-up) inside the basket, leaning
    // against the back wall, lined up with its neighbors.
    cart.position.set(
      -inW / 2 + (cartW * 0.55) + i * (cartW * 0.42),
      baseT + cartH / 2,
      -inL * 0.05,
    );

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
  tex.anisotropy = 16;
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
