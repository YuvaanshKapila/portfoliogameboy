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
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
const camDist = 3.4;
const camPolar = THREE.MathUtils.degToRad(18);
const camAzim  = THREE.MathUtils.degToRad(0);
camera.position.set(
  camDist * Math.sin(camPolar) * Math.sin(camAzim),
  camDist * Math.cos(camPolar),
  camDist * Math.sin(camPolar) * Math.cos(camAzim),
);
// camera target shifted slightly LEFT so both the Game Boy AND the
// cartridge basket fit comfortably in the framing.
const camTarget = new THREE.Vector3(-0.30, 0.10, 0);
camera.lookAt(camTarget);

const orbit = new OrbitControls(camera, canvas);
orbit.enableDamping = true;
orbit.dampingFactor = 0.06;
orbit.minDistance = 1.8;
orbit.maxDistance = 6.5;
orbit.minPolarAngle = THREE.MathUtils.degToRad(0);
orbit.maxPolarAngle = THREE.MathUtils.degToRad(75);
orbit.target.copy(camTarget);
orbit.enablePan = false;

/* ------------------------------------------------------------------
   Build everything
   ------------------------------------------------------------------ */
buildLighting(scene);
buildTable(scene);

let interactions = null;

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
  // Scale everything up for a more present hero object
  gameBoy.scale.setScalar(1.25);
  gameBoy.position.set(0.30, 0, 0);   // shifted right of center
  scene.add(gameBoy);

  // Cartridge basket — positioned to the LEFT of the Game Boy so they
  // share the desk together as a paired composition.
  const { group: cartGroup, cartridges } = buildCartridgeBasket();
  cartGroup.position.set(-0.95, 0, 0);
  scene.add(cartGroup);

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

let _lastFrame = performance.now();
function tick(now) {
  const dt = Math.min((now - _lastFrame) / 1000, 0.05);  // cap at 50ms
  _lastFrame = now;
  if (interactions) interactions.update(now, dt);
  orbit.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
