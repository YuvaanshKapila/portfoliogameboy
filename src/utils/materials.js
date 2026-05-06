import * as THREE from 'three';

/**
 * Shared materials and procedural textures for the DMG-01 still life.
 *
 * Font choices match the real Game Boy:
 *   - Wordmark "Nintendo® GAME BOY™" : Gill Sans Italic
 *       → web fallback Cabin Bold Italic (very close)
 *   - Tiny silkscreen labels (BATTERY / OFF·ON / PHONES / START / SELECT
 *     / DOT MATRIX WITH STEREO SOUND): Futura
 *       → web fallback Jost (geometric humanist, near-identical)
 *   - Button A / B letters molded into the face buttons: Italic of same
 *     family as wordmark (Gill Sans-style italic)
 *
 * All canvas-textures are built at high resolution so they stay crisp
 * when the camera zooms in. Anisotropy is bumped up to 16 wherever
 * the texture sits at a glancing angle to the camera.
 */

// Font stacks reused across canvas helpers.
const F_WORDMARK = '"Cabin", "Gill Sans MT", "Gill Sans", "Trebuchet MS", sans-serif';
const F_LABEL    = '"Jost", "Futura", "Century Gothic", "Trebuchet MS", sans-serif';

// ---------------------------------------------------------------- materials
export const matBodyLight = new THREE.MeshPhysicalMaterial({
  color: 0xc7c4b8,
  roughness: 0.62,
  clearcoat: 0.32,
  clearcoatRoughness: 0.55,
  reflectivity: 0.18,
});

export const matBezel = new THREE.MeshPhysicalMaterial({
  color: 0x1c1a16,
  roughness: 0.55,
  clearcoat: 0.5,
  clearcoatRoughness: 0.32,
});

export const matMaroon = new THREE.MeshPhysicalMaterial({
  color: 0x6e1f3c,
  roughness: 0.45,
  clearcoat: 0.55,
  clearcoatRoughness: 0.28,
});

export const matBlackPlastic = new THREE.MeshPhysicalMaterial({
  color: 0x141210,
  roughness: 0.5,
  clearcoat: 0.4,
  clearcoatRoughness: 0.4,
});

export const matSwitchKnob = new THREE.MeshPhysicalMaterial({
  color: 0xb6b3a8,
  roughness: 0.55,
  clearcoat: 0.25,
});

export const matRubberMatte = new THREE.MeshStandardMaterial({
  color: 0x171511,
  roughness: 0.92,
  metalness: 0.0,
});

// ---------------------------------------------------------------- walnut
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

// ---------------------------------------------------------------- screen
/**
 * The greenish LCD with the iconic boot logo. Drawn larger and with
 * the proper "▶ NINTENDO" mark so it's legible from the top-down camera.
 */
export function makeScreenMaterial() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 920;
  const ctx = c.getContext('2d');

  // base LCD wash
  const g = ctx.createLinearGradient(0, 0, 0, 920);
  g.addColorStop(0, '#a8b18a');
  g.addColorStop(1, '#7c8856');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 920);

  // boot mark — black ▶ glyph then "Nintendo" in pixel-ish chunks
  ctx.fillStyle = '#161e0c';
  // ▶ triangle
  ctx.beginPath();
  ctx.moveTo(330, 430);
  ctx.lineTo(330, 510);
  ctx.lineTo(395, 470);
  ctx.closePath();
  ctx.fill();

  // "Nintendo" in canvas as the iconic boot logo (chunky italic)
  ctx.font = `italic 700 88px ${F_WORDMARK}`;
  ctx.textBaseline = 'middle';
  ctx.fillText('Nintendo', 420, 470);

  // pixel grid overlay for that LCD look
  ctx.fillStyle = 'rgba(20, 30, 12, 0.18)';
  for (let y = 0; y < 920; y += 5) ctx.fillRect(0, y, 1024, 1);
  for (let x = 0; x < 1024; x += 5) ctx.fillRect(x, 0, 1, 920);

  // soft vignette
  const v = ctx.createRadialGradient(512, 460, 200, 512, 460, 700);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, 1024, 920);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  tex.minFilter = THREE.LinearMipmapLinearFilter;

  return new THREE.MeshStandardMaterial({
    map: tex,
    emissiveMap: tex,
    emissive: new THREE.Color(0x4a5a30),
    emissiveIntensity: 0.32,
    roughness: 0.28,
    metalness: 0.0,
  });
}

// ---------------------------------------------------------------- silkscreen "Nintendo® GAME BOY™"
/**
 * The wordmark above the screen. Drawn in Cabin Bold Italic which is
 * the closest free analog of Gill Sans Italic (the actual font Nintendo
 * used). Slightly skewed to match the real units' optical italic.
 */
