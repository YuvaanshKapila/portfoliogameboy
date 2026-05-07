import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { buildLighting } from './scene/lighting.js';
import { buildTable } from './scene/table.js';
import { buildGameBoy } from './scene/gameBoy.js';
import { buildCartridgeBasket } from './scene/cartridges.js';
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
// Pulled back further on mobile so phone users see the whole scene
// without needing to pinch-zoom on first load.
const camDist  = IS_MOBILE ? 10.0 : 5.8;
const camPolar = THREE.MathUtils.degToRad(13);
const camAzim  = THREE.MathUtils.degToRad(0);
const camTarget = new THREE.Vector3(-0.30, 0.15, 0);

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
orbit.maxDistance = IS_MOBILE ? 14   : 6.5;
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

  interactions = setupInteractions({
    scene, camera, renderer, orbit,
    gameBoy, cartridges,
  });
})();

/* ------------------------------------------------------------------
   Resize + tick
   ------------------------------------------------------------------ */
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);
onResize();

/* ---------------- "INSERT HERE" sign tracking ---------------- */
const signEl = document.getElementById('insert-sign');
const _signWorld = new THREE.Vector3();
const _signProj  = new THREE.Vector3();

function updateInsertSign() {
  if (!signEl || !slotAnchorRef) return;

  // Hide once any cart is inserted
  if (cartridgesRef && cartridgesRef.some(c => c.userData.snapped)) {
    signEl.style.display = 'none';
    return;
  }

  slotAnchorRef.getWorldPosition(_signWorld);
  // bump the sign up a bit so it floats ABOVE the slot
  _signWorld.y += 0.45;

  _signProj.copy(_signWorld).project(camera);

  // Behind the camera? hide
  if (_signProj.z > 1) { signEl.style.display = 'none'; return; }

  signEl.style.display = '';
  signEl.style.left = ((_signProj.x * 0.5 + 0.5) * window.innerWidth)  + 'px';
  signEl.style.top  = ((-_signProj.y * 0.5 + 0.5) * window.innerHeight) + 'px';
}

/* ---------------- render loop ---------------- */
let _lastFrame = performance.now();
function tick(now) {
  const dt = Math.min((now - _lastFrame) / 1000, 0.05);
  _lastFrame = now;
  if (interactions) interactions.update(now, dt);
  orbit.update();
  updateInsertSign();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
