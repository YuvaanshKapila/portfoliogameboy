import * as THREE from 'three';

/**
 * A small auto-walking pixel-art figure that lives on the desk.
 *
 * Top-down view: the plane is laid FLAT on the desk surface so the
 * camera (which looks nearly straight down) sees the full sprite
 * instead of a thin edge. The art is drawn as a 3/4 top-down
 * perspective — head from above, shoulders, arms at sides, legs
 * peeking out below.
 *
 * Walks around on its own — picks a random target inside the desk
 * bounds, walks toward it, pauses briefly, picks another. Avoids
 * the Game Boy and the cart basket via simple AABB collision.
 *
 * All sprite art is original — drawn with canvas rectangle
 * primitives, no reference artwork copied.
 */

const SHEET_COLS = 3;             // step-A / stand / step-B
const SPRITE_PX  = 32;            // logical pixels per frame
const SCALE      = 4;             // canvas upscale
const SHEET_W    = SPRITE_PX * SCALE * SHEET_COLS;
const SHEET_H    = SPRITE_PX * SCALE;

export function buildSprite() {
  const sheet = makeSpriteSheet();

  const tex = new THREE.CanvasTexture(sheet);
  tex.colorSpace   = THREE.SRGBColorSpace;
  tex.magFilter    = THREE.NearestFilter;
  tex.minFilter    = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.repeat.set(1 / SHEET_COLS, 1);
  tex.offset.set(1 / SHEET_COLS, 0);   // start on the "stand" frame

  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });

  // Plane size on the desk: roughly the footprint of a small figurine
  // viewed from above. Wider in Z than X so the character has a clear
  // "head" (toward -Z) and "feet" (toward +Z) when laid flat.
  const planeW = 0.30;
  const planeL = 0.36;
  const sprite = new THREE.Mesh(new THREE.PlaneGeometry(planeW, planeL), mat);

  // Lay flat on the desk surface — texture's +Y becomes world -Z, so
  // the character's "up" (head) on the sprite sheet points toward the
  // back of the desk.
  sprite.rotation.x = -Math.PI / 2;
  sprite.position.set(0, 0.012, 0.40);
  sprite.renderOrder = 5;
  sprite.castShadow = false;
  sprite.receiveShadow = false;

  sprite.userData = {
    walkFrame: 1,
    walkClock: 0,
    speed: 0.55,
    target: null,
    pauseUntil: 0,
    tex,
  };

  return sprite;
}

/* ------------------------------------------------------------------
   Per-frame auto-walk: picks random targets, walks to them, pauses,
   repeats. Collides with obstacles and clamps to desk bounds.

   @param obstacles   array of { min: Vector3, max: Vector3 } AABBs
   @param bounds      { minX, maxX, minZ, maxZ }
   ------------------------------------------------------------------ */
export function updateSprite(sprite, dt, obstacles, bounds) {
  const ud = sprite.userData;
  const now = performance.now();

  // Lazy-pick first target
  if (!ud.target) pickRandomTarget(ud, bounds, sprite.position);

  // Pause between movements
  if (ud.pauseUntil > now) {
    ud.walkFrame = 1;
    ud.walkClock = 0;
    ud.tex.offset.x = 1 / SHEET_COLS;
    return;
  }

  const dx = ud.target.x - sprite.position.x;
  const dz = ud.target.z - sprite.position.z;
  const dist = Math.hypot(dx, dz);

  // Reached the target — pause, then pick a new one
  if (dist < 0.08) {
    ud.pauseUntil = now + 600 + Math.random() * 1400;
    pickRandomTarget(ud, bounds, sprite.position);
    return;
  }

  const stepX = (dx / dist) * ud.speed * dt;
  const stepZ = (dz / dist) * ud.speed * dt;
  const tryX = sprite.position.x + stepX;
  const tryZ = sprite.position.z + stepZ;

  // Try X and Z separately so the character slides along obstacle edges
  const blockedX = collides(tryX, sprite.position.z, obstacles);
  const blockedZ = collides(sprite.position.x, tryZ, obstacles);

  if (!blockedX) sprite.position.x = clamp(tryX, bounds.minX, bounds.maxX);
  if (!blockedZ) sprite.position.z = clamp(tryZ, bounds.minZ, bounds.maxZ);

  // Wholly stuck? new target
  if (blockedX && blockedZ) {
    pickRandomTarget(ud, bounds, sprite.position);
    return;
  }

  // Animate walk cycle: step-A (0) ↔ step-B (2), skip standing
  ud.walkClock += dt;
  if (ud.walkClock > 0.16) {
    ud.walkClock = 0;
    ud.walkFrame = ud.walkFrame === 0 ? 2 : 0;
  }
  ud.tex.offset.x = ud.walkFrame / SHEET_COLS;
}

