import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { buildLighting } from './scene/lighting.js';
import { buildTable } from './scene/table.js';
import { buildGameBoy } from './scene/gameBoy.js';

/* ------------------------------------------------------------------
   Entry — wires up renderer, camera, lights, scene, and animation.

   We wait for web fonts to load before constructing the Game Boy so
   its canvas-texture decals (Cabin Bold Italic, Jost) render correctly
   instead of falling back to a default sans-serif.
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

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0a06);

// Subtle environment for natural reflections (PMREM from a procedural room).
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

// ---------------- camera (top-down with a slight forward tilt) ----------------
// Polar = ~18° off straight-down so we still see the top edge with the
// power switch protruding. Distance is tight so the device fills the frame.
const camera = new THREE.PerspectiveCamera(
  32,
  window.innerWidth / window.innerHeight,
  0.05,
  100,
);
const camDist = 2.6;
const camPolar = THREE.MathUtils.degToRad(15);  // 0 = straight down, 90 = horizon
const camAzim  = THREE.MathUtils.degToRad(0);
camera.position.set(
  camDist * Math.sin(camPolar) * Math.sin(camAzim),
  camDist * Math.cos(camPolar),
  camDist * Math.sin(camPolar) * Math.cos(camAzim),
);
camera.lookAt(0, 0.10, 0);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 1.6;
controls.maxDistance = 5.5;
controls.minPolarAngle = THREE.MathUtils.degToRad(0);    // straight down allowed
controls.maxPolarAngle = THREE.MathUtils.degToRad(72);
controls.target.set(0, 0.10, 0);
controls.enablePan = false;

/* ---------------- build the scene ---------------- */
buildLighting(scene);
buildTable(scene);

(async () => {
  // Wait for the Cabin / Jost web fonts before drawing canvas textures —
  // otherwise the silkscreen wordmark falls back to a plain sans-serif.
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch (_) {}
  }

  const gameBoy = buildGameBoy();
  // Lying completely flat on the desk. No tilt — the camera does the work.
  gameBoy.rotation.set(0, 0, 0);
  gameBoy.position.set(0, 0, 0);
  scene.add(gameBoy);
})();

/* ---------------- resize ---------------- */
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);
onResize();

/* ---------------- loop ---------------- */
function tick() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
