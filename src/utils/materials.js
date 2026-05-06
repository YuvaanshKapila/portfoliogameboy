import * as THREE from 'three';

/**
 * Materials and procedural textures for the Kiwi Game Boy Color.
 *
 * Reference (Kiwi GBC):
 *   - Body: bright kiwi-lime green plastic, slight clearcoat sheen
 *   - Bezel: matte black, slightly rounded
 *   - Buttons: charcoal translucent gray (NOT maroon — that's DMG)
 *   - Wordmarks: white italic "GAME BOY", rainbow "COLOR", red Nintendo
 *   - Speaker: dot-grid of small round holes in bottom-right corner
 *
 * Font choices for canvas textures:
 *   - Wordmarks  : Cabin Bold Italic (closest free analog of Gill Sans)
 *   - Tiny silks : Jost (closest free analog of Futura)
 */

const F_WORDMARK = '"Cabin", "Gill Sans MT", "Gill Sans", "Trebuchet MS", sans-serif';
const F_LABEL    = '"Jost", "Futura", "Century Gothic", "Trebuchet MS", sans-serif';
// Lilita One: chunky rounded display — closest free analog to the GBC logo's
// hand-drawn italic letters. Bowlby One is the fallback with similar weight.
const F_DISPLAY  = '"Lilita One", "Bowlby One", "Cooper Std", "Arial Black", sans-serif';

// ---------------------------------------------------------------- materials
export const matBodyKiwi = new THREE.MeshPhysicalMaterial({
  color: 0x9bd84a,
  roughness: 0.45,
  clearcoat: 0.55,
  clearcoatRoughness: 0.32,
  reflectivity: 0.25,
});

export const matBezel = new THREE.MeshPhysicalMaterial({
  color: 0x141414,
  roughness: 0.55,
  clearcoat: 0.5,
  clearcoatRoughness: 0.3,
});

export const matButtonGrey = new THREE.MeshPhysicalMaterial({
  color: 0x2c2a28,
  roughness: 0.4,
  clearcoat: 0.6,
  clearcoatRoughness: 0.25,
  reflectivity: 0.2,
});

export const matRubberMatte = new THREE.MeshStandardMaterial({
  color: 0x1d1c1a,
  roughness: 0.92,
  metalness: 0.0,
});

export const matSwitchKnob = new THREE.MeshPhysicalMaterial({
  color: 0xb6b3a8,
  roughness: 0.55,
  clearcoat: 0.25,
});

// ---------------------------------------------------------------- walnut desk
export function makeWalnutMaterial() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 1024;
  const ctx = c.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, '#5a3621');
  grad.addColorStop(0.5, '#4a2a17');
  grad.addColorStop(1, '#36200f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 1024);

  for (let i = 0; i < 220; i++) {
    const y = Math.random() * 1024;
    const alpha = 0.04 + Math.random() * 0.16;
    const dark = Math.random() < 0.55;
    ctx.fillStyle = dark
      ? `rgba(28, 14, 4, ${alpha})`
      : `rgba(120, 70, 35, ${alpha * 0.6})`;
    ctx.fillRect(0, y, 1024, 0.6 + Math.random() * 1.6);
  }
  for (let i = 0; i < 6; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const r = 30 + Math.random() * 40;
    const g = ctx.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, 'rgba(20,10,2,0.55)');
    g.addColorStop(1, 'rgba(20,10,2,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const img = ctx.getImageData(0, 0, 1024, 1024);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 18;
    img.data[i]     = Math.max(0, Math.min(255, img.data[i]     + n));
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n));
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 16;
  tex.colorSpace = THREE.SRGBColorSpace;

  return new THREE.MeshPhysicalMaterial({
    map: tex,
    roughness: 0.78,
    clearcoat: 0.18,
    clearcoatRoughness: 0.6,
    sheen: 0.2,
    sheenRoughness: 0.85,
    sheenColor: new THREE.Color(0x4a2a14),
  });
}

// ---------------------------------------------------------------- screen (LCD off)
/**
 * GBC LCD when powered off — a pale grayish-lavender surface with a
 * fine pixel grid and a soft glass sheen. Lighter than the DMG to
 * match the GBC's TFT panel character.
 */
export function makeScreenMaterial() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 920;
  const ctx = c.getContext('2d');

  // pale lavender-gray base
  const g = ctx.createLinearGradient(0, 0, 0, 920);
  g.addColorStop(0, '#bcc1c8');
  g.addColorStop(1, '#9ea3ad');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 920);

  // crisp pixel grid
  ctx.fillStyle = 'rgba(40, 45, 60, 0.18)';
  for (let y = 0; y < 920; y += 5) ctx.fillRect(0, y, 1024, 1);
  for (let x = 0; x < 1024; x += 5) ctx.fillRect(x, 0, 1, 920);

  // gentle vignette
  const v = ctx.createRadialGradient(512, 460, 200, 512, 460, 700);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, 1024, 920);

  // diagonal glass sheen
  const sweep = ctx.createLinearGradient(0, 0, 1024, 920);
  sweep.addColorStop(0, 'rgba(255,255,255,0.18)');
  sweep.addColorStop(0.45, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = sweep;
  ctx.fillRect(0, 0, 1024, 920);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;

  return new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.28,
    metalness: 0.05,
  });
}

