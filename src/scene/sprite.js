import * as THREE from 'three';

/**
 * A tiny walking pixel-art character that lives on the desk.
 *
 * - Drawn into a 3-col × 4-row sprite sheet (left-step / stand /
 *   right-step  ×  down / left / right / up), all canvas primitives,
 *   no copyrighted artwork.
 * - Rendered as a small billboarded plane that always faces the camera.
 * - Driven by WASD via updateSprite(); collides with axis-aligned
 *   bounding boxes passed in (Game Boy + cart basket so the character
 *   can't walk through them).
 *
 * Why WASD instead of arrow keys: the arrow keys are already wired to
 * scroll the inserted cartridge's content, so WASD keeps the two
 * input modes from stomping on each other.
 */

const SHEET_COLS = 3;   // walk-step-A, stand, walk-step-B
const SHEET_ROWS = 4;   // 0=down, 1=left, 2=right, 3=up
const SPRITE_PX  = 32;  // logical pixels per frame
const SCALE      = 4;   // upscale so the canvas texture has bite

export function buildSprite() {
  const sheet = makeSpriteSheet();

  const tex = new THREE.CanvasTexture(sheet);
  tex.colorSpace   = THREE.SRGBColorSpace;
  tex.magFilter    = THREE.NearestFilter;   // crisp pixels
  tex.minFilter    = THREE.NearestFilter;
  tex.generateMipmaps = false;
  // Show one frame of the sheet at a time via UV repeat + offset
  tex.repeat.set(1 / SHEET_COLS, 1 / SHEET_ROWS);
  tex.offset.set(0, (SHEET_ROWS - 1) / SHEET_ROWS); // start: down, standing

  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  // Visible plane size — about 20cm tall in scene units. Reads as a
  // tiny figurine on the desk next to the Game Boy.
  const planeW = 0.20;
  const planeH = 0.24;
  const sprite = new THREE.Mesh(new THREE.PlaneGeometry(planeW, planeH), mat);
  sprite.position.set(0, planeH / 2 + 0.005, 0.85);
  sprite.castShadow = false;
  sprite.receiveShadow = false;

  sprite.userData = {
    direction: 0,
    walkFrame: 1,        // 0 / 1 / 2  ; 1 = standing
    walkClock: 0,
    speed: 0.9,          // scene units / sec
    halfH: planeH / 2,
    halfW: planeW / 2,
    tex,
  };

  return sprite;
}

/**
 * Per-frame movement + animation step.
 *
 * @param sprite      mesh from buildSprite()
 * @param dt          seconds since last frame
 * @param input       { up, down, left, right }   booleans
 * @param camera      THREE.Camera (for billboarding)
 * @param obstacles   array of { min: Vector3, max: Vector3 } AABBs in WORLD space
 * @param bounds      { minX, maxX, minZ, maxZ }   desk extents in world space
 */
export function updateSprite(sprite, dt, input, camera, obstacles, bounds) {
  const ud = sprite.userData;
  const mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const mz = (input.down  ? 1 : 0) - (input.up   ? 1 : 0);
  const moving = (mx !== 0 || mz !== 0);

  if (moving) {
    // Direction priority — bigger axis wins (so diagonal still picks one row)
    if (Math.abs(mz) >= Math.abs(mx)) ud.direction = mz > 0 ? 0 : 3;
    else                              ud.direction = mx > 0 ? 2 : 1;

    const len   = Math.hypot(mx, mz);
    const dx    = (mx / len) * ud.speed * dt;
    const dz    = (mz / len) * ud.speed * dt;
    const tryX  = sprite.position.x + dx;
    const tryZ  = sprite.position.z + dz;

    // Try X then Z separately so sliding along an obstacle still works
    if (!collides(tryX, sprite.position.z, ud, obstacles)) {
      sprite.position.x = clamp(tryX, bounds.minX, bounds.maxX);
    }
    if (!collides(sprite.position.x, tryZ, ud, obstacles)) {
      sprite.position.z = clamp(tryZ, bounds.minZ, bounds.maxZ);
    }

    // Walk-cycle frame timer
    ud.walkClock += dt;
    if (ud.walkClock > 0.16) {
      ud.walkClock = 0;
      ud.walkFrame = (ud.walkFrame + 1) % 3;
      if (ud.walkFrame === 1) ud.walkFrame = 2;  // skip the stand pose
    }
  } else {
    ud.walkFrame = 1;            // standing pose
    ud.walkClock = 0;
  }

  // Update which sheet cell we're showing
  ud.tex.offset.x = ud.walkFrame / SHEET_COLS;
  ud.tex.offset.y = (SHEET_ROWS - 1 - ud.direction) / SHEET_ROWS;

  // Billboard — face the camera but stay vertical
  const cx = camera.position.x - sprite.position.x;
  const cz = camera.position.z - sprite.position.z;
  sprite.rotation.y = Math.atan2(cx, cz);
}

