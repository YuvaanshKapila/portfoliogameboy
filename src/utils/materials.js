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
const F_DISPLAY  = '"Cabin", "Bowlby One", "Cooper Std", "Times New Roman", serif';

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
 * GBC LCD when powered off — a dark grayish surface with the
 * faintest pixel-grid texture and a glassy reflection sweep.
 */
export function makeScreenMaterial() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 920;
  const ctx = c.getContext('2d');

  // dark cool gray base
  const g = ctx.createLinearGradient(0, 0, 0, 920);
  g.addColorStop(0, '#5a5a62');
  g.addColorStop(1, '#3e3e48');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 920);

  // pixel grid
  ctx.fillStyle = 'rgba(20, 20, 28, 0.30)';
  for (let y = 0; y < 920; y += 4) ctx.fillRect(0, y, 1024, 1);
  for (let x = 0; x < 1024; x += 4) ctx.fillRect(x, 0, 1, 920);

  // subtle warm vignette
  const v = ctx.createRadialGradient(512, 460, 200, 512, 460, 700);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.20)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, 1024, 920);

  // glass reflection sweep
  const sweep = ctx.createLinearGradient(0, 0, 1024, 920);
  sweep.addColorStop(0, 'rgba(255,255,255,0.10)');
  sweep.addColorStop(0.4, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = sweep;
  ctx.fillRect(0, 0, 1024, 920);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;

  return new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.32,
    metalness: 0.05,
  });
}

// ---------------------------------------------------------------- "GAME BOY COLOR" logo decal
/**
 * White italic "GAME BOY" + rainbow "COLOR". Drawn at high resolution
 * and applied as a transparent decal to the bezel below the screen.
 */
export function makeGameBoyColorLogoMaterial() {
  const W = 2048, H = 320;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  const yMid = H / 2;

  // GAME BOY — white italic, condensed, letter-spaced
  ctx.save();
  ctx.translate(140, yMid);
  ctx.transform(1, 0, -0.08, 1, 0, 0); // extra italic skew
  ctx.font = `italic 800 200px ${F_DISPLAY}`;
  ctx.fillStyle = '#ffffff';
  // hand-place letters with mild spacing for that GBC feel
  let x = 0;
  for (const ch of 'GAME BOY') {
    ctx.fillText(ch, x, 0);
    x += ctx.measureText(ch).width + (ch === ' ' ? 16 : 8);
  }
  const gameBoyEnd = x;
  ctx.restore();

  // COLOR — rainbow letters, each in its own color
  // canonical scheme: red, orange/yellow, green, blue, purple
  const colors = ['#e63946', '#f4a261', '#52b788', '#1d4ed8', '#9d3bd1'];
  ctx.save();
  ctx.translate(140 + gameBoyEnd + 70, yMid);
  ctx.transform(1, 0, -0.08, 1, 0, 0);
  ctx.font = `italic 800 200px ${F_DISPLAY}`;
  let cx = 0;
  const letters = ['C', 'O', 'L', 'o', 'R']; // 4th letter lowercase like canonical logo
  for (let i = 0; i < letters.length; i++) {
    ctx.fillStyle = colors[i];
    ctx.fillText(letters[i], cx, 0);
    cx += ctx.measureText(letters[i]).width + 6;
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    roughness: 0.6,
    metalness: 0,
  });
}

// ---------------------------------------------------------------- "Nintendo®" red wordmark
/**
 * The classic Nintendo wordmark. Drawn in dark red, italic, with the
 * characteristic stylized letterforms (approximated via Cabin Bold
 * Italic with a heavy skew). The ® sits up and to the right.
 */
export function makeNintendoWordmarkMaterial() {
  const W = 1024, H = 192;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.transform(1, 0, -0.10, 1, 0, 0);
  ctx.font = `italic 700 116px ${F_WORDMARK}`;
  ctx.fillStyle = '#a31621';
  ctx.fillText('Nintendo', 0, 0);
  ctx.restore();

  // ® mark
  ctx.save();
  ctx.font = `400 36px ${F_WORDMARK}`;
  ctx.fillStyle = '#a31621';
  ctx.textAlign = 'left';
  ctx.fillText('®', W / 2 + 270, H / 2 - 32);
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    roughness: 0.6,
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
  const W = 512, H = 96;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  // small dark triangle
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.moveTo(120, 30);
  ctx.lineTo(150, 70);
  ctx.lineTo(90, 70);
  ctx.closePath();
  ctx.fill();

  // "COMM" text
  ctx.fillStyle = '#1a1a1a';
  ctx.font = `600 50px ${F_LABEL}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('COMM', 175, 50);

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
 * The GBC speaker is a triangular cluster of small round holes in the
 * bottom-right corner. Drawn as a transparent decal — black holes on
 * a transparent background.
 */
export function makeSpeakerGridMaterial() {
  const W = 512, H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  // hex grid of holes, clipped to a triangle pointing toward the bottom-right
  const radius = 9;
  const stepX = 26;
  const stepY = 22;
  const cols = 14;
  const rows = 14;

  ctx.fillStyle = '#0a0a0a';

  for (let r = 0; r < rows; r++) {
    for (let cI = 0; cI < cols; cI++) {
      const offset = (r % 2 === 0) ? 0 : stepX / 2;
      const x = 60 + cI * stepX + offset;
      const y = 60 + r * stepY;

      // Only draw inside a downward-right triangle area
      // Clip: x > some_min based on row, and y > some_min based on column
      // Simpler: draw inside an inverted triangle (fewer at top, more at bottom-right)
      const triangleEdge = (cI - r * 0.6) > -2 && (r + cI) > 6 && r < 12 && cI < 13;
      if (!triangleEdge) continue;

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
