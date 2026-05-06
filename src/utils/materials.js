import * as THREE from 'three';

/**
 * Shared materials for the scene.
 * Colors are tuned to feel photographic rather than saturated:
 *   - DMG body: warm cool gray
 *   - A/B buttons: deep maroon
 *   - Screen: pale washed-out LCD green
 *   - Walnut desk: rich brown with a hint of red
 */

export const matBodyLight = new THREE.MeshPhysicalMaterial({
  color: 0xc4c2b6,
  roughness: 0.62,
  clearcoat: 0.35,
  clearcoatRoughness: 0.55,
  reflectivity: 0.18,
});

export const matBodyDark = new THREE.MeshPhysicalMaterial({
  color: 0xa6a399,
  roughness: 0.7,
  clearcoat: 0.25,
  clearcoatRoughness: 0.6,
});

export const matBezel = new THREE.MeshPhysicalMaterial({
  color: 0x1f1c18,
  roughness: 0.55,
  clearcoat: 0.5,
  clearcoatRoughness: 0.35,
});

export const matMaroon = new THREE.MeshPhysicalMaterial({
  color: 0x6e1f3c,
  roughness: 0.45,
  clearcoat: 0.6,
  clearcoatRoughness: 0.25,
});

export const matBlack = new THREE.MeshPhysicalMaterial({
  color: 0x141210,
  roughness: 0.5,
  clearcoat: 0.4,
  clearcoatRoughness: 0.4,
});

export const matMetal = new THREE.MeshStandardMaterial({
  color: 0xb6b1a2,
  metalness: 0.85,
  roughness: 0.32,
});

export const matRubber = new THREE.MeshStandardMaterial({
  color: 0x111111,
  roughness: 0.92,
  metalness: 0.0,
});

/**
 * Walnut desk material — uses a procedural canvas texture so we don't
 * need to ship any image files.
 */
export function makeWalnutMaterial() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 1024;
  const ctx = c.getContext('2d');

  // Base wood color
  const grad = ctx.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, '#5a3621');
  grad.addColorStop(0.5, '#4a2a17');
  grad.addColorStop(1, '#36200f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Long grain bands
  for (let i = 0; i < 220; i++) {
    const y = Math.random() * 1024;
    const alpha = 0.04 + Math.random() * 0.16;
    const dark = Math.random() < 0.55;
    ctx.fillStyle = dark
      ? `rgba(28, 14, 4, ${alpha})`
      : `rgba(120, 70, 35, ${alpha * 0.6})`;
    ctx.fillRect(0, y, 1024, 0.6 + Math.random() * 1.6);
  }

  // Knots
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

  // Fine noise
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
  tex.anisotropy = 8;
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

/**
 * The screen — a soft greenish LCD with the iconic Nintendo boot dot
 * drawn into a canvas, then sampled as the emissive map.
 */
export function makeScreenMaterial() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 460;
  const ctx = c.getContext('2d');

  // base LCD
  const g = ctx.createLinearGradient(0, 0, 0, 460);
  g.addColorStop(0, '#9aa078');
  g.addColorStop(1, '#6e7a4a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 460);

  // text
  ctx.fillStyle = '#1c2410';
  ctx.font = 'bold 28px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('NINTENDO', 256, 230);

  // dot beneath
  ctx.fillRect(252, 250, 8, 8);

  // pixel grid overlay
  ctx.fillStyle = 'rgba(20, 30, 12, 0.18)';
  for (let y = 0; y < 460; y += 3) ctx.fillRect(0, y, 512, 1);
  for (let x = 0; x < 512; x += 3) ctx.fillRect(x, 0, 1, 460);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  return new THREE.MeshStandardMaterial({
    map: tex,
    emissiveMap: tex,
    emissive: new THREE.Color(0x4a5a30),
    emissiveIntensity: 0.45,
    roughness: 0.28,
    metalness: 0.0,
  });
}

/**
 * Silkscreen decal canvas-texture: "Nintendo® GAME BOY™" + tagline.
 * Returned as a transparent material applied to a thin plane.
 */
export function makeSilkscreenMaterial() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 1024, 256);

  // "Nintendo GAME BOY" italic
  ctx.fillStyle = '#d8d4c5';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.save();
  ctx.translate(512, 70);
  ctx.transform(1, 0, -0.18, 1, 0, 0); // skew italic
  ctx.font = 'italic 700 56px "Times New Roman", serif';
  ctx.fillText('Nintendo', -150, 0);
  ctx.font = 'italic 700 56px "Arial Black", sans-serif';
  ctx.fillText('GAME BOY', 200, 0);
  ctx.restore();

  // small ® and ™
  ctx.fillStyle = '#bcb8a8';
  ctx.font = '24px Arial';
  ctx.fillText('®',  390, 50);
  ctx.fillText('TM', 770, 50);

  // tagline below
  ctx.font = 'italic 600 30px "Times New Roman", serif';
  ctx.fillStyle = '#cfcabd';
  ctx.fillText('DOT MATRIX ', 320, 175);
  ctx.fillStyle = '#d8c54a';
  ctx.fillText('WITH', 520, 175);
  ctx.fillStyle = '#cfcabd';
  ctx.fillText(' STEREO SOUND', 720, 175);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;

  return new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    roughness: 0.7,
    metalness: 0,
    depthWrite: false,
  });
}