// ---------------------------------------------------------------- "GAME BOY COLOR" logo decal
/**
 * "GAME BOY" in chunky white italic + "CoLoR" with rainbow letters
 * (red C, orange o, yellow L, green o, blue R) — matching the
 * canonical GBC packaging logo. Each letter has a tiny dark shadow
 * for the iconic raised-print look on the bezel.
 */
export function makeGameBoyColorLogoMaterial() {
  const W = 2400, H = 480;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  const yMid = H / 2;
  const fontSize = 280;

  // ---------- "GAME BOY" — white, chunky, italic ----------
  ctx.save();
  ctx.translate(120, yMid);
  ctx.transform(1, 0, -0.15, 1, 0, 0);   // strong italic skew
  ctx.font = `400 ${fontSize}px ${F_DISPLAY}`;

  // measure
  const gbStr = 'GAME BOY';
  const letterGap = -8;        // tight kerning
  let totalW = 0;
  for (const ch of gbStr) totalW += ctx.measureText(ch).width + letterGap;

  // dark shadow drop
  let x = 0;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  for (const ch of gbStr) {
    ctx.fillText(ch, x + 6, 8);
    x += ctx.measureText(ch).width + letterGap;
  }
  // white fill
  x = 0;
  ctx.fillStyle = '#ffffff';
  for (const ch of gbStr) {
    ctx.fillText(ch, x, 0);
    x += ctx.measureText(ch).width + letterGap;
  }
  const gameBoyEnd = totalW;
  ctx.restore();

  // ---------- "CoLoR" — rainbow letters ----------
  const letters = ['C', 'o', 'L', 'o', 'R'];
  // canonical GBC palette: red / orange / yellow / green / blue
  const colors  = ['#e7332e', '#ee7e2e', '#f5d11a', '#2eb748', '#2c5fce'];

  ctx.save();
  // place after "GAME BOY" with a small visual gap
  const startX = 120 + gameBoyEnd + 60;
  ctx.translate(startX, yMid);
  ctx.transform(1, 0, -0.15, 1, 0, 0);
  ctx.font = `400 ${fontSize}px ${F_DISPLAY}`;

  let cx = 0;
  for (let i = 0; i < letters.length; i++) {
    const ch = letters[i];
    // dark shadow
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillText(ch, cx + 6, 8);
    // colored fill
    ctx.fillStyle = colors[i];
    ctx.fillText(ch, cx, 0);
    cx += ctx.measureText(ch).width + letterGap;
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    roughness: 0.55,
    metalness: 0,
  });
}

// ---------------------------------------------------------------- "Nintendo®" red wordmark
/**
 * The classic Nintendo wordmark — proper Nintendo red, italic, with a
 * subtle dark outline + drop-shadow giving it the embossed/raised look
 * silkscreened on the green plastic of the GBC body.
 */
export function makeNintendoWordmarkMaterial() {
  const W = 1400, H = 256;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  // ===== "Nintendo" wordmark with debossed depth =====
  ctx.save();
  ctx.translate(W / 2 - 30, H / 2);
  ctx.transform(1, 0, -0.12, 1, 0, 0);     // strong italic skew (Pretendo-feel)
  ctx.font = `italic 700 160px ${F_WORDMARK}`;

  const word = 'Nintendo';

  // 1. dark drop-shadow underneath (gives 3D depth)
  ctx.fillStyle = 'rgba(50, 0, 5, 0.45)';
  ctx.fillText(word, 5, 8);

  // 2. dark stroke outline (the "depth outline" the user asked for)
  ctx.strokeStyle = '#5c0a14';
  ctx.lineWidth = 8;
  ctx.lineJoin = 'round';
  ctx.strokeText(word, 0, 0);

  // 3. main red fill — canonical Nintendo red
  ctx.fillStyle = '#d8232a';
  ctx.fillText(word, 0, 0);

  // 4. subtle highlight on top
  const grad = ctx.createLinearGradient(0, -80, 0, 80);
  grad.addColorStop(0, 'rgba(255,255,255,0.35)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillText(word, 0, 0);
  ctx.restore();

  // ===== ® mark =====
  ctx.save();
  ctx.font = `700 44px ${F_WORDMARK}`;
  ctx.fillStyle = 'rgba(50, 0, 5, 0.45)';
  ctx.textAlign = 'left';
  ctx.fillText('®', W / 2 + 350, H / 2 - 38);
  ctx.fillStyle = '#d8232a';
  ctx.fillText('®', W / 2 + 345, H / 2 - 42);
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    roughness: 0.55,
    metalness: 0,
  });
}