export function makeSilkscreenMaterial() {
  const c = document.createElement('canvas');
  c.width = 2048; c.height = 384;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 2048, 384);

  ctx.fillStyle = '#dbd4c1';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // single-line layout: "Nintendo® GAME BOY™"
  ctx.save();
  ctx.translate(1024, 192);
  // small extra italic skew on top of the font's own italic
  ctx.transform(1, 0, -0.05, 1, 0, 0);

  ctx.font = `italic 700 168px ${F_WORDMARK}`;

  // measure pieces so we can place the ® and ™ glyphs precisely
  const nintendo = 'Nintendo';
  const gameboy  = 'GAME BOY';
  const nW = ctx.measureText(nintendo).width;
  const gap = 110;
  const gW = ctx.measureText(gameboy).width;
  const totalW = nW + gap + gW;

  const startX = -totalW / 2;
  ctx.textAlign = 'left';

  // Nintendo
  ctx.fillStyle = '#dbd4c1';
  ctx.fillText(nintendo, startX, 0);
  // ®
  ctx.font = `400 56px ${F_WORDMARK}`;
  ctx.fillStyle = '#bdb6a0';
  ctx.fillText('®', startX + nW + 4, -40);

  // GAME BOY
  ctx.font = `italic 700 168px ${F_WORDMARK}`;
  ctx.fillStyle = '#dbd4c1';
  ctx.fillText(gameboy, startX + nW + gap, 0);
  // ™
  ctx.font = `400 56px ${F_WORDMARK}`;
  ctx.fillStyle = '#bdb6a0';
  ctx.fillText('TM', startX + nW + gap + gW + 4, -52);

  ctx.restore();

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

// ---------------------------------------------------------------- "DOT MATRIX WITH STEREO SOUND"
export function makeTaglineMaterial() {
  const c = document.createElement('canvas');
  c.width = 2048; c.height = 192;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 2048, 192);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // single italic line with the iconic mustard "WITH"
  ctx.font = `italic 700 92px ${F_WORDMARK}`;

  const left  = 'DOT MATRIX ';
  const mid   = 'WITH';
  const right = ' STEREO SOUND';
  const lw = ctx.measureText(left).width;
  const mw = ctx.measureText(mid).width;
  const rw = ctx.measureText(right).width;
  const total = lw + mw + rw;
  let x = 1024 - total / 2;
  const y = 96;

  ctx.fillStyle = '#d4cdb8';
  ctx.fillText(left, x, y);
  x += lw;
  ctx.fillStyle = '#d8c34a';
  ctx.fillText(mid, x, y);
  x += mw;
  ctx.fillStyle = '#d4cdb8';
  ctx.fillText(right, x, y);

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

// ---------------------------------------------------------------- A / B button letters
/**
 * The italic letter molded into each face button. Drawn slightly inset
 * (with a soft inner shadow) so it reads as physical engraving rather
 * than printed text.
 */
export function makeButtonLetterMaterial(letter) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 512, 512);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `italic 700 360px ${F_WORDMARK}`;

  // soft drop-shadow → reads as embossed
  ctx.shadowColor = 'rgba(255, 230, 215, 0.55)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#3a0d1d';
  ctx.fillText(letter, 256, 268);

  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#f4d8c8';
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

// ---------------------------------------------------------------- Futura-ish micro labels
/**
 * Small silkscreen text — used for "BATTERY", "PHONES", "OFF · ON",
 * "START", "SELECT", and the engraved "A" / "B" callouts beside the
 * face buttons.
 */
export function makeMicroLabel(text, {
  color = '#5a574e',
  size = 220,
  weight = 600,
  width = 1024,
  height = 256,
  italic = false,
  letterSpacing = 0,
} = {}) {
  const c = document.createElement('canvas');
  c.width = width; c.height = height;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, width, height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${F_LABEL}`;
  ctx.fillStyle = color;

  // crude letter-spacing emulation
  if (letterSpacing > 0) {
    const chars = [...text];
    const widths = chars.map(ch => ctx.measureText(ch).width);
    const total = widths.reduce((s, w) => s + w, 0) + letterSpacing * (chars.length - 1);
    let x = width / 2 - total / 2;
    ctx.textAlign = 'left';
    chars.forEach((ch, i) => {
      ctx.fillText(ch, x, height / 2);
      x += widths[i] + letterSpacing;
    });
  } else {
    ctx.fillText(text, width / 2, height / 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    roughness: 0.75,
    metalness: 0,
  });
}