function pickRandomTarget(ud, bounds, current) {
  for (let i = 0; i < 8; i++) {
    const x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
    const z = bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ);
    // Reject targets that would teleport too short or too far
    const d = Math.hypot(x - current.x, z - current.z);
    if (d > 0.4 && d < 2.5) { ud.target = { x, z }; return; }
  }
  // Fallback — a random point regardless of distance
  ud.target = {
    x: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
    z: bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ),
  };
}

function collides(x, z, obstacles) {
  const r = 0.08;
  for (const ob of obstacles) {
    if (x + r > ob.min.x && x - r < ob.max.x &&
        z + r > ob.min.z && z - r < ob.max.z) return true;
  }
  return false;
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

/* ------------------------------------------------------------------
   Original top-down 3/4 sprite — drawn purely with canvas
   rectangle primitives. Generic explorer figure. Three frames:
   step-A, stand, step-B. Same view in all frames; only the legs
   and arms shift to suggest a walk cycle.
   ------------------------------------------------------------------ */
function makeSpriteSheet() {
  const c = document.createElement('canvas');
  c.width = SHEET_W; c.height = SHEET_H;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.scale(SCALE, SCALE);

  for (let col = 0; col < SHEET_COLS; col++) {
    ctx.save();
    ctx.translate(col * SPRITE_PX, 0);
    drawTopDownFrame(ctx, col);
    ctx.restore();
  }
  return c;
}

function drawTopDownFrame(ctx, frame) {
  const r = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };

  const COL = {
    outline: '#1a1410',
    cap:     '#c41e3a',
    capDark: '#7a0d20',
    skin:    '#f0c490',
    shirt:   '#3858d8',
    shirt2:  '#1f3aac',
    pants:   '#3a2818',
    boot:    '#1a1410',
    pack:    '#5e3820',
  };

  // ------------- HEAD seen from above (cap fills most of it) -------------
  // Cap dome — large rounded shape on the upper half
  r(11, 4, 10, 1, COL.outline);
  r(10, 5, 1, 6, COL.outline);
  r(21, 5, 1, 6, COL.outline);
  r(11, 11, 10, 1, COL.outline);
  r(11, 5, 10, 6, COL.cap);
  // Cap shadow at the rim
  r(11, 10, 10, 1, COL.capDark);
  // Forehead/face peeking below the cap
  r(12, 12, 8, 2, COL.skin);
  r(11, 12, 1, 2, COL.outline);
  r(20, 12, 1, 2, COL.outline);

  // ------------- TORSO + arms -------------
  r(10, 14, 12, 1, COL.outline);
  r(9,  15, 1, 6, COL.outline);
  r(22, 15, 1, 6, COL.outline);
  // shoulders fan out wider than head — very top-down feel
  r(9,  15, 14, 5, COL.shirt);
  r(9,  20, 14, 1, COL.shirt2);
  // Backpack strap visible across the shoulders
  r(13, 15, 6, 1, COL.pack);

  // Arms — slight swing per frame
  let armOffL = 0, armOffR = 0;
  if (frame === 0) { armOffL = +1; armOffR = -1; }   // left forward
  if (frame === 2) { armOffL = -1; armOffR = +1; }   // right forward
  r(8,  15 + armOffL, 2, 6, COL.skin);
  r(8,  15 + armOffL, 2, 1, COL.outline);
  r(8,  20 + armOffL, 2, 1, COL.outline);
  r(22, 15 + armOffR, 2, 6, COL.skin);
  r(22, 15 + armOffR, 2, 1, COL.outline);
  r(22, 20 + armOffR, 2, 1, COL.outline);

  // ------------- LEGS + boots -------------
  // Step animation: one leg drops further than the other
  let lLegY = 0, rLegY = 0;
  if (frame === 0) { lLegY = -1; rLegY = +1; }
  if (frame === 2) { lLegY = +1; rLegY = -1; }

  r(12, 21, 4, 6 + lLegY, COL.pants);
  r(16, 21, 4, 6 + rLegY, COL.pants);
  r(12, 21, 1, 6 + lLegY, COL.outline);
  r(15, 21, 1, 6 + lLegY, COL.outline);
  r(16, 21, 1, 6 + rLegY, COL.outline);
  r(19, 21, 1, 6 + rLegY, COL.outline);
  r(12, 27 + lLegY, 4, 1, COL.outline);
  r(16, 27 + rLegY, 4, 1, COL.outline);

  // Boots
  r(12, 26 + lLegY, 4, 1, COL.boot);
  r(16, 26 + rLegY, 4, 1, COL.boot);
}
