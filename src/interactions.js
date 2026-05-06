import * as THREE from 'three';
import { DragControls } from 'three/addons/controls/DragControls.js';

/**
 * Wires up all input:
 *   - DragControls for the cartridges in true 3D (no Y clamping)
 *   - Pointer raycaster on the Game Boy buttons (animate press)
 *   - Boot sequence on START click — piano-key drop animation
 *
 * Returns an `update(now)` function for the main render loop so the
 * boot canvas can be redrawn per-frame while the animation runs.
 */
export function setupInteractions({
  scene, camera, renderer, orbit,
  gameBoy, cartridges,
}) {
  const canvas = renderer.domElement;

  // ---------------- DragControls + snap-to-slot + collision ----------------
  // Snap target — invisible Object3D inside the Game Boy at the cart slot
  const slotAnchor = gameBoy.getObjectByName('cart-slot-anchor');
  const slotWorld = new THREE.Vector3();
  function refreshSlotWorld() {
    if (slotAnchor) slotAnchor.getWorldPosition(slotWorld);
  }

  // Body bounds (axis-aligned, world space) — used to keep cartridges
  // from being dragged THROUGH the console body.
  const gbBox = new THREE.Box3();
  function refreshGbBox() {
    gbBox.setFromObject(gameBoy);
    // exclude the snap anchor (it sits above the body) — shrink the
    // top of the box back down to the body's actual top surface
    // (~D * scale at the gameBoy origin).
  }
  refreshGbBox();
  refreshSlotWorld();

  // Snap is release-based and constrained:
  //   - drop must be within SNAP_RADIUS of the slot
  //   - drop must be at/behind the slot Z plane (not on TOP of console)
  // This way dropping a cart on the front face just lets it rest
  // on top — only drops aimed at the actual slot snap in.
  const SNAP_RADIUS    = 0.20;
  const SNAP_Z_TOL     = 0.18;    // drop z must be <= slotWorld.z + this
  const SNAP_LERP      = 0.28;    // faster slide-in so transit is brief

  const drag = new DragControls(cartridges, camera, canvas);
  drag.transformGroup = true;

  // reusable buffers
  const _cartWorld = new THREE.Vector3();
  const _targetLocal = new THREE.Vector3();

  drag.addEventListener('dragstart', (e) => {
    orbit.enabled = false;
    e.object.userData.dragging = true;
    // Picking up a snapped cart releases it so the user can drag it
    // away. Otherwise the snapped cart would stay locked under the
    // mouse and block other interactions.
    e.object.userData.snapped = false;
    e.object.userData.physicsActive = false;
    e.object.rotation.set(
      THREE.MathUtils.degToRad(-4), 0, THREE.MathUtils.degToRad(2),
    );
    refreshSlotWorld();
    refreshGbBox();
  });

  drag.addEventListener('drag', (e) => {
    // No snap-while-dragging — let the user move the cart freely.
    // Just keep it from passing through the console body.
    if (e.object.userData.velocity) e.object.userData.velocity.set(0, 0, 0);

    e.object.getWorldPosition(_cartWorld);
    if (
      _cartWorld.x >= gbBox.min.x && _cartWorld.x <= gbBox.max.x &&
      _cartWorld.z >= gbBox.min.z && _cartWorld.z <= gbBox.max.z
    ) {
      const minWorldY = gbBox.max.y + 0.04;
      if (_cartWorld.y < minWorldY) {
        e.object.position.y += minWorldY - _cartWorld.y;
      }
    }
  });

  drag.addEventListener('dragend', (e) => {
    orbit.enabled = true;
    e.object.userData.dragging = false;

    // Refresh anchors in case the camera moved during the drag
    refreshSlotWorld();

    e.object.getWorldPosition(_cartWorld);
    const dist = _cartWorld.distanceTo(slotWorld);
    // Drop must be near the back face — not on top of the console
    const inSlotZone = (_cartWorld.z <= slotWorld.z + SNAP_Z_TOL);

    if (dist < SNAP_RADIUS && inSlotZone) {
      e.object.userData.snapped = true;
      e.object.userData.physicsActive = false;
    } else {
      e.object.userData.snapped = false;
      // initialize velocity & enable gravity so the cart falls
      if (!e.object.userData.velocity) {
        e.object.userData.velocity = new THREE.Vector3();
      }
      e.object.userData.velocity.set(0, 0, 0);
      e.object.userData.physicsActive = true;
      // smoothly relax rotation back to flat in update() rather than
      // snapping; just reset to flat here for simplicity
      e.object.rotation.set(0, 0, 0);
    }
  });

  // ---------------- Pointer raycaster for Game Boy buttons ----------------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const buttons = [];
  gameBoy.traverse(o => {
    if (o.isMesh && o.userData.button) buttons.push(o);
  });

  // Refs for boot animation
  let led = null;
  let lcd = null;
  gameBoy.traverse(o => {
    if (o.name === 'led') led = o;
    if (o.name === 'lcd') lcd = o;
  });

  const lcdOffMaterial = lcd ? lcd.material : null;

  // Build the boot-screen canvas + texture once, reuse forever
  const bootCanvas = document.createElement('canvas');
  bootCanvas.width = 1024;
  bootCanvas.height = 1024;
  const bootCtx = bootCanvas.getContext('2d');
  const bootTex = new THREE.CanvasTexture(bootCanvas);
  bootTex.colorSpace = THREE.SRGBColorSpace;
  bootTex.anisotropy = 16;
  const bootMaterial = new THREE.MeshStandardMaterial({
    map: bootTex,
    emissiveMap: bootTex,
    emissive: new THREE.Color(0xfff0d0),
    emissiveIntensity: 0.55,
    roughness: 0.25,
    metalness: 0.0,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  // Letter layout for the piano-key drop
  const LETTERS = ['G', 'A', 'M', 'E', ' ', 'B', 'O', 'Y'];
  const COLORS  = [
    '#e7332e', '#ee7e2e', '#f5d11a', '#2eb748',
    '#ffffff',
    '#2c5fce', '#9d3bd1', '#e7332e',
  ];
  const LETTER_FONT = '400 240px "Lilita One", "Bowlby One", "Arial Black", sans-serif';
  const NIN_FONT    = 'italic 700 100px "Cabin", "Gill Sans MT", sans-serif';

  // Audio chime
  let audioCtx = null;
  function playBootChime() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t0 = audioCtx.currentTime;
    function tone(freq, start, dur, vol = 0.07) {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'square';
      o.frequency.setValueAtTime(freq, t0 + start);
      g.gain.setValueAtTime(0, t0 + start);
      g.gain.linearRampToValueAtTime(vol, t0 + start + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
      o.connect(g).connect(audioCtx.destination);
      o.start(t0 + start);
      o.stop(t0 + start + dur + 0.02);
    }
    // Each note coincides with a letter dropping
    const stagger = 0.13;
    const notes = [523, 587, 659, 698, 0, 784, 880, 1046];
    for (let i = 0; i < notes.length; i++) {
      if (notes[i] === 0) continue;
      tone(notes[i], i * stagger, 0.22);
    }
    // final landing chime
    tone(1046, notes.length * stagger + 0.2, 0.5, 0.09);
  }

  // ---------------- Boot animation ----------------
  // Each letter has an independent timer. They drop from above the
  // screen edge to their target Y, with a slight overshoot bounce.
  let bootStart = null;
  let isBooted = false;
  const LETTER_DELAY = 0.13;   // seconds between letter starts
  const LETTER_DUR   = 0.45;   // seconds per drop
  const NIN_FADE_DUR = 0.6;
  const TOTAL_DUR    = LETTERS.length * LETTER_DELAY + LETTER_DUR + NIN_FADE_DUR + 1.0;

  function drawBootFrame(elapsed) {
    const ctx = bootCtx;
    const W = bootCanvas.width, H = bootCanvas.height;

    // LCD background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#fbfaf3');
    bg.addColorStop(1, '#e8e6da');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // letter layout — measure once with the chosen font
    ctx.font = LETTER_FONT;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';

    const widths = LETTERS.map(ch => ctx.measureText(ch).width);
    const totalLetterW = widths.reduce((s, w) => s + w, 0);
    const targetY = 380;       // baseline Y where letters land
    const startX = (W - totalLetterW) / 2;

    let cursorX = startX;
    for (let i = 0; i < LETTERS.length; i++) {
      const ch = LETTERS[i];
      const w = widths[i];
      const t = (elapsed - i * LETTER_DELAY) / LETTER_DUR;

      let y, alpha;
      if (t <= 0) {
        cursorX += w;
        continue;
      } else if (t >= 1) {
        y = targetY;
        alpha = 1;
      } else {
        // ease-out cubic from above-screen (-200) to targetY,
        // with a small overshoot bounce in the last 30%
        const ease = 1 - Math.pow(1 - t, 3);
        let bounce = 0;
        if (t > 0.7) {
          const bt = (t - 0.7) / 0.3;
          bounce = Math.sin(bt * Math.PI) * 24;
        }
        y = -200 + (targetY - (-200)) * ease - bounce;
        alpha = Math.min(t * 2, 1);
      }

      if (ch !== ' ') {
        // dark drop-shadow under each letter
        ctx.globalAlpha = alpha * 0.5;
        ctx.fillStyle = '#000000';
        ctx.fillText(ch, cursorX + 6, y + 8);
        // colored fill
        ctx.globalAlpha = alpha;
        ctx.fillStyle = COLORS[i];
        ctx.fillText(ch, cursorX, y);
      }
      cursorX += w;
    }
    ctx.globalAlpha = 1;

    // "Nintendo" fade-in once all letters have landed
    const allLandedTime = (LETTERS.length - 1) * LETTER_DELAY + LETTER_DUR;
    if (elapsed > allLandedTime) {
      const ft = Math.min((elapsed - allLandedTime) / NIN_FADE_DUR, 1);
      ctx.globalAlpha = ft;
      ctx.font = NIN_FONT;
      ctx.fillStyle = '#1a1a1a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Nintendo', W / 2, 640);
      ctx.font = '400 32px "Cabin", sans-serif';
      ctx.fillText('®', W / 2 + 120, 600);
      ctx.globalAlpha = 1;
    }

    // faint pixel grid
    ctx.fillStyle = 'rgba(40, 45, 60, 0.10)';
    for (let yy = 0; yy < H; yy += 5) ctx.fillRect(0, yy, W, 1);
    for (let xx = 0; xx < W; xx += 5) ctx.fillRect(xx, 0, 1, H);

    bootTex.needsUpdate = true;
  }

  function powerOn() {
    if (isBooted) return;
    isBooted = true;
    bootStart = performance.now();

    // Light up LED
    if (led) {
      led.material.color.setHex(0xff3636);
      led.material.emissive.setHex(0xff2424);
      led.material.emissiveIntensity = 2.4;
      led.material.needsUpdate = true;
    }

    // Swap LCD material to the live boot canvas texture
    if (lcd) {
      drawBootFrame(0);
      lcd.material = bootMaterial;
    }

    playBootChime();
  }

  function powerOff() {
    if (!isBooted) return;
    isBooted = false;
    bootStart = null;

    if (led) {
      led.material.color.setHex(0x551515);
      led.material.emissive.setHex(0x220505);
      led.material.emissiveIntensity = 0.4;
    }
    if (lcd && lcdOffMaterial) lcd.material = lcdOffMaterial;
  }

  // ---------------- physics for released cartridges ----------------
  // Simple gravity: when a cart is released and not snapped, it falls
  // until it hits the desk surface (world y = cartH/2 ≈ 0.0425) and
  // settles there.
  const GRAVITY  = -3.5;     // scene-units / sec² (1u ≈ 10cm)
  const REST_Y   = 0.045;    // world-space resting y for a flat cart
  const _phWorld = new THREE.Vector3();

  function physicsStep(dt) {
    for (const cart of cartridges) {
      if (cart.userData.dragging) continue;
      if (cart.userData.snapped) continue;
      if (!cart.userData.physicsActive) continue;

      if (!cart.userData.velocity) cart.userData.velocity = new THREE.Vector3();
      cart.userData.velocity.y += GRAVITY * dt;

      // Apply velocity to local Y (cartGroup has no scale, so 1:1)
      cart.position.y += cart.userData.velocity.y * dt;

      // Ground collision in world space
      cart.getWorldPosition(_phWorld);
      if (_phWorld.y < REST_Y) {
        cart.position.y += (REST_Y - _phWorld.y);
        cart.userData.velocity.set(0, 0, 0);
        cart.userData.physicsActive = false;
      }
    }
  }

  // ---------------- per-frame snap-in (smooth slide) ----------------
  // For carts marked as snapped, lerp position+rotation toward the
  // slot pose every frame. Looks like the cart slides smoothly in
  // rather than jumping.
  function snapStep() {
    for (const cart of cartridges) {
      if (cart.userData.dragging) continue;
      if (!cart.userData.snapped) continue;

      // position lerp in world space
      cart.getWorldPosition(_phWorld);
      _phWorld.lerp(slotWorld, SNAP_LERP);
      _targetLocal.copy(_phWorld);
      if (cart.parent) cart.parent.worldToLocal(_targetLocal);
      cart.position.copy(_targetLocal);

      // rotation lerp toward upright
      cart.rotation.x = THREE.MathUtils.lerp(cart.rotation.x, -Math.PI / 2, SNAP_LERP);
      cart.rotation.y = THREE.MathUtils.lerp(cart.rotation.y, 0, SNAP_LERP);
      cart.rotation.z = THREE.MathUtils.lerp(cart.rotation.z, 0, SNAP_LERP);
    }
  }

  // Frame update — main.js calls this every tick with (now, dt)
  function update(now, dt = 0) {
    if (isBooted && bootStart != null) {
      const elapsed = (now - bootStart) / 1000;
      if (elapsed < TOTAL_DUR) {
        drawBootFrame(elapsed);
      }
    }
    snapStep();
    if (dt > 0) physicsStep(dt);
  }

  // ---------------- Button-press dip animation ----------------
  const animating = new Set();
  function pressButton(mesh) {
    if (animating.has(mesh)) return;
    animating.add(mesh);
    const startY = mesh.position.y;
    const downY  = startY - 0.010;
    const t0 = performance.now();
    function step() {
      const t = (performance.now() - t0) / 220;
      if (t >= 1) { mesh.position.y = startY; animating.delete(mesh); return; }
      const phase = t < 0.5 ? t / 0.5 : 1 - (t - 0.5) / 0.5;
      mesh.position.y = startY + (downY - startY) * phase;
      requestAnimationFrame(step);
    }
    step();
  }

  // ---------------- Pointer click vs drag ----------------
  let downPos = null;
  canvas.addEventListener('pointerdown', (e) => {
    downPos = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!downPos) return;
    const dx = e.clientX - downPos.x;
    const dy = e.clientY - downPos.y;
    downPos = null;
    // forgiving click threshold (~12px) so tiny twitches still register
    if (dx * dx + dy * dy > 144) return;

    const rect = canvas.getBoundingClientRect();
    pointer.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    pointer.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    // Raycast against the entire Game Boy and walk the hit list to
    // find the first one with a userData.button tag.
    const hits = raycaster.intersectObject(gameBoy, true);
    for (const hit of hits) {
      let node = hit.object;
      while (node && !node.userData.button) node = node.parent;
      if (node && node.userData.button) {
        const kind = node.userData.button;
        pressButton(node);
        if (kind === 'start') {
          if (!isBooted) powerOn(); else powerOff();
        }
        return;
      }
    }
  });

  return { powerOn, powerOff, update };
}
