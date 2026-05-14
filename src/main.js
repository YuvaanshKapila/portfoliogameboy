import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { buildLighting } from './scene/lighting.js';
import { buildTable } from './scene/table.js';
import { buildGameBoy } from './scene/gameBoy.js';
import { buildCartridgeBasket } from './scene/cartridges.js';
import { buildTradingCards } from './scene/tradingCards.js';
import { buildTableSketches } from './scene/sketches.js';
import { buildPokedex } from './scene/pokedex.js';
import { setupInteractions } from './interactions.js';
import { CARDS, getCardById } from './cardData.js';
import { getMaster, setMaster } from './volume.js';

/* ------------------------------------------------------------------
   Renderer
   ------------------------------------------------------------------ */
const canvas = document.getElementById('stage');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
});
// Cap pixel ratio at 1.5 — keeps the scene crisp on high-DPI screens
// without paying the 4x render cost of true 2x. Significant FPS win.
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

/* ------------------------------------------------------------------
   Scene  —  black-space radial gradient background
   ------------------------------------------------------------------ */
const scene = new THREE.Scene();
scene.background = makeSpaceBackground();

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

function makeSpaceBackground() {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(512, 512, 0, 512, 512, 720);
  g.addColorStop(0.0, '#1d1822');
  g.addColorStop(0.6, '#0a080d');
  g.addColorStop(1.0, '#000000');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 1024);
  // (no stars — clean dark gradient only)
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ------------------------------------------------------------------
   Camera  +  OrbitControls
   ------------------------------------------------------------------ */
const camera = new THREE.PerspectiveCamera(
  32,
  window.innerWidth / window.innerHeight,
  0.20,
  60,
);
// Mobile detection — viewport-based + UA fallback. Used to pull the
// camera further back so the whole scene fits on a phone screen
// where the FOV cone covers far less actual world-space.
const IS_MOBILE =
  (typeof window !== 'undefined') && (
    window.matchMedia?.('(max-width: 820px)').matches ||
    /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  );

// Volume widget — click the speaker icon to toggle the slider panel.
// Slider value drives setMaster() which fans out to every audio
// source via the master multiplier in volume.js.
(function wireVolumeWidget() {
  const toggle = document.getElementById('volume-toggle');
  const panel  = document.getElementById('volume-panel');
  const slider = document.getElementById('volume-slider');
  if (!toggle || !panel || !slider) return;

  slider.value = String(getMaster());
  slider.addEventListener('input', () => {
    setMaster(parseFloat(slider.value));
  });

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.toggle('is-open');
  });
  // Click outside the widget closes the slider
  document.addEventListener('pointerdown', (e) => {
    if (!panel.classList.contains('is-open')) return;
    if (e.target.closest('.volume-widget')) return;
    panel.classList.remove('is-open');
  });
})();

// Mobile-only "best on PC" landing modal. Shown once at boot; dismiss
// with the continue button.
if (IS_MOBILE) {
  const modal = document.getElementById('mobile-warning');
  const btn   = document.getElementById('mobile-warning-continue');
  if (modal && btn) {
    modal.classList.add('is-open');
    btn.addEventListener('click', () => modal.classList.remove('is-open'));
  }
}

// Initial camera: straight on, centered on the scene midpoint.
// Mobile: only slightly further than desktop so the LCD reads.
const camDist  = IS_MOBILE ? 8.0 : 4.6;
const camPolar = THREE.MathUtils.degToRad(13);
const camAzim  = THREE.MathUtils.degToRad(0);
// On mobile, shift the focal point to the right so the Game Boy
// (which sits at +X) takes more of the frame and the basket fades
// into the left edge.
// Centered between basket (X=-0.85) and Game Boy right edge (X≈+0.95)
// so the whole composition sits dead-center at any aspect ratio.
const camTarget = new THREE.Vector3(0.05, 0.15, 0);

// Position is camTarget + spherical offset so the camera looks AT
// camTarget instead of the world origin.
camera.position.set(
  camTarget.x + camDist * Math.sin(camPolar) * Math.sin(camAzim),
  camTarget.y + camDist * Math.cos(camPolar),
  camTarget.z + camDist * Math.sin(camPolar) * Math.cos(camAzim),
);
camera.lookAt(camTarget);

