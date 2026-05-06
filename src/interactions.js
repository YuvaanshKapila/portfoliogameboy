import * as THREE from 'three';
import { DragControls } from 'three/addons/controls/DragControls.js';
import { makeBootScreenMaterial } from './utils/materials.js';

/**
 * All input wiring lives here:
 *   - DragControls for the cartridges (snap to table plane, smooth drag)
 *   - Pointer raycaster for the Game Boy buttons (animate press)
 *   - Boot sequence on START click (LCD lights up, LED glows, chime plays)
 *
 * The OrbitControls instance is passed in so we can disable it during
 * a drag or button-press (otherwise the camera would also rotate).
 */
export function setupInteractions({
  scene, camera, renderer, orbit,
  gameBoy, cartridges,
}) {
  const canvas = renderer.domElement;

  // ---------------- DragControls for cartridges ----------------
  const drag = new DragControls(cartridges, camera, canvas);
  drag.transformGroup = true;

  // Cartridge "rest" Y so they slide along the table plane while dragged
  const cartRestY = cartridges[0]?.position.y ?? 0.06;

  drag.addEventListener('dragstart', (e) => {
    orbit.enabled = false;
    e.object.userData.dragging = true;
    // lift slightly while held
    e.object.position.y = cartRestY + 0.06;
    e.object.rotation.x = THREE.MathUtils.degToRad(-6);
  });
  drag.addEventListener('drag', (e) => {
    // pin to a horizontal plane just above the table
    e.object.position.y = cartRestY + 0.06;
  });
  drag.addEventListener('dragend', (e) => {
    orbit.enabled = true;
    e.object.userData.dragging = false;
    e.object.position.y = cartRestY;
    e.object.rotation.x = 0;
  });

  // ---------------- Pointer raycaster for GBC buttons ----------------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  // Collect button meshes from the Game Boy (anything with userData.button)
  const buttons = [];
  gameBoy.traverse(o => {
    if (o.isMesh && o.userData.button) buttons.push(o);
  });

  // Track LED + LCD references for the boot animation
  let led = null;
  let lcd = null;
  gameBoy.traverse(o => {
    if (o.name === 'led') led = o;
    if (o.name === 'lcd') lcd = o;
  });

  let isBooted = false;
  let lcdOffMaterial = lcd ? lcd.material : null;
  let lcdOnMaterial  = null;   // lazy-built on first boot

  // Tiny audio synth — boot chime
  let audioCtx = null;
  function playBootChime() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t0 = audioCtx.currentTime;
    function tone(freq, start, dur, vol = 0.08) {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'square';
      o.frequency.setValueAtTime(freq, t0 + start);
      g.gain.setValueAtTime(0, t0 + start);
      g.gain.linearRampToValueAtTime(vol, t0 + start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
      o.connect(g).connect(audioCtx.destination);
      o.start(t0 + start);
      o.stop(t0 + start + dur + 0.02);
    }
    // Classic GBC-ish ascending chime
    tone(523, 0.00, 0.18);   // C
    tone(659, 0.18, 0.18);   // E
    tone(784, 0.36, 0.18);   // G
    tone(1046, 0.54, 0.40);  // C (octave up)
  }

  function powerOn() {
    if (isBooted) return;
    isBooted = true;

    // Light up the LED
    if (led) {
      led.material.color.setHex(0xff3636);
      led.material.emissive.setHex(0xff2424);
      led.material.emissiveIntensity = 2.4;
      led.material.needsUpdate = true;
    }

    // Build & swap to the boot-screen material (cached after first build)
    if (lcd) {
      if (!lcdOnMaterial) lcdOnMaterial = makeBootScreenMaterial();
      lcd.material = lcdOnMaterial;
    }

    playBootChime();

    // After 4s the screen "settles" — keep it on but dim emissive a touch
    setTimeout(() => {
      if (lcdOnMaterial) lcdOnMaterial.emissiveIntensity = 0.42;
    }, 4000);
  }

  function powerOff() {
    if (!isBooted) return;
    isBooted = false;
    if (led) {
      led.material.color.setHex(0x551515);
      led.material.emissive.setHex(0x220505);
      led.material.emissiveIntensity = 0.4;
    }
    if (lcd && lcdOffMaterial) lcd.material = lcdOffMaterial;
  }

  // Button-press animation: dip the button down, then back up
  const animating = new Set();
  function pressButton(mesh) {
    if (animating.has(mesh)) return;
    animating.add(mesh);
    const startY = mesh.position.y;
    const downY  = startY - 0.008;
    const t0 = performance.now();
    function step() {
      const t = (performance.now() - t0) / 220;  // 220ms total
      if (t >= 1) {
        mesh.position.y = startY;
        animating.delete(mesh);
        return;
      }
      // ease: down on first half, back up on second half
      const phase = t < 0.5 ? t / 0.5 : 1 - (t - 0.5) / 0.5;
      mesh.position.y = startY + (downY - startY) * phase;
      requestAnimationFrame(step);
    }
    step();
  }

  // Pointer move tracking — used to distinguish a click from an orbit drag
  let downPos = null;
  canvas.addEventListener('pointerdown', (e) => {
    downPos = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!downPos) return;
    const dx = e.clientX - downPos.x;
    const dy = e.clientY - downPos.y;
    downPos = null;
    if (dx * dx + dy * dy > 25) return;  // moved too far → was a drag, ignore

    // Compute normalized pointer
    const rect = canvas.getBoundingClientRect();
    pointer.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    pointer.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const hits = raycaster.intersectObjects(buttons, true);
    if (hits.length === 0) return;

    // walk up to find the labeled button
    let target = hits[0].object;
    while (target && !target.userData.button) target = target.parent;
    if (!target) return;

    const kind = target.userData.button;
    pressButton(target);

    if (kind === 'start') {
      if (!isBooted) powerOn(); else powerOff();
    }
  });

  return { powerOn, powerOff };
}