// ---------------------------------------------------------------- POWER indicator
/**
 * Vertical "POWER" stack: red dot, then three white chevrons → → →,
 * then "POWER" text below. Sits on the left side of the bezel.
 */
export function makePowerIndicatorMaterial() {
  const W = 256, H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  // red triangular indicator (pointing right)
  ctx.fillStyle = '#e23a3a';
  ctx.beginPath();
  ctx.moveTo(60, 80);
  ctx.lineTo(60, 160);
  ctx.lineTo(125, 120);
  ctx.closePath();
  ctx.fill();

  // three white-ish chevrons (right-pointing)
  ctx.strokeStyle = '#e8e8e8';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < 3; i++) {
    const x = 145 + i * 28;
    ctx.beginPath();
    ctx.moveTo(x, 95);
    ctx.lineTo(x + 24, 120);
    ctx.lineTo(x, 145);
    ctx.stroke();
  }

  // "POWER" text below
  ctx.fillStyle = '#e8e8e8';
  ctx.font = `600 44px ${F_LABEL}`;
  ctx.textAlign = 'left';
  ctx.fillText('POWER', 50, 230);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    roughness: 0.7,
    metalness: 0,
  });
}

// ---------------------------------------------------------------- "▲ COMM" indicator
export function makeCommIndicatorMaterial() {
  const W = 512, H = 144;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  // dark triangle pointing up
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.moveTo(150, 30);
  ctx.lineTo(180, 100);
  ctx.lineTo(120, 100);
  ctx.closePath();
  ctx.fill();

  // "COMM" text
  ctx.fillStyle = '#1a1a1a';
  ctx.font = `700 76px ${F_LABEL}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('COMM', 210, 70);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    roughness: 0.7,
    metalness: 0,
  });
}

// ---------------------------------------------------------------- SELECT . START label
export function makeSelectStartLabelMaterial() {
  const W = 1024, H = 96;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = '#244f12';
  ctx.font = `600 48px ${F_LABEL}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  // measure for proper centering with a "." separator
  const left = 'SELECT';
  const sep  = '.';
  const right = 'START';
  const lw = ctx.measureText(left).width;
  const sw = ctx.measureText(sep).width;
  const rw = ctx.measureText(right).width;
  const gap = 80;
  const total = lw + gap + sw + gap + rw;
  let x = W / 2 - total / 2;
  ctx.textAlign = 'left';
  ctx.fillText(left, x, H / 2);
  x += lw + gap;
  ctx.fillText(sep, x, H / 2);
  x += sw + gap;
  ctx.fillText(right, x, H / 2);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    roughness: 0.7,
    metalness: 0,
  });
}

// ---------------------------------------------------------------- A / B engraved letters
export function makeButtonLetterMaterial(letter) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 512, 512);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `italic 700 320px ${F_WORDMARK}`;

  // soft inner shadow → embossed
  ctx.shadowColor = 'rgba(255,255,255,0.10)';
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = '#0c0c0c';
  ctx.fillText(letter, 256, 268);

  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#5a5a58';
  ctx.fillText(letter, 256, 256);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    roughness: 0.7,
    metalness: 0,
  });
}

// ---------------------------------------------------------------- Speaker dot grid
/**
 * GBC speaker — a tightly packed hex grid of small dark round holes
 * forming a roughly triangular cluster in the bottom-right corner of
 * the front face. Tuned to match the canonical photo: ~50-60 holes
 * total, packed close together, fading toward the upper-left edge.
 */
export function makeSpeakerGridMaterial() {
  const W = 1024, H = 1024;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  const radius = 14;
  const stepX = 36;
  const stepY = 32;
  const rows = 18;
  const cols = 18;

  ctx.fillStyle = '#080808';

  // Origin at canvas center; cluster sits in bottom-right quadrant.
  const originX = W * 0.55;
  const originY = H * 0.55;

  for (let r = 0; r < rows; r++) {
    for (let cI = 0; cI < cols; cI++) {
      const offset = (r % 2 === 0) ? 0 : stepX / 2;
      const x = originX + cI * stepX + offset;
      const y = originY + r * stepY;

      // Triangular silhouette: keep holes only where (cI + r > some) and within bounds
      const triEdge = (cI + r * 0.85) > 1.5 && (r + cI) > 2;
      if (!triEdge) continue;
      if (x > W - 20 || y > H - 20) continue;

      // soft inner shadow on each hole for depth
      const grad = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, radius);
      grad.addColorStop(0, '#1a1a1a');
      grad.addColorStop(0.6, '#080808');
      grad.addColorStop(1, '#000000');
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    roughness: 0.85,
    metalness: 0,
  });
}