const orbit = new OrbitControls(camera, canvas);
orbit.enableDamping = true;
orbit.dampingFactor = 0.06;
// Tight camera locks — a recruiter can't lose their bearings or
// rotate the scene off-screen. Only small, presentation-friendly
// adjustments are allowed.
// Wider zoom range on mobile so pinch-to-zoom is usable.
orbit.minDistance = IS_MOBILE ? 2.5 : 3.4;
// maxDistance must be generous so applyCamFraming() can dolly back
// far enough to fit the whole scene on narrow / portrait viewports
// without being clamped.
orbit.maxDistance = IS_MOBILE ? 22   : 18;
// Zoom is enabled on both mobile and desktop. On desktop, zoom-IN
// is allowed (mouse wheel toward the scene) but zoom-OUT is
// clamped to the curated default framing — applyCamFraming() sets
// orbit.maxDistance to the framing distance on each resize so the
// user can never dolly past the original composition.
orbit.enableZoom  = true;
orbit.zoomSpeed   = IS_MOBILE ? 1.6 : 0.8;
// Two-finger touch on mobile = dolly (pinch zoom).
// Single-finger = rotate (orbit).
orbit.touches = {
  ONE: THREE.TOUCH.ROTATE,
  TWO: THREE.TOUCH.DOLLY_PAN,
};
orbit.minPolarAngle = THREE.MathUtils.degToRad(8);
orbit.maxPolarAngle = THREE.MathUtils.degToRad(28);
orbit.minAzimuthAngle = THREE.MathUtils.degToRad(-22);
orbit.maxAzimuthAngle = THREE.MathUtils.degToRad(22);
orbit.target.copy(camTarget);
orbit.enablePan = false;

/* ------------------------------------------------------------------
   Build everything
   ------------------------------------------------------------------ */
buildLighting(scene);
buildTable(scene);

let interactions = null;
let gameBoyRef  = null;
let cartridgesRef = null;
let slotAnchorRef = null;
let sketchesRef = null;
let pokedexRef = null;   // desktop only — buildPokedex() returns { group, hitTargets, update, setOpen }

(async () => {
  if (document.fonts && document.fonts.load) {
    try {
      await Promise.all([
        document.fonts.load('400 280px "Lilita One"'),
        document.fonts.load('400 240px "Lilita One"'),
        document.fonts.load('400 200px "Lilita One"'),
        document.fonts.load('800 140px "Bowlby One"'),
        document.fonts.load('italic 700 160px "Cabin"'),
        document.fonts.load('italic 700 130px "Cabin"'),
        document.fonts.load('italic 700 100px "Cabin"'),
        document.fonts.load('italic 700 320px "Cabin"'),
        document.fonts.load('700 76px "Jost"'),
        document.fonts.load('700 60px "Jost"'),
        document.fonts.load('600 48px "Jost"'),
        document.fonts.load('700 120px "Kalam"'),
        document.fonts.load('700 100px "Caveat"'),
        document.fonts.load('400 32px "Press Start 2P"'),
        document.fonts.load('400 48px "Press Start 2P"'),
        document.fonts.load('400 28px "VT323"'),
      ]);
      await document.fonts.ready;
    } catch (_) {}
  }

  const gameBoy = buildGameBoy();
  gameBoy.scale.setScalar(1.65);     // bigger so text reads easily
  gameBoy.position.set(0.30, 0, 0);
  scene.add(gameBoy);
  gameBoyRef = gameBoy;
  slotAnchorRef = gameBoy.getObjectByName('cart-slot-anchor');

  const { group: cartGroup, cartridges } = buildCartridgeBasket();
  cartGroup.scale.setScalar(1.30);
  cartGroup.position.set(-0.85, 0, 0);  // closer to the Game Boy
  scene.add(cartGroup);
  cartridgesRef = cartridges;

  // Trading cards scattered around the desk for set-dressing
  const tradingCardsGroup = buildTradingCards();
  scene.add(tradingCardsGroup);

  // Pencil-sketch arrows etched onto the desk pointing at the cart
  // basket, the slot, and the buttons. Fades out once a cart is in.
  sketchesRef = buildTableSketches({ isMobile: IS_MOBILE });
  scene.add(sketchesRef);

  // Decorative Nintendo e-Reader sitting flat on the top-right of
  // the desk. Desktop only — hidden on mobile to keep the small
  // viewport focused on the Game Boy.

  // Iconic Gen 1 anime Pokédex — DESKTOP ONLY. Book-style clamshell
  // that opens left-to-right. Scaled down so its OPEN footprint
  // (~0.55 × 0.43 world units) fits the tight gap between the
  // "use buttons" sketch (back) and the trading cards (front),
  // clear of the basket (left) and front-center card (right edge).
  if (!IS_MOBILE) {
    pokedexRef = buildPokedex();
    pokedexRef.group.scale.setScalar(2.15);
    pokedexRef.group.position.set(2.75, 0, 0.40);
    pokedexRef.group.rotation.y = THREE.MathUtils.degToRad(-28);
    scene.add(pokedexRef.group);

    pokedexRef.setCards(CARDS);
  }

  interactions = setupInteractions({
    scene, camera, renderer, orbit,
    gameBoy, cartridges,
  });

  // Pokédex click-to-open — desktop only. Raycast on pointerup so
  // it doesn't fight DragControls / OrbitControls drags.
  if (pokedexRef) {
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let downX = 0, downY = 0, downT = 0;
    canvas.addEventListener('pointerdown', (e) => {
      downX = e.clientX; downY = e.clientY; downT = performance.now();
    });
    canvas.addEventListener('pointerup', (e) => {
      // ignore drags — only treat as click if the pointer barely
      // moved and the press was short
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (moved > 6 || performance.now() - downT > 400) return;
      const rect = canvas.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(ndc, camera);

      // Clicking ANY card or the Pokédex toggles the Pokédex.
      // When the Pokédex opens it picks a random card to scan,
      // so the user doesn't pick a specific entry by clicking
      // a card — every click just summons a new random one.
      const targets = [];
      if (tradingCardsGroup) targets.push(...tradingCardsGroup.children);
      targets.push(...pokedexRef.hitTargets);
      const hits = ray.intersectObjects(targets, false);
      if (hits.length === 0) return;

      const hit = hits[0].object;
      const isCard = !!hit.userData.cardId;
      const open = pokedexRef.group.userData.isOpen;

      if (isCard) {
        // Card click: scan THIS specific card. Open the Pokédex
        // first if closed so the screen is visible.
        const data = getCardById(hit.userData.cardId);
        if (!data) return;
        if (!open) pokedexRef.setOpen(true);
        pokedexRef.scan(data);
      } else {
        // Pokédex body click: toggle open/closed.
        pokedexRef.setOpen(!open);
      }
    });
  }
})();

