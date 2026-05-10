import * as THREE from 'three';

/**
 * Subtle pencil hints etched into the desk wood.
 *
 * Style goals:
 *   - small, unobtrusive
 *   - blends with the wood (no dark outline) — like faint pencil
 *   - reads on both desktop and mobile portrait orientations
 *
 * World-space anchors:
 *   - basket centered at (-0.85, 0, 0), spans roughly Z ∈ [-1.3, +1.3]
 *   - Game Boy centered at (+0.30, 0, 0), back/slot at Z ≈ -1.10
 *   - A/B buttons world position ≈ (+0.43, *, 0)
 *
 * Camera looks down ~13° from +Z, so on screen "up" ≈ world -Z.
 */
export function buildTableSketches() {
  const group = new THREE.Group();
  group.name = 'table-sketches';

  // 1) BASKET — sits ABOVE the basket on screen (further -Z).
  //    Double-headed horizontal arrow tucked tight under "drag here!".
  const cartSketch = makeSketchPlane({
    label: 'drag here!',
    arrowKind: 'double-h',
    width: 1.0, height: 0.42,
  });
  cartSketch.position.set(-0.85, 0.004, -1.50);
  group.add(cartSketch);

  // 2) SLOT — sits closer down to the slot opening so the arrow tip
  //    nearly touches it.
  const slotSketch = makeSketchPlane({
    label: 'place here!',
    arrowKind: 'down',
    width: 0.95, height: 0.5,
  });
  slotSketch.position.set(0.30, 0.004, -1.50);
  group.add(slotSketch);

  // 3) BOTTOM — text-only line centered with the Game Boy on the
  //    front of the desk. No arrow — just a hint about the buttons.
  const buttonsSketch = makeSketchPlane({
    label: 'use buttons to control',
    arrowKind: 'none',
    width: 1.1, height: 0.18,
  });
  buttonsSketch.position.set(0.30, 0.004, 1.20);
  group.add(buttonsSketch);

  return group;
}

function makeSketchPlane({ label, arrowKind, width, height, labelBelow = false }) {
  // No-arrow sketches center the label vertically; arrow sketches
  // push the label to one side to leave room for the arrow.
  const labelCentered = arrowKind === 'none';
  const PX_PER_UNIT = 800;
  const W = Math.round(width  * PX_PER_UNIT);
  const H = Math.round(height * PX_PER_UNIT);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  // Faint warm-brown ink — same family as the walnut so the marks
  // read as etched into the wood rather than printed on top of it.
  // Alpha is low (~0.55) and we use 'source-over' on a transparent
  // background so the wood texture shows through where ink isn't.
  ctx.clearRect(0, 0, W, H);
  // Black graphite ink — strong and readable on the wood.
  const ink = 'rgba(8, 6, 4, 0.92)';
  ctx.strokeStyle = ink;
  ctx.fillStyle   = ink;

  drawLabel(ctx, label, W, H, labelBelow, labelCentered);
  drawArrow(ctx, arrowKind, W, H, labelBelow);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  // Disable mipmaps so the pencil strokes don't fade out as the
  // camera dollies back. With mipmaps, lower-res levels average the
  // dark ink with the transparent pixels around it, washing the
  // strokes to almost nothing at distance. LinearFilter on both
  // min and mag samples the full-resolution canvas every frame.
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;

  // Standard alpha blend — faint warm strokes over the wood. No dark
  // outline. renderOrder is high so the strokes sit ABOVE the trading
  // cards / desk in the transparency sort order.
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    opacity: 1,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });

  const geo = new THREE.PlaneGeometry(width, height);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 10;
  return mesh;
}

/* ---------- pencil helpers ---------- */

function jitter(amount) { return (Math.random() - 0.5) * amount; }

function sketchyLine(ctx, x1, y1, x2, y2, opts = {}) {
  // Single pass — multi-pass full-opacity overdraw was making lines
  // darker when zoomed in. One pass renders consistently at any
  // camera distance.
  const wobble = opts.wobble ?? 1.8;
  const width  = opts.width  ?? 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.lineWidth = width;
  const segs = 14;
  ctx.moveTo(x1 + jitter(wobble), y1 + jitter(wobble));
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    ctx.lineTo(
      x1 + (x2 - x1) * t + jitter(wobble),
      y1 + (y2 - y1) * t + jitter(wobble),
    );
  }
  ctx.stroke();
}

function arrowHead(ctx, tipX, tipY, angle, headLen = 40) {
  const spread = Math.PI / 6.5;
  sketchyLine(
    ctx, tipX, tipY,
    tipX - Math.cos(angle - spread) * headLen,
    tipY - Math.sin(angle - spread) * headLen,
    { passes: 2, wobble: 1.5, width: 5 },
  );
  sketchyLine(
    ctx, tipX, tipY,
    tipX - Math.cos(angle + spread) * headLen,
    tipY - Math.sin(angle + spread) * headLen,
    { passes: 2, wobble: 1.5, width: 5 },
  );
}

function drawArrow(ctx, kind, W, H, labelBelow) {
  if (kind === 'none') return;
  if (kind === 'double-h') {
    // Tight under the label — was 0.78, now 0.50 so it sits right
    // beneath the text instead of way at the bottom.
    const y = H * 0.50;
    const xL = W * 0.10;
    const xR = W * 0.90;
    sketchyLine(ctx, xL, y, xR, y, { passes: 2, wobble: 2, width: 5 });
    arrowHead(ctx, xL, y, Math.PI, 45);
    arrowHead(ctx, xR, y, 0, 45);
  } else if (kind === 'down') {
    const x = W * 0.5;
    const y1 = H * 0.45;
    const y2 = H * 0.95;
    sketchyLine(ctx, x, y1, x, y2, { passes: 2, wobble: 2, width: 5 });
    arrowHead(ctx, x, y2, Math.PI / 2, 42);
  } else if (kind === 'up') {
    const x = W * 0.5;
    const y1 = H * 0.5;
    const y2 = H * 0.05;
    sketchyLine(ctx, x, y1, x, y2, { passes: 2, wobble: 2, width: 5 });
    arrowHead(ctx, x, y2, -Math.PI / 2, 42);
  }
}

function drawLabel(ctx, text, W, H, labelBelow, labelCentered = false) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Sized to canvas height. Centered labels (no arrow) read at the
  // full canvas height so we can use a slightly bigger ratio.
  const fontSize = Math.round(H * (labelCentered ? 0.55 : 0.30));
  ctx.font = `700 ${fontSize}px "Kalam", "Caveat", "Bradley Hand", "Comic Sans MS", cursive`;

  const x = W / 2;
  // Push label closer to the arrow: top-anchored labels move from
  // 0.25 → 0.32 (lower), bottom-anchored 0.78 → 0.70 (higher), so
  // text and arrow nearly touch.
  const y = labelCentered ? H * 0.5 : (labelBelow ? H * 0.70 : H * 0.32);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(jitter(0.025));
  ctx.translate(-x, -y);

  // Single full-opacity pass. Multi-pass overlapping at half alpha
  // made the text get DARKER when the camera was close (more
  // overdraw per screen pixel) and lighter when far. One solid pass
  // renders identically at every camera distance.
  ctx.globalAlpha = 1;
  ctx.fillText(text, x, y);
  ctx.restore();
}
