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
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

/* ------------------------------------------------------------------
   Scene  (lighter, warmer background instead of near-black)
   ------------------------------------------------------------------ */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x3c3744);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

/* ------------------------------------------------------------------
   Camera + OrbitControls
   ------------------------------------------------------------------ */
const camera = new THREE.PerspectiveCamera(
  32,
  window.innerWidth / window.innerHeight,
  0.20,
  50,
);
const camDist = 2.6;
const camPolar = THREE.MathUtils.degToRad(15);
const camAzim  = THREE.MathUtils.degToRad(0);
camera.position.set(
  camDist * Math.sin(camPolar) * Math.sin(camAzim),
  camDist * Math.cos(camPolar),
  camDist * Math.sin(camPolar) * Math.cos(camAzim),
);
camera.lookAt(0, 0.10, 0);

const orbit = new OrbitControls(camera, canvas);
orbit.enableDamping = true;
orbit.dampingFactor = 0.06;
orbit.minDistance = 1.6;
orbit.maxDistance = 5.5;
orbit.minPolarAngle = THREE.MathUtils.degToRad(0);
orbit.maxPolarAngle = THREE.MathUtils.degToRad(72);
orbit.target.set(0, 0.10, 0);
orbit.enablePan = false;

/* ------------------------------------------------------------------
   Build the scene
   ------------------------------------------------------------------ */
buildLighting(scene);
buildTable(scene);

(async () => {
  // Force-load the exact font sizes the canvas textures use, so the
  // GBC logo / boot screen render correctly on first paint.
  if (document.fonts && document.fonts.load) {
    try {
      await Promise.all([
        document.fonts.load('400 280px "Lilita One"'),
        document.fonts.load('400 200px "Lilita One"'),
        document.fonts.load('italic 700 160px "Cabin"'),
        document.fonts.load('italic 700 130px "Cabin"'),
        document.fonts.load('italic 700 320px "Cabin"'),
        document.fonts.load('700 76px "Jost"'),
        document.fonts.load('700 60px "Jost"'),
        document.fonts.load('600 48px "Jost"'),
      ]);
      await document.fonts.ready;
    } catch (_) { /* ignore */ }
  }

  const gameBoy = buildGameBoy();
  gameBoy.position.set(0, 0, 0);
  scene.add(gameBoy);

  // Cartridge basket on the LEFT side of the desk
  const { group: cartGroup, cartridges } = buildCartridgeBasket();
  cartGroup.position.set(-1.20, 0, 0.10);
  scene.add(cartGroup);

  // Wire up clicks, drags, and the boot animation
  setupInteractions({
    scene, camera, renderer, orbit,
    gameBoy, cartridges,
  });
})();

/* ------------------------------------------------------------------
   Resize + render loop
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

function tick() {
  orbit.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
