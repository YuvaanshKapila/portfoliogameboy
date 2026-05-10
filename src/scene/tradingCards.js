import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * Trading cards scattered face-down on the desk around the Game Boy.
 *
 * The card-back design is generic — inspired by classic-era TCG art
 * (deep blue swirling background + monster-ball motif + dark border)
 * but distinct from any specific franchise's copyrighted artwork.
 */
export function buildTradingCards() {
  const group = new THREE.Group();
  group.name = 'trading-cards';

  const tex = makeCardBackTexture();
  const cardMat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.5,
    metalness: 0,
  });
  const edgeMat = new THREE.MeshStandardMaterial({
    color: 0x1a2a5a,
    roughness: 0.6,
  });

  // Real TCG card ~63 × 88mm. In scene units (1 ≈ 10cm) → 0.063 × 0.088.
  // Scaled up here so they read at our camera distance.
  const cardW = 0.34;
  const cardH = 0.006;
  const cardL = 0.48;

  // Scatter pattern — a small fan on each side of the scene.
  // Random-feeling positions but deterministic so they don't shuffle
  // every reload.
  // Scattered to the LEFT and RIGHT sides only — the front strip of
  // the desk is reserved for the "click here!" sketch, and the bottom
  // pair of cards previously cluttered that area.
  // Scattered all around the scene — left, right, top (back), bottom (front).
  const layouts = [
    // RIGHT side — tucked close to the Game Boy
    { x:  1.30, z: -0.40, ry:  0.45, dy: 0 },
    { x:  1.40, z:  0.40, ry: -0.30, dy: cardH * 1.2 },
    // LEFT side — tucked close to the basket
    { x: -1.55, z: -0.45, ry:  0.10, dy: 0 },
    { x: -1.50, z:  0.55, ry: -0.35, dy: cardH * 1.2 },
    // TOP (back of desk)
    { x: -0.30, z: -1.85, ry:  0.20, dy: 0 },
    { x:  1.05, z: -1.75, ry: -0.45, dy: cardH * 1.3 },
    // BOTTOM (front of desk)
    { x: -0.95, z:  1.65, ry: -0.30, dy: 0 },
    { x:  1.20, z:  1.70, ry:  0.40, dy: cardH * 1.4 },
    { x:  0.10, z:  1.95, ry:  0.15, dy: 0 },
  ];

  for (let i = 0; i < layouts.length; i++) {
    const L = layouts[i];
    // Use the cardMat directly — face-up uses the back-of-card art so
    // every visible top face shows the same illustration.
    const card = new THREE.Mesh(
      new RoundedBoxGeometry(cardW, cardH, cardL, 4, 0.008),
      [edgeMat, edgeMat, cardMat, edgeMat, edgeMat, edgeMat],
    );
    // RoundedBoxGeometry uses one material slot; multi-material won't
    // apply cleanly. Fall back to single material — the back/edges are
    // close enough in tone that no one will notice the wrap.
    card.material = cardMat;

    card.position.set(L.x, cardH / 2 + L.dy, L.z);
    card.rotation.y = L.ry;
    card.castShadow = true;
    card.receiveShadow = true;
    group.add(card);
  }

  return group;
}

/* ------------------------------------------------------------------
   Procedural card-back texture — generic blue-swirl design with a
   monster-ball motif. Drawn purely with canvas primitives; nothing
   is sourced from copyrighted artwork.
   ------------------------------------------------------------------ */
function makeCardBackTexture() {
  const W = 512, H = 720;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  // Outer border — deep navy
  ctx.fillStyle = '#0e1f4d';
  ctx.fillRect(0, 0, W, H);

  // Inner playing field with a swirling blue radial gradient
  ctx.save();
  const padX = 22, padY = 30;
  const innerX = padX, innerY = padY;
  const innerW = W - padX * 2, innerH = H - padY * 2;

  // Clip to rounded inner area
  ctx.beginPath();
  roundRect(ctx, innerX, innerY, innerW, innerH, 12);
  ctx.clip();

  // Base radial gradient
  const cx = W / 2, cy = H / 2;
  const grad = ctx.createRadialGradient(cx, cy, 60, cx, cy, 420);
  grad.addColorStop(0.00, '#7fa6ff');
  grad.addColorStop(0.45, '#345db8');
  grad.addColorStop(0.85, '#1a2a5a');
  grad.addColorStop(1.00, '#0a1430');
  ctx.fillStyle = grad;
  ctx.fillRect(innerX, innerY, innerW, innerH);

  // Procedural swirl streaks — multiple translucent arcs that rotate
  // around the center to mimic a wind-swirl background.
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
  // A few brighter highlight streaks
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    const r = 110 + i * 50;
    const startA = (Math.PI / 3) * i;
    ctx.beginPath();
    ctx.arc(cx, cy, r, startA, startA + 0.9);
    ctx.stroke();
  }

  // ===== Monster-ball motif (generic design) =====
  const ballR = 130;
  const bx = cx;
  const by = cy + 20;

  // Soft outer glow
  const glow = ctx.createRadialGradient(bx, by, ballR * 0.7, bx, by, ballR * 1.6);
  glow.addColorStop(0, 'rgba(255,255,255,0.25)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(bx, by, ballR * 1.6, 0, Math.PI * 2);
  ctx.fill();

  // Bottom hemisphere (white/cream)
  ctx.beginPath();
  ctx.arc(bx, by, ballR, 0, Math.PI);
  ctx.closePath();
  const whiteGrad = ctx.createLinearGradient(bx - ballR, by, bx + ballR, by + ballR);
  whiteGrad.addColorStop(0, '#ffffff');
  whiteGrad.addColorStop(1, '#c8c8c8');
  ctx.fillStyle = whiteGrad;
  ctx.fill();

  // Top hemisphere (red)
  ctx.beginPath();
  ctx.arc(bx, by, ballR, Math.PI, Math.PI * 2);
  ctx.closePath();
  const redGrad = ctx.createLinearGradient(bx - ballR, by - ballR, bx + ballR, by);
  redGrad.addColorStop(0, '#e23a3a');
  redGrad.addColorStop(1, '#9a1818');
  ctx.fillStyle = redGrad;
  ctx.fill();

  // Dark equator band
  ctx.fillStyle = '#141414';
  ctx.fillRect(bx - ballR, by - 16, ballR * 2, 32);

  // Center button — outer dark ring, inner light disc, tiny inner dark dot
  ctx.beginPath();
  ctx.arc(bx, by, 30, 0, Math.PI * 2);
  ctx.fillStyle = '#141414';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bx, by, 22, 0, Math.PI * 2);
  ctx.fillStyle = '#f0f0f0';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bx, by, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#3a4a6a';
  ctx.fill();

  // Specular highlight on the upper-left of the ball
  const hi = ctx.createRadialGradient(
    bx - ballR * 0.45, by - ballR * 0.5, 5,
    bx - ballR * 0.4,  by - ballR * 0.45, ballR * 0.55,
  );
  hi.addColorStop(0, 'rgba(255,255,255,0.7)');
  hi.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hi;
  ctx.beginPath();
  ctx.arc(bx, by, ballR, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Outer black hairline border (like a real TCG card edge)
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