function collides(x, z, ud, obstacles) {
  const r = 0.06; // small AABB around the sprite's footprint
  for (const ob of obstacles) {
    if (x + r > ob.min.x && x - r < ob.max.x &&
        z + r > ob.min.z && z - r < ob.max.z) {
      return true;
    }
  }
  return false;
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

/* ------------------------------------------------------------------
   Original pixel-art sprite sheet — drawn purely with canvas
   rectangle primitives. No reference artwork copied; the character
   is a generic explorer figure (cap + shirt + pants + boots) drawn
   from the four cardinal directions with a 2-frame walk cycle.
   ------------------------------------------------------------------ */
function makeSpriteSheet() {
  const FW = SPRITE_PX * SCALE;
  const FH = SPRITE_PX * SCALE;
  const W  = FW * SHEET_COLS;
  const H  = FH * SHEET_ROWS;

  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.scale(SCALE, SCALE);

  for (let row = 0; row < SHEET_ROWS; row++) {
    for (let col = 0; col < SHEET_COLS; col++) {
      ctx.save();
      ctx.translate(col * SPRITE_PX, row * SPRITE_PX);
      drawFrame(ctx, row, col);
      ctx.restore();
    }
  }
  return c;
}

const PALETTE = {
  outline: '#1a1410',
  hair:    '#2a1810',
  cap:     '#c41e3a',
  capBrim: '#7a0d20',
  skin:    '#f0c490',
  shirt:   '#3858d8',
  shirt2:  '#1f3aac',
  pants:   '#3a2818',
  boot:    '#1a1410',
  pack:    '#5e3820',
};

function drawFrame(ctx, dir, frame) {
  // dir: 0 down, 1 left, 2 right, 3 up
  // frame: 0 step-A, 1 stand, 2 step-B
  const r = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
  const p = (x, y, color)        => { ctx.fillStyle = color; ctx.fillRect(x, y, 1, 1); };

  // Walk leg offsets — 0/+1 vs +1/0 toggles between frames
  const lyA = frame === 0 ? 0 : 1;   // left leg drop
  const lyB = frame === 2 ? 0 : 1;   // right leg drop

  // ===== Head + cap (rows 4-13) — same outline for all directions =====
  // Outline
  r(11, 4, 10, 1, PALETTE.outline);
  r(10, 5, 1, 8, PALETTE.outline);
  r(21, 5, 1, 8, PALETTE.outline);
  r(11, 13, 10, 1, PALETTE.outline);
  // Cap (top half of head)
  r(11, 5, 10, 4, PALETTE.cap);
  // Cap brim — small forward-facing tab
  if (dir === 0)      r(12, 9, 8, 1, PALETTE.capBrim);    // front
  else if (dir === 3) { /* no brim visible from back */ }
  else if (dir === 1) r(11, 9, 4, 1, PALETTE.capBrim);    // brim points left
  else if (dir === 2) r(17, 9, 4, 1, PALETTE.capBrim);    // brim points right
  // Face skin
  r(11, 9, 10, 4, PALETTE.skin);
  // Eyes — only when facing toward viewer or sideways
  if (dir === 0) {
    p(13, 11, PALETTE.outline);
    p(18, 11, PALETTE.outline);
  } else if (dir === 1) {
    p(12, 11, PALETTE.outline);
  } else if (dir === 2) {
    p(19, 11, PALETTE.outline);
  }
  // Hair tuft sneaking out under cap
  if (dir === 3) {
    r(13, 9, 6, 1, PALETTE.hair);   // back of head shows hair
  }

  // ===== Torso (rows 14-22) =====
  r(10, 14, 12, 1, PALETTE.outline);
  r(10, 22, 12, 1, PALETTE.outline);
  r(10, 14, 1, 8, PALETTE.outline);
  r(21, 14, 1, 8, PALETTE.outline);
  r(11, 14, 10, 8, PALETTE.shirt);
  // shirt seam highlight
  r(11, 21, 10, 1, PALETTE.shirt2);

  // Backpack — visible from back/side
  if (dir === 3) {
    r(12, 15, 8, 6, PALETTE.pack);
    r(12, 15, 8, 1, PALETTE.outline);
    r(12, 21, 8, 1, PALETTE.outline);
  } else if (dir === 1) {
    r(20, 15, 2, 6, PALETTE.pack);
  } else if (dir === 2) {
    r(10, 15, 2, 6, PALETTE.pack);
  }

  // ===== Arms (alongside torso) =====
  // Slight arm swing on walk frames — front/back faces only
  let armLeftY  = 15;
  let armRightY = 15;
  if (dir === 0 || dir === 3) {
    if (frame === 0) { armLeftY = 16; armRightY = 14; }
    if (frame === 2) { armLeftY = 14; armRightY = 16; }
  }
  r(9,  armLeftY,  2, 5, PALETTE.skin);
  r(9,  armLeftY,  2, 1, PALETTE.outline);
  r(9,  armLeftY+5,2, 1, PALETTE.outline);
  r(21, armRightY, 2, 5, PALETTE.skin);
  r(21, armRightY, 2, 1, PALETTE.outline);
  r(21, armRightY+5,2,1, PALETTE.outline);

  // ===== Legs (rows 23-28) =====
  r(11, 23 + lyA, 4, 5 - lyA, PALETTE.pants);
  r(17, 23 + lyB, 4, 5 - lyB, PALETTE.pants);
  // Leg outlines
  r(11, 23 + lyA, 1, 5 - lyA, PALETTE.outline);
  r(14, 23 + lyA, 1, 5 - lyA, PALETTE.outline);
  r(17, 23 + lyB, 1, 5 - lyB, PALETTE.outline);
  r(20, 23 + lyB, 1, 5 - lyB, PALETTE.outline);

  // ===== Boots (row 28) =====
  r(11, 28 - lyA, 4, 1, PALETTE.boot);
  r(17, 28 - lyB, 4, 1, PALETTE.boot);
}
