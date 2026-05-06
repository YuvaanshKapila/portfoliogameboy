import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { buildLighting } from './scene/lighting.js';
import { buildTable } from './scene/table.js';
import { buildGameBoy } from './scene/gameBoy.js';

/* ------------------------------------------------------------------
   Entry — wires up renderer, camera, lights, scene, and animation.
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

const camera = new THREE.PerspectiveCamera(
  35,
  window.innerWidth / window.innerHeight,
  0.05,
  100,
);
camera.position.set(1.7, 2.2, 2.4);
camera.lookAt(0, 0.15, 0);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 1.5;
controls.maxDistance = 5.5;
controls.maxPolarAngle = THREE.MathUtils.degToRad(78);
controls.minPolarAngle = THREE.MathUtils.degToRad(15);
controls.target.set(0, 0.15, 0);
controls.enablePan = false;

/* -------------------- build the scene -------------------- */
buildLighting(scene);
buildTable(scene);

const gameBoy = buildGameBoy();
// Tip the device backward a touch so the screen catches the key light
gameBoy.rotation.y = THREE.MathUtils.degToRad(-12);
gameBoy.rotation.x = THREE.MathUtils.degToRad(-1.5);
gameBoy.position.set(-0.05, 0, 0.1);
scene.add(gameBoy);

/* -------------------- resize -------------------- */
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);
onResize();

/* -------------------- loop -------------------- */
function tick() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
