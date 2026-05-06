import * as THREE from 'three';

/**
 * Three-point-ish lighting for a still-life feel:
 *   - warm key light from upper-left (casts shadows)
 *   - cool fill from the right
 *   - low rim light from behind to separate the device from background
 *   - soft hemisphere ambient
 */
export function buildLighting(scene) {
  const hemi = new THREE.HemisphereLight(0xfff1d6, 0x18120a, 0.42);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xfff0d2, 2.2);
  key.position.set(-3.2, 5.4, 3.0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 18;
  key.shadow.camera.left = -4;
  key.shadow.camera.right = 4;
  key.shadow.camera.top = 4;
  key.shadow.camera.bottom = -4;
  key.shadow.bias = -0.0004;
  key.shadow.radius = 4;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xb6c8e8, 0.55);
  fill.position.set(4.5, 2.2, 1.4);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffd49a, 0.35);
  rim.position.set(0.4, 1.6, -3.5);
  scene.add(rim);

  // Tiny accent: a warm point light "lamp" above the desk for highlights
  const lamp = new THREE.PointLight(0xffc070, 8, 7, 2);
  lamp.position.set(-1.6, 3.2, 1.4);
  scene.add(lamp);

  return { hemi, key, fill, rim, lamp };
}
