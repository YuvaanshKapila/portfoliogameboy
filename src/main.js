import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { buildLighting } from './scene/lighting.js';
import { buildTable } from './scene/table.js';
import { buildGameBoy } from './scene/gameBoy.js';
import { buildCartridgeBasket } from './scene/cartridges.js';
import { buildTradingCards } from './scene/tradingCards.js';
import { buildTableSketches } from './scene/sketches.js';
import { setupInteractions } from './interactions.js';

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
orbit.enableZoom  = true;        // mouse wheel + pinch-to-zoom
orbit.zoomSpeed   = IS_MOBILE ? 1.6 : 1.0;
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
  scene.add(buildTradingCards());

  // Pencil-sketch arrows etched onto the desk pointing at the cart
  // basket, the slot, and the buttons. Fades out once a cart is in.
  sketchesRef = buildTableSketches();
  scene.add(sketchesRef);

  interactions = setupInteractions({
    scene, camera, renderer, orbit,
    gameBoy, cartridges,
  });
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
const SCENE_HALF_W = 2.1;   // includes inner cards on each side
const SCENE_HALF_H = 1.65;  // back sketches + front buttons hint
const FIT_PADDING  = 1.18;  // slightly more breathing room on full screen
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
  orbit.update();
  updateSketches(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
