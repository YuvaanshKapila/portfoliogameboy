import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CARDS } from '../cardData.js';

/**
 * Trading cards scattered face-UP on the desk. Each card is a real
 * artifact from the trainer's (my) life — pikachu plush, pokemon
 * collection, manga, etc. Clicking a card tells the Pokédex to
 * scan it (look up the entry, play the voice MP3, render on LCD).
 *
 * Each card's top face shows its photo + name. userData.cardId
 * is set so the click handler can look up the entry.
 */
export function buildTradingCards() {
  const group = new THREE.Group();
  group.name = 'trading-cards';

  // Real TCG card ~63 × 88mm. In scene units (1 ≈ 10cm) → 0.063 × 0.088.
  // Scaled up here so they read at our camera distance.
  const cardW = 0.34;
  const cardH = 0.006;
  const cardL = 0.48;

  // Hand-placed layout matching the 8 cards we have data for.
  // Cards lie face-down (back of card on top), like a real card
  // collection scattered on the desk. Layout puts the pokemon-
  // collection card down in the front, clear of the Pokédex.
  const layouts = [
    // matches CARDS array order (cardData.js):
    //   0 pikachu-plush, 1 pokemon-collection, 2 dessert, 3 cars,
    //   4 manga, 5 travel, 6 pc, 7 soccer
    { x:  1.30, z: -0.40, ry:  0.45 },  // pikachu-plush (right back)
    { x: -1.40, z:  1.40, ry:  0.20 },  // pokemon-collection (moved HIGHER / more -Z so it stays on screen)
    { x: -1.55, z: -0.45, ry:  0.10 },  // dessert (left back)
    { x: -1.50, z:  0.55, ry: -0.35 },  // cars (left middle)
    { x: -0.30, z: -1.85, ry:  0.20 },  // manga (back center)
    { x:  1.05, z: -1.75, ry: -0.45 },  // travel (back right)
    { x: -0.30, z:  1.55, ry: -0.30 },  // pc (nudged slightly down/forward)
    { x:  1.05, z:  1.40, ry:  0.18 },  // soccer (nudged right + tilted opposite way)
  ];

  // All cards share the same face-down back (classic Pokémon TCG
  // card-back design). The Pokédex chooses one at random to scan
  // when opened — players don't pick a card by clicking it.
  const backTex = makeCardBackTexture();
  const cardMat = new THREE.MeshStandardMaterial({
    map: backTex, roughness: 0.5, metalness: 0,
  });

  const cards = [];
  for (let i = 0; i < CARDS.length && i < layouts.length; i++) {
    const data = CARDS[i];
    const L = layouts[i];

    const card = new THREE.Mesh(
      new RoundedBoxGeometry(cardW, cardH, cardL, 4, 0.008),
      cardMat,
    );
    card.position.set(L.x, cardH / 2, L.z);
    card.rotation.y = L.ry;
    card.castShadow = true;
    card.receiveShadow = true;
    card.userData.cardId = data.id;
    card.userData.kind = 'card';
    group.add(card);
    cards.push(card);
  }

  return group;
}

/* ------------------------------------------------------------------
   Generic card-back texture — deep blue field with a swirl pattern
   and a monster-ball motif in the center. Identical across every
   card on the desk.
   ------------------------------------------------------------------ */
function makeCardBackTexture() {
  const W = 512, H = 720;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  // Outer navy border
  ctx.fillStyle = '#0e1f4d';
  ctx.fillRect(0, 0, W, H);

  // Inner playing field with radial blue gradient
  ctx.save();
  const padX = 22, padY = 30;
  const innerX = padX, innerY = padY;
  const innerW = W - padX * 2, innerH = H - padY * 2;
  roundRect(ctx, innerX, innerY, innerW, innerH, 12);
  ctx.clip();

  const cx = W / 2, cy = H / 2;
  const grad = ctx.createRadialGradient(cx, cy, 60, cx, cy, 420);
  grad.addColorStop(0.00, '#7fa6ff');
  grad.addColorStop(0.45, '#345db8');
  grad.addColorStop(0.85, '#1a2a5a');
  grad.addColorStop(1.00, '#0a1430');
  ctx.fillStyle = grad;
  ctx.fillRect(innerX, innerY, innerW, innerH);

  // Procedural swirl streaks
  ctx.strokeStyle = 'rgba(220, 235, 255, 0.18)';
  ctx.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const r = 80 + i * 26;
    const startA = (i * 0.4) % (Math.PI * 2);
    const span = Math.PI * 1.4;
    ctx.lineWidth = 5 - (i % 3);
    ctx.beginPath();
    ctx.arc(cx, cy, r, startA, startA + span);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    const r = 110 + i * 50;
    const startA = (Math.PI / 3) * i;
    ctx.beginPath();
    ctx.arc(cx, cy, r, startA, startA + 0.9);
    ctx.stroke();
  }

  // Monster-ball motif (generic, drawn with primitives)
  const ballR = 130, bx = cx, by = cy + 20;
  const glow = ctx.createRadialGradient(bx, by, ballR * 0.7, bx, by, ballR * 1.6);
  glow.addColorStop(0, 'rgba(255,255,255,0.25)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(bx, by, ballR * 1.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(bx, by, ballR, 0, Math.PI);
  ctx.closePath();
  const whiteGrad = ctx.createLinearGradient(bx - ballR, by, bx + ballR, by + ballR);
  whiteGrad.addColorStop(0, '#ffffff');
  whiteGrad.addColorStop(1, '#c8c8c8');
  ctx.fillStyle = whiteGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(bx, by, ballR, Math.PI, Math.PI * 2);
  ctx.closePath();
  const redGrad = ctx.createLinearGradient(bx - ballR, by - ballR, bx + ballR, by);
  redGrad.addColorStop(0, '#e23a3a');
  redGrad.addColorStop(1, '#9a1818');
  ctx.fillStyle = redGrad;
  ctx.fill();

  ctx.fillStyle = '#141414';
  ctx.fillRect(bx - ballR, by - 16, ballR * 2, 32);

  ctx.beginPath();
  ctx.arc(bx, by, 30, 0, Math.PI * 2);
  ctx.fillStyle = '#141414'; ctx.fill();
  ctx.beginPath();
  ctx.arc(bx, by, 22, 0, Math.PI * 2);
  ctx.fillStyle = '#f0f0f0'; ctx.fill();
  ctx.beginPath();
  ctx.arc(bx, by, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#3a4a6a'; ctx.fill();

  ctx.restore();

  // Hairline black border
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  roundRect(ctx, 4, 4, W - 8, H - 8, 14);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}