/* ------------------------------------------------------------------
   Resize + tick
   ------------------------------------------------------------------ */
// Frame the scene to fit any viewport size. We have a known bounding
// box of all the interesting stuff (basket on the left, cards on the
// right, Game Boy in the middle). Compute the camera distance that
// makes that box exactly fit the current viewport — both horizontal
// AND vertical — and pick the larger so nothing clips.
//
// SCENE_HALF_W: half-width  of the content along world X
// SCENE_HALF_H: half-height of the content along world Z
//
// We INTENTIONALLY undersize this so the camera frames the Game Boy
// + basket nicely. Side trading cards and far sketches can clip a
// tiny bit on extreme aspect ratios — that's better than a tiny
// zoomed-out scene where the Game Boy is unreadable.
// Tighter bounds on mobile so portrait viewports don't dolly the
// camera way back. Desktop keeps the comfortable framing.
const SCENE_HALF_W = IS_MOBILE ? 1.25 : 2.1;
const SCENE_HALF_H = IS_MOBILE ? 1.10 : 1.65;
const FIT_PADDING  = IS_MOBILE ? 1.00 : 1.18;
const _camOffset   = new THREE.Vector3();

function applyCamFraming() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const aspect = w / h;
  const vFovRad = THREE.MathUtils.degToRad(camera.fov);

  // Distance needed to fit the half-height vertically.
  const distForH = SCENE_HALF_H / Math.tan(vFovRad / 2);
  // Distance needed to fit the half-width horizontally — horizontal
  // FOV depends on aspect.
  const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * aspect);
  const distForW = SCENE_HALF_W / Math.tan(hFovRad / 2);

  // Take whichever is more demanding so nothing gets cropped.
  let newDist = Math.max(distForH, distForW) * FIT_PADDING;
  newDist = THREE.MathUtils.clamp(newDist, orbit.minDistance, orbit.maxDistance);

  // Desktop: clamp maxDistance to the current framing distance so
  // the user can zoom IN closer but never dolly OUT past the
  // curated framing. Mobile keeps its wider maxDistance so pinch
  // zoom remains usable in either direction.
  if (!IS_MOBILE) {
    orbit.maxDistance = newDist;
  }

  _camOffset.copy(camera.position).sub(orbit.target);
  _camOffset.setLength(newDist);
  camera.position.copy(orbit.target).add(_camOffset);
  camera.updateProjectionMatrix();
}

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  applyCamFraming();
}
window.addEventListener('resize', onResize);
onResize();

/* ---------------- Sketch fade-out ----------------
   The pencil sketches sit on the desk. Once the user has snapped a
   cart into the slot they've clearly figured the controls out, so
   fade the sketches away over ~1s.
*/
let sketchFade = 1;
function updateSketches(dt) {
  if (!sketchesRef) return;
  const anySnapped = cartridgesRef && cartridgesRef.some(c => c.userData.snapped);
  const target = anySnapped ? 0 : 1;
  if (sketchFade !== target) {
    const speed = 1.0;   // 1.0 → ~1s fade
    sketchFade += Math.sign(target - sketchFade) * Math.min(speed * dt, Math.abs(target - sketchFade));
    for (const m of sketchesRef.children) {
      if (m.material) {
        m.material.opacity = sketchFade;
        m.material.transparent = true;
      }
      m.visible = sketchFade > 0.01;
    }
  }
}

/* ---------------- render loop ---------------- */
let _lastFrame = performance.now();
function tick(now) {
  const dt = Math.min((now - _lastFrame) / 1000, 0.05);
  _lastFrame = now;
  if (interactions) interactions.update(now, dt);
  if (pokedexRef) pokedexRef.update(dt);
  orbit.update();
  updateSketches(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
